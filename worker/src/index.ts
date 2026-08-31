/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  AUTH_SECRET: string;
  RESET_SECRET?: string;
  ALLOWED_ORIGINS?: string;
  ENVIRONMENT?: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  company_id: string | null;
  password_hash: string;
  salt: string;
  created_at: string;
  updated_at: string;
}

interface RecordRow {
  id: string;
  store: string;
  data: string;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

const ALLOWED_STORES = new Set([
  'companies',
  'vessels',
  'seafarers',
  'crew_changes',
  'crewChanges',
  'crewAssignments',
  'crew_assignments',
  'payrolls',
  'documents',
  'notifications',
  'applicants',
  'certificates',
  'ranks',
  'payroll_settings',
  'payrollSettings',
  'company_settings',
  'companySettings',
  'job_postings',
  'system_settings',
]);

/**
 * Maps a store/index-name to the JSON field path(s) used by the frontend's
 * IndexedDB schema. The Worker stores records as JSON blobs, so it cannot use
 * native D1 indexes and must resolve these paths itself.
 */
const INDEX_PATHS: Record<string, Record<string, string | string[]>> = {
  companies: {
    by_name: 'name',
    by_code: 'code',
    by_company: 'id',
  },
  vessels: {
    by_name: 'name',
    by_imo: 'imoNumber',
    by_status: 'status',
    by_company: 'companyId',
  },
  seafarers: {
    by_name: ['personalInfo.lastName', 'personalInfo.firstName'],
    by_rank: 'employment.rank',
    by_rankId: 'employment.rankId',
    by_status: 'employment.status',
    by_vessel: 'employment.currentVesselId',
    by_company: 'companyId',
  },
  crew_changes: {
    by_vessel: 'vesselId',
    by_date: 'scheduledDate',
    by_status: 'status',
    by_company: 'companyId',
  },
  crewChanges: {
    by_vessel: 'vesselId',
    by_date: 'scheduledDate',
    by_status: 'status',
    by_company: 'companyId',
  },
  crewAssignments: {
    by_seafarer: 'seafarerId',
    by_vessel: 'vesselId',
    by_status: 'status',
    by_date_range: ['startDate', 'endDate'],
    by_company: 'companyId',
  },
  crew_assignments: {
    by_seafarer: 'seafarerId',
    by_vessel: 'vesselId',
    by_status: 'status',
    by_date_range: ['startDate', 'endDate'],
    by_company: 'companyId',
  },
  payrolls: {
    by_seafarer: 'seafarerId',
    by_vessel: 'vesselId',
    by_period: ['periodStart', 'periodEnd'],
    by_status: 'status',
    by_company: 'companyId',
  },
  documents: {
    by_type: 'type',
    by_entity: ['relatedTo.entityType', 'relatedTo.entityId'],
    by_expiry: 'expiryDate',
    by_company: 'companyId',
  },
  notifications: {
    by_read_status: 'read',
    by_date: 'createdAt',
    by_type: 'type',
    by_company: 'companyId',
  },
  applicants: {
    by_company: 'companyId',
    by_status: 'application.status',
    by_position: 'application.position',
  },
  certificates: {
    by_seafarer: 'seafarerId',
    by_type: 'type',
    by_status: 'status',
    by_expiry: 'expiryDate',
    by_company: 'companyId',
  },
  ranks: {
    by_company: 'companyId',
    by_department: 'department',
    by_name: 'name',
  },
  payroll_settings: {
    by_company: 'companyId',
  },
  payrollSettings: {
    by_company: 'companyId',
  },
  company_settings: {
    by_company: 'companyId',
  },
  companySettings: {
    by_company: 'companyId',
  },
  job_postings: {
    by_company: 'companyId',
    by_status: 'status',
  },
  system_settings: {
    by_company: 'companyId',
  },
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const empty = (status: number) => new Response(null, { status });

function getOrigin(request: Request, env: Env): string {
  return request.headers.get('Origin') || '';
}

function allowedOrigins(env: Env): string[] {
  const raw = env.ALLOWED_ORIGINS || 'https://ocean-stride.vercel.app,http://localhost:5173,http://localhost:8080';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = getOrigin(request, env);
  const allowed = allowedOrigins(env);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-CSRF-Token',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

function withCors(request: Request, env: Env, response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request, env))) {
    headers.set(key, value);
  }
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return new Response(response.body, { status: response.status, headers });
}

function getClientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
}

// ---------------------------------------------------------------------------
// Password / token helpers (Web Crypto, Worker-compatible)
// ---------------------------------------------------------------------------
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(input: ArrayBuffer | string): Promise<ArrayBuffer> {
  const data = typeof input === 'string' ? encoder.encode(input) : input;
  return crypto.subtle.digest('SHA-256', data);
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return toHex(bits);
}

function randomSessionToken(): string {
  return randomHex(32);
}

async function base64UrlEncode(input: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function base64UrlDecode(input: string): Promise<Uint8Array> {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  companyId?: string;
  type: 'access';
  iat: number;
  exp: number;
}

async function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = await base64UrlEncode(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = await base64UrlEncode(encoder.encode(JSON.stringify({ ...payload, iat: now, exp: now + 60 * 60 })));
  const sigInput = `${header}.${body}`;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(sigInput));
  const sig = await base64UrlEncode(signature);
  return `${sigInput}.${sig}`;
}

async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const sigInput = `${header}.${body}`;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const decodedSig = await base64UrlDecode(sig);
  const valid = await crypto.subtle.verify('HMAC', key, decodedSig, encoder.encode(sigInput));
  if (!valid) return null;
  let payload: JwtPayload;
  try {
    payload = JSON.parse(decoder.decode(await base64UrlDecode(body))) as JwtPayload;
  } catch {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now || payload.type !== 'access') return null;
  return payload;
}

async function requireAuth(request: Request, env: Env): Promise<{ user: UserRow; payload: JwtPayload } | null> {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const payload = await verifyJwt(token, env.AUTH_SECRET);
  if (!payload) return null;
  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(payload.sub).first<UserRow>();
  if (!row) return null;
  return { user: row, payload };
}

function canAccessCompany(user: UserRow, companyId: string | null | undefined): boolean {
  if (!companyId) return true;
  if (user.role === 'admin' || user.role === 'superadmin') return true;
  return user.company_id === companyId;
}

