/**
 * OceanStride resource routes: users, crew (seafarers), vessels, documents,
 * reports, and file uploads backed by KV blobs (no R2 on the host account).
 */
import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Env } from './env';
import { likeAll, nowIso, oid, parseIntParam, randomHex, readJson, toApi, hashPassword } from './lib';
import { requireAuth, requireRole, publicUser } from './auth';
import type { AuthUser } from './auth';

type Vars = { user?: AuthUser };
type App = Hono<{ Bindings: Env; Variables: Vars }>;
type C = Context<{ Bindings: Env; Variables: Vars }>;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const pageInfo = (c: C) => {
  const q = new URL(c.req.url).searchParams;
  const page = parseIntParam(q.get('page') || '', 1);
  const limit = Math.min(parseIntParam(q.get('limit') || '', 20), 100);
  return { q, page, limit, offset: (page - 1) * limit };
};

const paginated = (
  c: C,
  table: string,
  filters: { sql: string; params: unknown[] },
  orderBy = 'created_at DESC'
): Promise<{ data: Record<string, unknown>[]; total: number; page: number; limit: number; totalPages: number }> => {
  const { q, page, limit, offset } = pageInfo(c);
  const where = filters.sql ? `WHERE ${filters.sql}` : '';
  return (async () => {
    const totalRow = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} ${where}`)
      .bind(...filters.params)
      .first();
    const rows = await c.env.DB.prepare(
      `SELECT * FROM ${table} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
    )
      .bind(...filters.params, limit, offset)
      .all();
    const total = Number(totalRow?.n || 0);
    return { data: rows.results, total, page, limit, totalPages: total === 0 ? 0 : Math.ceil(total / limit) };
  })();
};

const searchFilter = (c: C, table: string, cols: string[], extra: { sql: string; params: unknown[] }) => {
  const { q } = pageInfo(c);
  const clauses: string[] = [];
  const params: unknown[] = [];
  const search = q.get('search');
  if (search && search.trim()) {
    const like = likeAll(cols, search.trim());
    clauses.push(like.sql);
    params.push(...like.params);
  }
  if (extra.sql) {
    clauses.push(extra.sql);
    params.push(...extra.params);
  }
  if (table === 'users' && false) void 0;
  return { sql: clauses.join(' AND '), params };
};

const updateColumns = (body: Record<string, unknown>, map: Record<string, string>): { cols: string[]; params: unknown[] } => {
  const cols: string[] = [];
  const params: unknown[] = [];
  for (const [k, col] of Object.entries(map)) {
    const v = body[k];
    if (v !== undefined && v !== null) {
      cols.push(`${col} = ?`);
      params.push(v);
    }
  }
  if (cols.length === 0) return { cols: [], params: [] };
  return {
    cols: [...cols, `updated_at = ?`],
    params: [...params, nowIso()],
  };
};

const notFound = (c: C, what = 'Resource') => c.json({ message: `${what} not found` }, 404);

/* ------------------------------------------------------------------ */
/* Uploads (KV-backed file blobs)                                      */
/* ------------------------------------------------------------------ */

const publicOrigin = (c: C): string => new URL(c.req.url).origin;

const saveFile = async (c: C, file: File): Promise<{ id: string; url: string }> => {
  const kv = c.env.OCEAN_FILES;
  if (!kv) throw new Error('File storage not configured');
  const id = oid();
  const buf = await file.arrayBuffer();
  await kv.put(`fm:${id}`, JSON.stringify({ name: file.name.slice(0, 200), type: file.type || 'application/octet-stream', size: buf.byteLength }));
  await kv.put(`fb:${id}`, buf);
  return { id, url: `${publicOrigin(c)}/api/uploads/${id}` };
};