async function logAudit(env: Env, event: { user_id?: string; action: string; resource?: string; resource_id?: string; metadata?: unknown; ip?: string; user_agent?: string }) {
  await env.DB.prepare(
    `INSERT INTO audit_logs (id, user_id, action, resource, resource_id, metadata, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(randomHex(16), event.user_id || null, event.action, event.resource || null, event.resource_id || null, event.metadata ? JSON.stringify(event.metadata) : null, event.ip || null, event.user_agent || null)
    .run()
    .catch(() => {});
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
async function rateLimit(env: Env, request: Request, bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
  const ip = getClientIp(request);
  const key = `rl:${bucket}:${ip}`;
  const current = Number((await env.KV.get(key)) || '0');
  if (current >= limit) return false;
  await env.KV.put(key, String(current + 1), { expirationTtl: windowSeconds });
  return true;
}

// ---------------------------------------------------------------------------
// Auth handlers
// ---------------------------------------------------------------------------
async function handleRegister(request: Request, env: Env, user: UserRow | null): Promise<Response> {
  if (!(await rateLimit(env, request, 'register', 10, 300))) {
    return json(429, { error: 'Too many attempts. Please try again later.' });
  }
  let body: { email?: string; name?: string; password?: string; companyId?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }
  const email = (body.email || '').trim().toLowerCase();
  const name = (body.name || '').trim();
  const password = body.password || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json(400, { error: 'Invalid email address' });
  if (!name || name.length > 120) return json(400, { error: 'Name is required' });
  if (password.length < 8) return json(400, { error: 'Password must be at least 8 characters' });

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>();
  if (existing) return json(409, { error: 'An account with this email already exists' });

  // The first account is an admin; subsequent registrations require an admin.
  const countRow = await env.DB.prepare('SELECT COUNT(*) as c FROM users').first<{ c: number }>();
  const isFirstUser = !countRow || countRow.c === 0;
  if (!isFirstUser && (!user || (user.role !== 'admin' && user.role !== 'superadmin'))) {
    return json(403, { error: 'Only administrators can create additional accounts' });
  }

  const id = randomHex(16);
  const salt = randomHex(16);
  const passwordHash = await hashPassword(password, salt);
  const role = body.companyId ? 'manager' : 'admin';

  await env.DB.prepare(
    `INSERT INTO users (id, email, name, role, company_id, password_hash, salt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, email, name, role, body.companyId || (isFirstUser ? null : user?.company_id || null), passwordHash, salt)
    .run();

  await logAudit(env, { user_id: user?.id, action: 'user.register', resource: 'user', resource_id: id, ip: getClientIp(request), user_agent: request.headers.get('User-Agent') || '' });

  // Auto log in the newly created account when it is the first user or the caller.
  const token = await signJwt({ type: 'access', sub: id, email, role, companyId: body.companyId || (isFirstUser ? undefined : user?.company_id || undefined) }, env.AUTH_SECRET);
  const refreshToken = randomSessionToken();
  const refreshHash = toHex(await sha256(refreshToken));
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)')
    .bind(randomHex(16), id, refreshHash, expiresAt)
    .run();

  return json(201, {
    accessToken: token,
    refreshToken,
    user: { id, email, name, role, companyId: body.companyId || user?.company_id || null },
  });
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  if (!(await rateLimit(env, request, 'login', 10, 300))) {
    return json(429, { error: 'Too many login attempts. Please try again later.' });
  }
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  if (!email || !password) return json(400, { error: 'Email and password are required' });

  const row = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>();
  if (!row) return json(401, { error: 'Invalid email or password' });

  const hash = await hashPassword(password, row.salt);
  if (hash !== row.password_hash) return json(401, { error: 'Invalid email or password' });

  const token = await signJwt({ type: 'access', sub: row.id, email: row.email, role: row.role, companyId: row.company_id || undefined }, env.AUTH_SECRET);
  const refreshToken = randomSessionToken();
  const refreshHash = toHex(await sha256(refreshToken));
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)')
    .bind(randomHex(16), row.id, refreshHash, expiresAt)
    .run();

  await logAudit(env, { user_id: row.id, action: 'auth.login', resource: 'user', resource_id: row.id, ip: getClientIp(request), user_agent: request.headers.get('User-Agent') || '' });

  return json(200, {
    accessToken: token,
    refreshToken,
    user: { id: row.id, email: row.email, name: row.name, role: row.role, companyId: row.company_id },
  });
}

async function handleRefresh(request: Request, env: Env): Promise<Response> {
  let body: { refreshToken?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }
  const refreshToken = body.refreshToken || '';
  if (!refreshToken) return json(400, { error: 'refreshToken is required' });
  const hash = toHex(await sha256(refreshToken));
  const session = await env.DB.prepare('SELECT * FROM sessions WHERE token_hash = ?').bind(hash).first<{ id: string; user_id: string; expires_at: string; revoked: number }>();
  if (!session || session.revoked !== 0 || new Date(session.expires_at) <= new Date()) {
    return json(401, { error: 'Invalid or expired refresh token' });
  }
  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.user_id).first<UserRow>();
  if (!row) return json(401, { error: 'User no longer exists' });

  const token = await signJwt({ type: 'access', sub: row.id, email: row.email, role: row.role, companyId: row.company_id || undefined }, env.AUTH_SECRET);
  const newRefreshToken = randomSessionToken();
  const newHash = toHex(await sha256(newRefreshToken));
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Rotate the session token (revoke old, insert new).
  await env.DB.batch([
    env.DB.prepare('UPDATE sessions SET revoked = 1 WHERE id = ?').bind(session.id),
    env.DB.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)')
      .bind(randomHex(16), row.id, newHash, expiresAt),
  ]);

  return json(200, { accessToken: token, refreshToken: newRefreshToken, user: { id: row.id, email: row.email, name: row.name, role: row.role, companyId: row.company_id } });
}

async function handleLogout(request: Request, env: Env, user: UserRow | null): Promise<Response> {
  // Revoke any refresh token supplied in the body.
  let refreshToken = '';
  try {
    const body = (await request.json()) as { refreshToken?: string };
    refreshToken = body.refreshToken || '';
  } catch {
    // no body is fine
  }
  if (refreshToken) {
    const hash = toHex(await sha256(refreshToken));
    await env.DB.prepare('UPDATE sessions SET revoked = 1 WHERE token_hash = ?').bind(hash).run();
  }
  await logAudit(env, { user_id: user?.id, action: 'auth.logout', resource: 'user', resource_id: user?.id, ip: getClientIp(request), user_agent: request.headers.get('User-Agent') || '' });
  return empty(204);
}

async function handleMe(user: UserRow): Promise<Response> {
  return json(200, {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    companyId: user.company_id,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  });
}

const VALID_ROLES = new Set(['admin', 'manager', 'seafarer', 'captain', 'officer', 'crew']);

function requireAdmin(user: UserRow): boolean {
  return user.role === 'admin' || user.role === 'superadmin';
}

function toUserResponse(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    companyId: row.company_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function handleListUsers(request: Request, env: Env, user: UserRow): Promise<Response> {
  if (!requireAdmin(user)) return json(403, { error: 'Only administrators can list users' });
  const url = new URL(request.url);
  const search = (url.searchParams.get('search') || '').trim().toLowerCase();
  const role = url.searchParams.get('role');
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || '10')));

  const where: string[] = [];
  const params: Array<string | number> = [];
  if (search) {
    where.push('(LOWER(email) LIKE ? OR LOWER(name) LIKE ?)');
    const q = `%${search}%`;
    params.push(q, q);
  }
  if (role && VALID_ROLES.has(role)) {
    where.push('role = ?');
    params.push(role);
  }
  const clause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const countRow = await env.DB.prepare(`SELECT COUNT(*) as c FROM users${clause}`).bind(...params).first<{ c: number }>();
  const total = countRow?.c || 0;
  const rows = (await env.DB.prepare(
    `SELECT * FROM users${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  ).bind(...params, limit, (page - 1) * limit).all<UserRow>()).results ?? [];
  return json(200, {
    data: rows.map(toUserResponse),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

async function handleGetUser(env: Env, id: string, user: UserRow): Promise<Response> {
  if (!requireAdmin(user) && user.id !== id) return json(403, { error: 'Access denied' });
  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
  if (!row) return json(404, { error: 'User not found' });
  return json(200, toUserResponse(row));
}

async function handleCreateUser(request: Request, env: Env, user: UserRow): Promise<Response> {
  if (!requireAdmin(user)) return json(403, { error: 'Only administrators can create users' });
  let body: { email?: string; name?: string; password?: string; role?: string; companyId?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }
  const email = (body.email || '').trim().toLowerCase();
  const name = (body.name || '').trim();
  const password = body.password || '';
  const role = VALID_ROLES.has(body.role || '') ? (body.role as string) : 'crew';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json(400, { error: 'Invalid email address' });
  if (!name || name.length > 120) return json(400, { error: 'Name is required' });
  if (password.length < 8) return json(400, { error: 'Password must be at least 8 characters' });

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>();
  if (existing) return json(409, { error: 'An account with this email already exists' });

  const id = randomHex(16);
  const salt = randomHex(16);
  const passwordHash = await hashPassword(password, salt);
  const companyId = user.company_id || body.companyId || null;
  await env.DB.prepare(
    `INSERT INTO users (id, email, name, role, company_id, password_hash, salt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, email, name, role, companyId, passwordHash, salt).run();
  await logAudit(env, { user_id: user.id, action: 'user.create', resource: 'user', resource_id: id, ip: getClientIp(request), user_agent: request.headers.get('User-Agent') || '' });
  const created = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
  return json(201, toUserResponse(created as UserRow));
}

async function handleUpdateUser(request: Request, env: Env, id: string, user: UserRow): Promise<Response> {
  if (!requireAdmin(user) && user.id !== id) return json(403, { error: 'Access denied' });
  let body: { email?: string; name?: string; role?: string; companyId?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }
  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
  if (!row) return json(404, { error: 'User not found' });

  const email = body.email === undefined ? row.email : (body.email || '').trim().toLowerCase();
  const name = body.name === undefined ? row.name : body.name.trim();
  const role = body.role === undefined ? row.role : (VALID_ROLES.has(body.role) ? body.role : row.role);
  const companyId = body.companyId === undefined ? row.company_id : (body.companyId || null);

  if (!requireAdmin(user) && (email !== row.email || role !== row.role || companyId !== row.company_id)) {
    return json(403, { error: 'You may only update your own profile fields' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json(400, { error: 'Invalid email address' });
  if (!name || name.length > 120) return json(400, { error: 'Name is required' });
  if (email !== row.email) {
    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>();
    if (existing && existing.id !== id) return json(409, { error: 'An account with this email already exists' });
  }

  let passwordHash = row.password_hash;
  let salt = row.salt;
  if (body.password) {
    if (body.password.length < 8) return json(400, { error: 'Password must be at least 8 characters' });
    salt = randomHex(16);
    passwordHash = await hashPassword(body.password, salt);
  }

  await env.DB.prepare(
    `UPDATE users SET email = ?, name = ?, role = ?, company_id = ?, password_hash = ?, salt = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).bind(email, name, role, companyId, passwordHash, salt, id).run();
  await logAudit(env, { user_id: user.id, action: 'user.update', resource: 'user', resource_id: id, ip: getClientIp(request), user_agent: request.headers.get('User-Agent') || '' });
  const updated = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
  return json(200, toUserResponse(updated as UserRow));
}

async function handleDeleteUser(request: Request, env: Env, id: string, user: UserRow): Promise<Response> {
  if (!requireAdmin(user)) return json(403, { error: 'Only administrators can delete users' });
  if (user.id === id) return json(400, { error: 'You cannot delete your own account' });
  const row = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first<{ id: string }>();
  if (!row) return json(404, { error: 'User not found' });
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  await logAudit(env, { user_id: user.id, action: 'user.delete', resource: 'user', resource_id: id, ip: getClientIp(request), user_agent: request.headers.get('User-Agent') || '' });
  return empty(204);
}

async function handleForgotPassword(request: Request, env: Env): Promise<Response> {
  // Always return a generic response to avoid account enumeration.
  let email = '';
  try {
    const body = (await request.json()) as { email?: string };
    email = (body.email || '').trim().toLowerCase();
  } catch {
    // ignore
  }
  if (email) {
    await logAudit(env, { action: 'auth.forgot_password', resource: 'user', resource_id: email, ip: getClientIp(request), user_agent: request.headers.get('User-Agent') || '' });
  }
  return json(200, { message: 'If an account exists with that email, a reset link will be sent.' });
}

async function handleResetPassword(request: Request, env: Env): Promise<Response> {
  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }
  const token = body.token || '';
  const password = body.password || '';
  if (!token) return json(400, { error: 'Missing reset token' });
  if (password.length < 8) return json(400, { error: 'Password must be at least 8 characters' });

  // For a first-class implementation, a reset token table is used. For this
  // release we validate the token as a short-lived JWT signed with RESET_SECRET.
  const secret = env.RESET_SECRET || env.AUTH_SECRET;
  const payload = await verifyJwt(token, secret);
  if (!payload) return json(400, { error: 'Invalid or expired reset token' });

  const salt = randomHex(16);
  const hash = await hashPassword(password, salt);
  await env.DB.prepare('UPDATE users SET password_hash = ?, salt = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(hash, salt, payload.sub)
    .run();
  await logAudit(env, { user_id: payload.sub, action: 'auth.reset_password', resource: 'user', resource_id: payload.sub, ip: getClientIp(request), user_agent: request.headers.get('User-Agent') || '' });
  return json(200, { message: 'Password updated successfully' });
}

// ---------------------------------------------------------------------------
// Generic record storage
// ---------------------------------------------------------------------------
function parseData(data: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === 'object' ? parsed : { value: parsed };
  } catch {
    return {};
  }
}

function getByPath(record: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((value, segment) => {
    if (value == null || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[segment];
  }, record);
}

function normalizeIndexValue(value: string | null): unknown[] {
  // Compound index values are serialized by URLSearchParams as comma-separated
  // strings, which is lossy only for values that themselves contain commas.
  // Basic values stay a single-element array.
  if (value == null) return [];
  return value.split(',').map((v) => decodeURIComponent(v.trim()));
}

function matchesIndex(store: string, record: Record<string, unknown>, index: string, value: string | null): boolean {
  if (!index || value == null) return true;
  const pathDef = INDEX_PATHS[store]?.[index];
  if (!pathDef) {
    // Fall back to a direct property lookup for unlisted indexes.
    const actual = record[index] ?? record[`${index}.id`] ?? null;
    if (actual == null) return false;
    if (typeof actual === 'object' && actual !== null) {
      if (Array.isArray(actual)) return actual.some((item) => String(item) === value);
      const idValue = (actual as Record<string, unknown>).id;
      return String(idValue ?? '') === value;
    }
    return String(actual) === value;
  }

  const expectedValues = normalizeIndexValue(value);
  const paths = Array.isArray(pathDef) ? pathDef : [pathDef];

  if (paths.length > 1 && expectedValues.length > 1) {
    // Compound index: each expected value must match its corresponding path.
    return paths.every((path, i) => {
      const actual = getByPath(record, path);
      return String(actual ?? '') === expectedValues[i];
    });
  }

  const singleExpected = expectedValues[0] !== undefined ? expectedValues[0] : '';
  return paths.some((path) => {
    const actual = getByPath(record, path);
    if (actual == null) return false;
    if (typeof actual === 'object' && actual !== null) {
      if (Array.isArray(actual)) return actual.some((item) => String(item) === singleExpected);
      const idValue = (actual as Record<string, unknown>).id;
      return String(idValue ?? '') === singleExpected;
    }
    return String(actual) === singleExpected;
  });
}

async function getRecords(store: string, request: Request, env: Env, user: UserRow): Promise<Response> {
  const url = new URL(request.url);
  const index = url.searchParams.get('index');
  const value = url.searchParams.get('value');
  const query = 'SELECT * FROM app_records WHERE store = ?';
  const params = [store];
  if (index && ['by_company', 'companyId'].includes(index)) {
    // Company scoping is handled in code for safety.
  }
  const rows = (await env.DB.prepare(`${query} ORDER BY created_at DESC`).bind(...params).all<RecordRow>()).results ?? [];
  let records = rows.map((row) => {
    const record = parseData(row.data);
    return {
      id: row.id,
      store: row.store,
      companyId: row.company_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ...record,
    };
  });

  records = records.filter((record: Record<string, unknown>) => canAccessCompany(user, (record.companyId as string) || null));
  if (index && value != null) {
    records = records.filter((record) => matchesIndex(store, record as Record<string, unknown>, index, value));
  }
  return json(200, { items: records, total: records.length });
}

async function createRecord(store: string, request: Request, env: Env, user: UserRow): Promise<Response> {
  let body: { data?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }
  const data = body.data || {};
  const id = String((data.id as string) || crypto.randomUUID());
  let companyId = String((data.companyId as string) || user.company_id || '');
  // A company is the root tenant for its own records.
  if (!companyId && store === 'companies') companyId = id;
  const now = new Date().toISOString();
  const record = {
    ...data,
    id,
    companyId,
    createdAt: (data.createdAt as string) || now,
    updatedAt: now,
  };
  await env.DB.prepare(
    `INSERT INTO app_records (id, store, data, company_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(store, id) DO UPDATE SET
       data = excluded.data,
       company_id = excluded.company_id,
       updated_at = excluded.updated_at`,
  )
    .bind(id, store, JSON.stringify(record), companyId || null, now, now)
    .run();
  await logAudit(env, { user_id: user.id, action: 'record.create', resource: store, resource_id: id, ip: getClientIp(request) });
  return json(201, record);
}

async function getRecord(store: string, id: string, env: Env, user: UserRow): Promise<Response> {
  const row = await env.DB.prepare('SELECT * FROM app_records WHERE store = ? AND id = ?').bind(store, id).first<RecordRow>();
  if (!row) return json(404, { error: 'Record not found' });
  const record = {
    ...parseData(row.data),
    id: row.id,
    store: row.store,
    companyId: row.company_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (!canAccessCompany(user, row.company_id)) return json(403, { error: 'Access denied' });
  return json(200, record);
}

async function updateOrDeleteRecord(store: string, id: string, request: Request, env: Env, user: UserRow): Promise<Response> {
  const row = await env.DB.prepare('SELECT * FROM app_records WHERE store = ? AND id = ?').bind(store, id).first<RecordRow>();
  if (!row) return json(404, { error: 'Record not found' });
  if (!canAccessCompany(user, row.company_id)) return json(403, { error: 'Access denied' });

  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM app_records WHERE store = ? AND id = ?').bind(store, id).run();
    await logAudit(env, { user_id: user.id, action: 'record.delete', resource: store, resource_id: id, ip: getClientIp(request) });
    return empty(204);
  }

  let body: { data?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }
  const old = parseData(row.data);
  const updates = body.data || {};
  const merged: Record<string, unknown> = {
    ...old,
    ...updates,
    id,
    store,
    companyId: updates.companyId || row.company_id || user.company_id || '',
    createdAt: row.created_at,
    updatedAt: new Date().toISOString(),
  };
  await env.DB.prepare(
    `UPDATE app_records SET data = ?, company_id = ?, updated_at = ? WHERE store = ? AND id = ?`,
  )
    .bind(JSON.stringify(merged), String(merged.companyId || row.company_id || '') || null, String(merged.updatedAt), store, id)
    .run();
  await logAudit(env, { user_id: user.id, action: 'record.update', resource: store, resource_id: id, ip: getClientIp(request) });
  return json(200, merged);
}

// ---------------------------------------------------------------------------
// Uploads (R2)
// ---------------------------------------------------------------------------
async function handleUpload(request: Request, env: Env, user: UserRow): Promise<Response> {
  if (!(await rateLimit(env, request, 'upload', 30, 60))) return json(429, { error: 'Too many uploads' });
  const contentType = request.headers.get('Content-Type') || '';
  let data: ArrayBuffer | null = null;
  let filename = 'file';
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('file') as { name: string; size: number; arrayBuffer(): Promise<ArrayBuffer> } | null;
    if (!file) return json(400, { error: 'file field is required' });
    if (file.size > 10 * 1024 * 1024) return json(413, { error: 'File exceeds 10MB limit' });
    data = await file.arrayBuffer();
    filename = file.name || 'file';
  } else {
    data = await request.arrayBuffer();
  }
  if (!data) return json(400, { error: 'No file content' });
  const key = `${user.company_id || 'global'}/${randomHex(12)}/${encodeURIComponent(filename)}`;
  await env.R2.put(key, data, {
    httpMetadata: { contentType: contentType.includes('multipart/form-data') ? 'application/octet-stream' : contentType },
  });
  await env.DB.prepare('INSERT INTO uploads (key, filename, content_type, size, owner_id, company_id) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(key, filename, contentType, data.byteLength, user.id, user.company_id)
    .run();
  return json(201, { key, url: `/api/upload/${encodeURIComponent(key)}` });
}

async function handleDownload(key: string, request: Request, env: Env, user: UserRow): Promise<Response> {
  const upload = await env.DB.prepare('SELECT * FROM uploads WHERE key = ?').bind(key).first<{ company_id: string | null; filename: string; content_type: string }>();
  if (!upload) return json(404, { error: 'File not found' });
  if (!canAccessCompany(user, upload.company_id)) return json(403, { error: 'Access denied' });
  const object = await env.R2.get(key);
  if (!object) return json(404, { error: 'File not found' });
  const headers = new Headers();
  headers.set('Content-Type', upload.content_type || 'application/octet-stream');
  headers.set('Content-Disposition', `inline; filename="${upload.filename.replace(/"/g, '')}"`);
  headers.set('Cache-Control', 'private, max-age=3600');
  return new Response(object.body, { headers });
}

// ---------------------------------------------------------------------------
// Request router
// ---------------------------------------------------------------------------
async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') return withCors(request, env, empty(204));

  // Health
  if (request.method === 'GET' && path === '/api/health') {
    return withCors(request, env, json(200, { ok: true, service: 'ocean-stride-api', environment: env.ENVIRONMENT || 'development', time: new Date().toISOString() }));
  }

  // Auth
  if (path === '/api/auth/register' && request.method === 'POST') {
    const auth = await requireAuth(request, env);
    return withCors(request, env, await handleRegister(request, env, auth?.user || null));
  }
  if (path === '/api/auth/login' && request.method === 'POST') {
    return withCors(request, env, await handleLogin(request, env));
  }
  if (path === '/api/auth/refresh' && request.method === 'POST') {
    return withCors(request, env, await handleRefresh(request, env));
  }
  if (path === '/api/auth/logout' && request.method === 'POST') {
    const auth = await requireAuth(request, env);
    return withCors(request, env, await handleLogout(request, env, auth?.user || null));
  }
  if (path === '/api/auth/me' && request.method === 'GET') {
    const auth = await requireAuth(request, env);
    if (!auth) return withCors(request, env, json(401, { error: 'Unauthorized' }));
    return withCors(request, env, await handleMe(auth.user));
  }
  if (path === '/api/auth/forgot-password' && request.method === 'POST') {
    return withCors(request, env, await handleForgotPassword(request, env));
  }
  if (path === '/api/auth/reset-password' && request.method === 'POST') {
    return withCors(request, env, await handleResetPassword(request, env));
  }

  // User management (admin-scoped; self-read is allowed)
  if (path === '/api/users' && request.method === 'GET') {
    const auth = await requireAuth(request, env);
    if (!auth) return withCors(request, env, json(401, { error: 'Unauthorized' }));
    return withCors(request, env, await handleListUsers(request, env, auth.user));
  }
  if (path === '/api/users' && request.method === 'POST') {
    const auth = await requireAuth(request, env);
    if (!auth) return withCors(request, env, json(401, { error: 'Unauthorized' }));
    return withCors(request, env, await handleCreateUser(request, env, auth.user));
  }
  const userMatch = path.match(/^\/api\/users\/([^/]+)$/);
  if (userMatch && request.method === 'GET') {
    const auth = await requireAuth(request, env);
    if (!auth) return withCors(request, env, json(401, { error: 'Unauthorized' }));
    return withCors(request, env, await handleGetUser(env, decodeURIComponent(userMatch[1]), auth.user));
  }
  if (userMatch && (request.method === 'PATCH' || request.method === 'PUT')) {
    const auth = await requireAuth(request, env);
    if (!auth) return withCors(request, env, json(401, { error: 'Unauthorized' }));
    return withCors(request, env, await handleUpdateUser(request, env, decodeURIComponent(userMatch[1]), auth.user));
  }
  if (userMatch && request.method === 'DELETE') {
    const auth = await requireAuth(request, env);
    if (!auth) return withCors(request, env, json(401, { error: 'Unauthorized' }));
    return withCors(request, env, await handleDeleteUser(request, env, decodeURIComponent(userMatch[1]), auth.user));
  }

  // Uploads
  if (path === '/api/upload' && request.method === 'POST') {
    const auth = await requireAuth(request, env);
    if (!auth) return withCors(request, env, json(401, { error: 'Unauthorized' }));
    return withCors(request, env, await handleUpload(request, env, auth.user));
  }

  // Generic records
  const recordMatch = path.match(/^\/api\/db\/([^/]+)(?:\/([^/]+))?$/);
  if (recordMatch) {
    const auth = await requireAuth(request, env);
    if (!auth) return withCors(request, env, json(401, { error: 'Unauthorized' }));
    const store = decodeURIComponent(recordMatch[1]);
    const id = recordMatch[2] ? decodeURIComponent(recordMatch[2]) : undefined;
    if (!ALLOWED_STORES.has(store)) return withCors(request, env, json(400, { error: `Unknown store: ${store}` }));
    if (id) {
      if (request.method === 'GET') return withCors(request, env, await getRecord(store, id, env, auth.user));
      if (request.method === 'PATCH' || request.method === 'PUT' || request.method === 'DELETE') {
        return withCors(request, env, await updateOrDeleteRecord(store, id, request, env, auth.user));
      }
    } else {
      if (request.method === 'GET') return withCors(request, env, await getRecords(store, request, env, auth.user));
      if (request.method === 'POST') return withCors(request, env, await createRecord(store, request, env, auth.user));
    }
  }

  return withCors(request, env, json(404, { error: 'Not found' }));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      console.error('[ocean-stride-api]', error);
      return withCors(request, env, json(500, { error: 'Internal server error', requestId: randomHex(8) }));
    }
  },

  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    // Clean up expired and revoked sessions.
    await env.DB.prepare('DELETE FROM sessions WHERE expires_at < datetime(\'now\') OR revoked = 1').run();
  },
};