export const uploadRoutes = () => {
  const router = new Hono<{ Bindings: Env; Variables: Vars }>();

  router.get('/:id', async (c) => {
    const kv = c.env.OCEAN_FILES;
    const id = c.req.param('id') as string;
    if (!id || !kv) return notFound(c, 'File');
    const buf = (await kv.get(`fb:${id}`, { type: 'arrayBuffer' })) as ArrayBuffer | null;
    if (!buf) return notFound(c, 'File');
    const metaRaw = await kv.get(`fm:${id}`, { type: 'text' });
    let meta: Record<string, string> = {};
    try {
      meta = metaRaw ? (JSON.parse(metaRaw) as Record<string, string>) : {};
    } catch {
      meta = {};
    }
    return new Response(buf, {
      headers: {
        'Content-Type': meta.type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${(meta.name || 'file').replace(/"/g, '')}"`,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  });

  router.delete('/:id', requireAuth, async (c) => {
    const kv = c.env.OCEAN_FILES;
    const id = c.req.param('id') as string;
    if (!kv || !id) return notFound(c, 'File');
    await kv.delete(`fb:${id}`);
    await kv.delete(`fm:${id}`);
    return c.json({ message: 'Deleted' });
  });

  return router;
};

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

export const userRoutes = () => {
  const router = new Hono<{ Bindings: Env; Variables: Vars }>();

  router.get('/', requireAuth, async (c) => {
    const { q } = pageInfo(c);
    const filters = searchFilter(c, 'users', ['email', 'first_name', 'last_name'], {
      sql: q.get('role') ? `role = ?` : '',
      params: q.get('role') ? [q.get('role')] : [],
    });
    const result = await paginated(c, 'users', filters, 'created_at DESC');
    return c.json({ data: result.data.map(publicUser), total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages });
  });

  router.post('/', requireAuth, requireRole('ADMIN', 'MANAGER'), async (c) => {
    const body = await readJson(c);
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) return c.json({ message: 'email is required' }, 400);
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) return c.json({ message: 'An account with that email already exists' }, 409);
    const id = oid();
    const now = nowIso();
    const passwordHash = await hashPassword(String(body.password || randomHex(16)));
    await c.env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, email_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`
    )
      .bind(id, email, passwordHash, String(body.firstName || ''), String(body.lastName || ''), String(body.role || 'GUEST').toUpperCase(), now, now)
      .run();
    const row = (await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first())!;
    return c.json({ user: publicUser(row) }, 201);
  });

  router.get('/:id', requireAuth, async (c) => {
    const row = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(c.req.param('id')).first();
    if (!row) return notFound(c, 'User');
    return c.json({ user: publicUser(row) });
  });

  router.patch('/:id', requireAuth, requireRole('ADMIN', 'MANAGER'), async (c) => {
    const body = await readJson(c);
    const { cols, params } = updateColumns(body, {
      firstName: 'first_name',
      lastName: 'last_name',
      avatar: 'avatar',
      email: 'email',
      role: 'role',
      isActive: 'is_active',
    });
    if (cols.length === 0) return c.json({ message: 'No updates' }, 400);
    await c.env.DB.prepare(`UPDATE users SET ${cols.join(', ')} WHERE id = ?`)
      .bind(...params, c.req.param('id'))
      .run();
    const row = (await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(c.req.param('id')).first())!;
    return c.json({ user: publicUser(row) });
  });

  router.delete('/:id', requireAuth, requireRole('ADMIN'), async (c) => {
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(c.req.param('id')).run();
    return c.json({ message: 'Deleted' });
  });

  router.patch('/:id/roles', requireAuth, requireRole('ADMIN', 'MANAGER'), async (c) => {
    const body = await readJson(c);
    const role = String(body.role || '').toUpperCase();
    if (!['GUEST', 'SEAFARER', 'MANAGER', 'ADMIN'].includes(role)) return c.json({ message: 'Invalid role' }, 400);
    await c.env.DB.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?')
      .bind(role, nowIso(), c.req.param('id'))
      .run();
    const row = (await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(c.req.param('id')).first())!;
    return c.json({ user: publicUser(row) });
  });

  router.get('/:id/profile', requireAuth, async (c) => {
    const row = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(c.req.param('id')).first();
    if (!row) return notFound(c, 'User');
    const company = row.company_id
      ? await c.env.DB.prepare('SELECT * FROM companies WHERE id = ?').bind(row.company_id).first()
      : null;
    return c.json({ user: publicUser(row), company: company ? toApi(company) : null });
  });

  router.post('/:id/upload', requireAuth, async (c) => {
    const form = await c.req.formData().catch(() => null);
    const file = form?.get('file') as File | null;
    if (!file || typeof file === 'string') return c.json({ message: 'No file uploaded' }, 400);
    try {
      const { url } = await saveFile(c, file);
      await c.env.DB.prepare('UPDATE users SET avatar = ?, updated_at = ? WHERE id = ?')
        .bind(url, nowIso(), c.req.param('id'))
        .run();
      return c.json({ url });
    } catch {
      return c.json({ message: 'File storage is not configured' }, 503);
    }
  });

  return router;
};

/* ------------------------------------------------------------------ */
/* Crew / seafarers                                                    */
/* ------------------------------------------------------------------ */

const crewMap = (body: Record<string, unknown>): Record<string, string> => ({
  firstName: 'first_name',
  lastName: 'last_name',
  email: 'email',
  phoneNumber: 'phone',
  dateOfBirth: 'date_of_birth',
  nationality: 'nationality',
  rank: 'rank',
  avatar: 'avatar',
  status: 'status',
  isActive: 'is_active',
});

export const crewRoutes = () => {
  const router = new Hono<{ Bindings: Env; Variables: Vars }>();

  router.get('/', requireAuth, async (c) => {
    const { q } = pageInfo(c);
    const filters = searchFilter(c, 'seafarers', ['first_name', 'last_name', 'email', 'rank', 'nationality'], {
      sql: q.get('status') ? `status = ?` : '',
      params: q.get('status') ? [q.get('status')] : [],
    });
    const result = await paginated(c, 'seafarers', filters, 'created_at DESC');
    return c.json({ data: result.data.map((r) => ({ ...toApi(r), certifications: undefined })), total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages });
  });

  router.get('/:id', requireAuth, async (c) => {
    const row = await c.env.DB.prepare('SELECT * FROM seafarers WHERE id = ?').bind(c.req.param('id')).first();
    if (!row) return notFound(c, 'Crew member');
    const cers = await c.env.DB.prepare('SELECT * FROM certifications WHERE seafarer_id = ? ORDER BY issue_date DESC')
      .bind(c.req.param('id'))
      .all();
    const assignment = await c.env.DB.prepare(
      'SELECT a.*, v.name AS vessel_name FROM assignments a LEFT JOIN vessels v ON v.id = a.vessel_id WHERE a.seafarer_id = ? AND a.is_active = 1 ORDER BY a.created_at DESC LIMIT 1'
    )
      .bind(c.req.param('id'))
      .first();
    return c.json({
      crew: { ...toApi(row), certifications: cers.results.map(toApi), vesselId: assignment?.vessel_id || null },
    });
  });

  router.post('/', requireAuth, requireRole('ADMIN', 'MANAGER'), async (c) => {
    const body = await readJson(c);
    const email = String(body.email || '').trim().toLowerCase();
    if (!body.firstName || !body.lastName || !email) return c.json({ message: 'firstName, lastName and email are required' }, 400);
    const existing = await c.env.DB.prepare('SELECT id FROM seafarers WHERE email = ?').bind(email).first();
    if (existing) return c.json({ message: 'A crew member with that email already exists' }, 409);
    const id = oid();
    const now = nowIso();
    await c.env.DB.prepare(
      `INSERT INTO seafarers (id, first_name, last_name, email, phone, date_of_birth, nationality, rank, status, avatar, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    )
      .bind(
        id,
        String(body.firstName),
        String(body.lastName),
        email,
        String(body.phoneNumber || body.phone || ''),
        String(body.dateOfBirth || ''),
        String(body.nationality || ''),
        String(body.rank || ''),
        String(body.status || 'active'),
        String(body.avatar || ''),
        now,
        now
      )
      .run();
    const row = (await c.env.DB.prepare('SELECT * FROM seafarers WHERE id = ?').bind(id).first())!;
    return c.json({ crew: toApi(row) }, 201);
  });

  router.patch('/:id', requireAuth, requireRole('ADMIN', 'MANAGER'), async (c) => {
    const body = await readJson(c);
    const { cols, params } = updateColumns(body, crewMap(body));
    if (cols.length === 0) return c.json({ message: 'No updates' }, 400);
    await c.env.DB.prepare(`UPDATE seafarers SET ${cols.join(', ')} WHERE id = ?`)
      .bind(...params, c.req.param('id'))
      .run();
    const row = (await c.env.DB.prepare('SELECT * FROM seafarers WHERE id = ?').bind(c.req.param('id')).first())!;
    return c.json({ crew: toApi(row) });
  });

  router.delete('/:id', requireAuth, requireRole('ADMIN'), async (c) => {
    const id = c.req.param('id') as string;
    await c.env.DB.prepare('DELETE FROM certifications WHERE seafarer_id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM documents WHERE seafarer_id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM assignments WHERE seafarer_id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM seafarers WHERE id = ?').bind(id).run();
    return c.json({ message: 'Deleted' });
  });

  router.patch('/:id/status', requireAuth, requireRole('ADMIN', 'MANAGER'), async (c) => {
    const body = await readJson(c);
    const status = String(body.status || '');
    if (!status) return c.json({ message: 'status is required' }, 400);
    await c.env.DB.prepare('UPDATE seafarers SET status = ?, updated_at = ? WHERE id = ?')
      .bind(status, nowIso(), c.req.param('id'))
      .run();
    const row = (await c.env.DB.prepare('SELECT * FROM seafarers WHERE id = ?').bind(c.req.param('id')).first())!;
    return c.json({ crew: toApi(row) });
  });

  router.get('/:id/certifications', requireAuth, async (c) => {
    const { q, limit, offset } = pageInfo(c);
    void limit;
    const rows = await c.env.DB.prepare(
      'SELECT * FROM certifications WHERE seafarer_id = ? ORDER BY issue_date DESC LIMIT 100 OFFSET ?'
    )
      .bind(c.req.param('id'), offset)
      .all();
    void q;
    return c.json({ data: rows.results.map(toApi), total: rows.results.length, page: 1, limit: 100, totalPages: rows.results.length === 0 ? 0 : 1 });
  });

  router.post('/:id/certifications', requireAuth, requireRole('ADMIN', 'MANAGER'), async (c) => {
    const body = await readJson(c);
    const id = oid();
    const now = nowIso();
    await c.env.DB.prepare(
      `INSERT INTO certifications (id, name, type, number, issue_date, expiry_date, issuing_authority, document_url, seafarer_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        String(body.name || ''),
        String(body.type || ''),
        String(body.number || ''),
        String(body.issueDate || now),
        String(body.expiryDate || ''),
        String(body.issuingAuthority || ''),
        String(body.documentUrl || ''),
        c.req.param('id'),
        now,
        now
      )
      .run();
    const row = (await c.env.DB.prepare('SELECT * FROM certifications WHERE id = ?').bind(id).first())!;
    return c.json({ certification: toApi(row) }, 201);
  });

  router.patch('/:id/certifications/:certId', requireAuth, requireRole('ADMIN', 'MANAGER'), async (c) => {
    const body = await readJson(c);
    const { cols, params } = updateColumns(body, {
      name: 'name',
      type: 'type',
      number: 'number',
      issueDate: 'issue_date',
      expiryDate: 'expiry_date',
      issuingAuthority: 'issuing_authority',
      documentUrl: 'document_url',
    });
    if (cols.length === 0) return c.json({ message: 'No updates' }, 400);
    await c.env.DB.prepare(`UPDATE certifications SET ${cols.join(', ')} WHERE id = ? AND seafarer_id = ?`)
      .bind(...params, c.req.param('certId'), c.req.param('id'))
      .run();
    const row = (await c.env.DB.prepare('SELECT * FROM certifications WHERE id = ?').bind(c.req.param('certId')).first())!;
    return c.json({ certification: toApi(row) });
  });

  router.delete('/:id/certifications/:certId', requireAuth, requireRole('ADMIN'), async (c) => {
    await c.env.DB.prepare('DELETE FROM certifications WHERE id = ? AND seafarer_id = ?')
      .bind(c.req.param('certId'), c.req.param('id'))
      .run();
    return c.json({ message: 'Deleted' });
  });

  router.post('/:id/documents/upload', requireAuth, requireRole('ADMIN', 'MANAGER'), async (c) => {
    const form = await c.req.formData().catch(() => null);
    const file = form?.get('file') as File | null;
    if (!file || typeof file === 'string') return c.json({ message: 'No file uploaded' }, 400);
    const f = form!;
    try {
      const { url } = await saveFile(c, file);
      const id = oid();
      const now = nowIso();
      await c.env.DB.prepare(
        `INSERT INTO documents (id, type, number, issue_date, expiry_date, issue_place, file_url, seafarer_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          id,
          String(f.get('type') || ''),
          String(f.get('number') || ''),
          String(f.get('issueDate') || ''),
          String(f.get('expiryDate') || ''),
          String(f.get('issuePlace') || ''),
          url,
          c.req.param('id'),
          now,
          now
        )
        .run();
      return c.json({ url, id });
    } catch {
      return c.json({ message: 'File storage is not configured' }, 503);
    }
  });

  return router;
};

/* ------------------------------------------------------------------ */
/* Vessels                                                             */
/* ------------------------------------------------------------------ */

const vesselMap = (body: Record<string, unknown>): Record<string, string> => ({
  name: 'name',
  imoNumber: 'imo_number',
  flag: 'flag',
  type: 'type',
  yearBuilt: 'year_built',
  grossTonnage: 'gross_tonnage',
  status: 'status',
  lastInspection: 'last_inspection',
  nextInspection: 'next_inspection',
  isActive: 'is_active',
});

export const vesselRoutes = () => {
  const router = new Hono<{ Bindings: Env; Variables: Vars }>();

  router.get('/', requireAuth, async (c) => {
    const { q } = pageInfo(c);
    const filters = searchFilter(c, 'vessels', ['name', 'imo_number', 'type', 'flag'], {
      sql: q.get('status') ? `status = ?` : '',
      params: q.get('status') ? [q.get('status')] : [],
    });
    const result = await paginated(c, 'vessels', filters, 'created_at DESC');
    return c.json({ data: result.data.map(toApi), total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages });
  });

  router.post('/', requireAuth, requireRole('ADMIN', 'MANAGER'), async (c) => {
    const body = await readJson(c);
    const imo = String(body.imoNumber || '').trim();
    if (!body.name) return c.json({ message: 'name is required' }, 400);
    if (imo) {
      const dup = await c.env.DB.prepare('SELECT id FROM vessels WHERE imo_number = ?').bind(imo).first();
      if (dup) return c.json({ message: 'A vessel with that IMO number already exists' }, 409);
    }
    const id = oid();
    const now = nowIso();
    await c.env.DB.prepare(
      `INSERT INTO vessels (id, name, imo_number, flag, type, year_built, gross_tonnage, status, last_inspection, next_inspection, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    )
      .bind(
        id,
        String(body.name),
        imo || oid(),
        String(body.flag || ''),
        String(body.type || ''),
        Number(body.yearBuilt) || 0,
        Number(body.grossTonnage) || 0,
        String(body.status || 'active'),
        String(body.lastInspection || ''),
        String(body.nextInspection || ''),
        now,
        now
      )
      .run();
    const row = (await c.env.DB.prepare('SELECT * FROM vessels WHERE id = ?').bind(id).first())!;
    return c.json({ vessel: toApi(row) }, 201);
  });

  router.get('/:id', requireAuth, async (c) => {
    const row = await c.env.DB.prepare('SELECT * FROM vessels WHERE id = ?').bind(c.req.param('id')).first();
    if (!row) return notFound(c, 'Vessel');
    return c.json({ vessel: toApi(row) });
  });

  router.patch('/:id', requireAuth, requireRole('ADMIN', 'MANAGER'), async (c) => {
    const body = await readJson(c);
    const { cols, params } = updateColumns(body, vesselMap(body));
    if (cols.length === 0) return c.json({ message: 'No updates' }, 400);
    await c.env.DB.prepare(`UPDATE vessels SET ${cols.join(', ')} WHERE id = ?`)
      .bind(...params, c.req.param('id'))
      .run();
    const row = (await c.env.DB.prepare('SELECT * FROM vessels WHERE id = ?').bind(c.req.param('id')).first())!;
    return c.json({ vessel: toApi(row) });
  });

  router.delete('/:id', requireAuth, requireRole('ADMIN'), async (c) => {
    const id = c.req.param('id') as string;
    await c.env.DB.prepare('DELETE FROM assignments WHERE vessel_id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM vessels WHERE id = ?').bind(id).run();
    return c.json({ message: 'Deleted' });
  });

  router.patch('/:id/status', requireAuth, requireRole('ADMIN', 'MANAGER'), async (c) => {
    const body = await readJson(c);
    const status = String(body.status || '');
    if (!status) return c.json({ message: 'status is required' }, 400);
    await c.env.DB.prepare('UPDATE vessels SET status = ?, updated_at = ? WHERE id = ?')
      .bind(status, nowIso(), c.req.param('id'))
      .run();
    const row = (await c.env.DB.prepare('SELECT * FROM vessels WHERE id = ?').bind(c.req.param('id')).first())!;
    return c.json({ vessel: toApi(row) });
  });

  router.get('/:id/crew', requireAuth, async (c) => {
    const rows = await c.env.DB.prepare(
      `SELECT a.*, s.first_name, s.last_name, s.email, s.rank AS seafarer_rank
       FROM assignments a JOIN seafarers s ON s.id = a.seafarer_id
       WHERE a.vessel_id = ? AND a.is_active = 1 ORDER BY a.created_at DESC`
    )
      .bind(c.req.param('id'))
      .all();
    return c.json({
      data: rows.results.map((r) => ({
        id: r.id,
        crewMemberId: r.seafarer_id,
        name: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        email: r.email,
        rank: r.rank || r.seafarer_rank || '',
        startDate: r.start_date,
        endDate: r.end_date,
        isActive: r.is_active,
      })),
    });
  });

  router.post('/:id/crew', requireAuth, requireRole('ADMIN', 'MANAGER'), async (c) => {
    const body = await readJson(c);
    const crewMemberId = String(body.crewMemberId || body.seafarerId || '');
    if (!crewMemberId) return c.json({ message: 'crewMemberId is required' }, 400);
    const s = await c.env.DB.prepare('SELECT id FROM seafarers WHERE id = ?').bind(crewMemberId).first();
    if (!s) return c.json({ message: 'Crew member not found' }, 404);
    const id = oid();
    const now = nowIso();
    await c.env.DB.prepare(
      `INSERT INTO assignments (id, seafarer_id, vessel_id, rank, start_date, end_date, is_active, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
    )
      .bind(
        id,
        crewMemberId,
        c.req.param('id'),
        String(body.rank || body.position || ''),
        String(body.startDate || now),
        String(body.endDate || ''),
        String(body.notes || ''),
        now,
        now
      )
      .run();
    return c.json({ message: 'Assigned', assignmentId: id });
  });

  router.delete('/:id/crew/:crewMemberId', requireAuth, requireRole('ADMIN', 'MANAGER'), async (c) => {
    await c.env.DB.prepare(
      'UPDATE assignments SET is_active = 0, end_date = ?, updated_at = ? WHERE vessel_id = ? AND seafarer_id = ? AND is_active = 1'
    )
      .bind(nowIso(), nowIso(), c.req.param('id'), c.req.param('crewMemberId'))
      .run();
    return c.json({ message: 'Unassigned' });
  });

  router.post('/:id/upload', requireAuth, async (c) => {
    const form = await c.req.formData().catch(() => null);
    const file = form?.get('file') as File | null;
    if (!file || typeof file === 'string') return c.json({ message: 'No file uploaded' }, 400);
    try {
      return c.json(await saveFile(c, file));
    } catch {
      return c.json({ message: 'File storage is not configured' }, 503);
    }
  });

  return router;
};

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

export const documentRoutes = () => {
  const router = new Hono<{ Bindings: Env; Variables: Vars }>();

  router.get('/', requireAuth, async (c) => {
    const { q } = pageInfo(c);
    const filters = searchFilter(c, 'documents', ['type', 'number', 'issue_place'], {
      sql: q.get('seafarerId') ? `seafarer_id = ?` : '',
      params: q.get('seafarerId') ? [q.get('seafarerId')] : [],
    });
    const result = await paginated(c, 'documents', filters, 'created_at DESC');
    return c.json({ data: result.data.map(toApi), total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages });
  });

  router.get('/:id', requireAuth, async (c) => {
    const row = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(c.req.param('id')).first();
    if (!row) return notFound(c, 'Document');
    return c.json({ document: toApi(row) });
  });

  router.post('/', requireAuth, requireRole('ADMIN', 'MANAGER'), async (c) => {
    const body = await readJson(c);
    const id = oid();
    const now = nowIso();
    await c.env.DB.prepare(
      `INSERT INTO documents (id, type, number, issue_date, expiry_date, issue_place, file_url, seafarer_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        String(body.type || ''),
        String(body.number || ''),
        String(body.issueDate || ''),
        String(body.expiryDate || ''),
        String(body.issuePlace || ''),
        String(body.fileUrl || ''),
        String(body.seafarerId || ''),
        now,
        now
      )
      .run();
    const row = (await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(id).first())!;
    return c.json({ document: toApi(row) }, 201);
  });

  router.patch('/:id', requireAuth, requireRole('ADMIN', 'MANAGER'), async (c) => {
    const body = await readJson(c);
    const { cols, params } = updateColumns(body, {
      type: 'type',
      number: 'number',
      issueDate: 'issue_date',
      expiryDate: 'expiry_date',
      issuePlace: 'issue_place',
      fileUrl: 'file_url',
      seafarerId: 'seafarer_id',
    });
    if (cols.length === 0) return c.json({ message: 'No updates' }, 400);
    await c.env.DB.prepare(`UPDATE documents SET ${cols.join(', ')} WHERE id = ?`)
      .bind(...params, c.req.param('id'))
      .run();
    const row = (await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(c.req.param('id')).first())!;
    return c.json({ document: toApi(row) });
  });

  router.delete('/:id', requireAuth, requireRole('ADMIN'), async (c) => {
    await c.env.DB.prepare('DELETE FROM documents WHERE id = ?').bind(c.req.param('id')).run();
    return c.json({ message: 'Deleted' });
  });

  router.post('/upload', requireAuth, requireRole('ADMIN', 'MANAGER'), async (c) => {
    const form = await c.req.formData().catch(() => null);
    const file = form?.get('file') as File | null;
    if (!file || typeof file === 'string') return c.json({ message: 'No file uploaded' }, 400);
    const f = form!;
    const seafarerId = String(f.get('seafarerId') || '');
    try {
      const { url } = await saveFile(c, file);
      const id = oid();
      const now = nowIso();
      await c.env.DB.prepare(
        `INSERT INTO documents (id, type, number, issue_date, expiry_date, issue_place, file_url, seafarer_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          id,
          String(f.get('type') || ''),
          String(f.get('number') || ''),
          String(f.get('issueDate') || ''),
          String(f.get('expiryDate') || ''),
          String(f.get('issuePlace') || ''),
          url,
          seafarerId,
          now,
          now
        )
        .run();
      return c.json({ url, id });
    } catch {
      return c.json({ message: 'File storage is not configured' }, 503);
    }
  });

  router.get('/:id/download', requireAuth, async (c) => {
    const kv = c.env.OCEAN_FILES;
    const row = await c.env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(c.req.param('id')).first();
    if (!row) return notFound(c, 'Document');
    const fileId = String(row.file_url || '').split('/').pop() || '';
    if (!kv || !fileId) return c.json({ message: 'No file attached' }, 404);
    const buf = (await kv.get(`fb:${fileId}`, { type: 'arrayBuffer' })) as ArrayBuffer | null;
    if (!buf) return c.json({ message: 'File not found' }, 404);
    const metaRaw = await kv.get(`fm:${fileId}`, { type: 'text' });
    let meta: Record<string, string> = {};
    try {
      meta = metaRaw ? (JSON.parse(metaRaw) as Record<string, string>) : {};
    } catch {
      meta = {};
    }
    return new Response(buf, {
      headers: {
        'Content-Type': meta.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${(meta.name || 'document').replace(/"/g, '')}"`,
      },
    });
  });

  return router;
};

/* ------------------------------------------------------------------ */
/* Reports (summary-style, generated on demand)                        */
/* ------------------------------------------------------------------ */

export const reportRoutes = () => {
  const router = new Hono<{ Bindings: Env; Variables: Vars }>();

  const summary = async (c: C) => {
    const vessels = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM vessels').first();
    const seafarers = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM seafarers').first();
    const users = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM users').first();
    const assignments = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM assignments WHERE is_active = 1').first();
    return {
      id: `report-${Date.now()}`,
      type: 'fleet-overview',
      name: 'Fleet overview',
      generatedAt: nowIso(),
      metrics: {
        vessels: Number(vessels?.n || 0),
        seafarers: Number(seafarers?.n || 0),
        users: Number(users?.n || 0),
        activeAssignments: Number(assignments?.n || 0),
      },
    };
  };

  router.get('/', requireAuth, async (c) => {
    const s = await summary(c);
    return c.json({ data: [s], total: 1, page: 1, limit: 20, totalPages: 1 });
  });

  router.post('/generate', requireAuth, requireRole('ADMIN', 'MANAGER'), async (c) => {
    const s = await summary(c);
    return c.json({ report: s });
  });

  router.get('/:id/download', requireAuth, async (c) => {
    const s = await summary(c);
    return new Response(JSON.stringify(s, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="report-${Date.now()}.json"`,
      },
    });
  });

  return router;
};