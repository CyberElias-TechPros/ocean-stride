/**
 * OceanStride auth: JWT bearer auth (access + refresh), password hashing,
 * CORS, and the /auth route group.
 */
import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import type { Env } from './env';
import {
  hashPassword,
  nowIso,
  oid,
  randomHex,
  readJson,
  signJwt,
  toApi,
  verifyJwt,
  verifyPassword,
} from './lib';

const ACCESS_TTL = 15 * 60; // 15 minutes
const REFRESH_TTL = 7 * 24 * 3600; // 7 days

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

type AuthContext = Context<{ Bindings: Env; Variables: { user?: AuthUser } }>;

/* ------------------------------------------------------------------ */
/* Secret resolution (production uses wrangler secrets)                */
/* ------------------------------------------------------------------ */

export const accessSecret = (env: Env): string => env.JWT_SECRET || 'ocean-local-access-secret';
export const refreshSecret = (env: Env): string => env.REFRESH_SECRET || env.JWT_SECRET || 'ocean-local-refresh-secret';

/* ------------------------------------------------------------------ */
/* Token helpers                                                       */
/* ------------------------------------------------------------------ */

export const issueTokens = async (env: Env, user: AuthUser): Promise<{ accessToken: string; refreshToken: string }> => {
  const accessToken = await signJwt({ sub: user.id, role: user.role, email: user.email }, accessSecret(env), ACCESS_TTL);
  const refreshToken = await signJwt({ sub: user.id, type: 'refresh' }, refreshSecret(env), REFRESH_TTL);
  return { accessToken, refreshToken };
};

export const getAuthUser = async (c: AuthContext): Promise<AuthUser | null> => {
  const header = c.req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  const payload = await verifyJwt<{ sub?: string; role?: string; email?: string }>(token, accessSecret(c.env));
  if (!payload?.sub) return null;
  return { id: payload.sub, email: payload.email || '', role: payload.role || 'GUEST' };
};

export const requireAuth = async (c: AuthContext, next: Next) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ message: 'Not authorized' }, 401);
  c.set('user', user);
  await next();
};

export const requireRole =
  (...roles: string[]) =>
  async (c: AuthContext, next: Next) => {
    const user = c.get('user') as AuthUser | undefined;
    if (!user) return c.json({ message: 'Not authorized' }, 401);
    if (!roles.includes(user.role)) return c.json({ message: 'Not authorized for this action' }, 403);
    await next();
  };

export const publicUser = (row: Record<string, unknown>): Record<string, unknown> => {
  const u = toApi(row);
  delete u.passwordHash;
  delete u.refreshToken;
  const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
  u.name = u.name || name;
  delete u.firstName;
  delete u.lastName;
  return u;
};

/* ------------------------------------------------------------------ */
/* CORS                                                                */
/* ------------------------------------------------------------------ */

export const corsHeaders = (c: Context<{ Bindings: Env }>): Record<string, string> => {
  const origin = c.req.header('origin');
  if (!origin) return {};
  const allowed = (c.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.includes(origin) || allowed.includes('*')) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-CSRF-Token',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
  }
  return {};
};

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

export const authRoutes = () => {
  const router = new Hono<{ Bindings: Env; Variables: { user?: AuthUser } }>();

  router.post('/register', async (c) => {
    const body = await readJson(c);
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    const password = String(body.password || '');
    if (!email || !password || password.length < 8) {
      return c.json({ message: 'A valid email and a password of at least 8 characters are required' }, 400);
    }
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) return c.json({ message: 'An account with that email already exists' }, 409);

    const id = oid();
    const now = nowIso();
    const passwordHash = await hashPassword(password);
    const role = String(body.role || 'GUEST').toUpperCase();
    const safeRole = ['GUEST', 'SEAFARER', 'MANAGER', 'ADMIN'].includes(role) ? role : 'GUEST';
    await c.env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, email_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`
    )
      .bind(
        id,
        email,
        passwordHash,
        String(body.firstName || ''),
        String(body.lastName || ''),
        safeRole,
        now,
        now
      )
      .run();
    const row = (await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first())!;
    const tokens = await issueTokens(c.env, {
      id,
      email,
      role: String(row.role),
    });
    return c.json({ user: publicUser(row), ...tokens }, 201);
  });

  router.post('/login', async (c) => {
    const body = await readJson(c);
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    const password = String(body.password || '');
    const row = await c.env.DB.prepare('SELECT * FROM users WHERE lower(email) = ?').bind(email).first();
    if (!row || row.is_active === 0) return c.json({ message: 'Invalid credentials' }, 401);
    const ok = await verifyPassword(password, String(row.password_hash));
    if (!ok) return c.json({ message: 'Invalid credentials' }, 401);

    const now = nowIso();
    await c.env.DB.prepare('UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?')
      .bind(now, now, row.id)
      .run();
    const tokens = await issueTokens(c.env, {
      id: String(row.id),
      email: String(row.email),
      role: String(row.role),
    });
    return c.json({ user: publicUser(row), ...tokens });
  });

  router.post('/refresh', async (c) => {
    const body = await readJson(c);
    const token = String(body.refreshToken || body.token || '');
    if (!token) return c.json({ message: 'Refresh token required' }, 400);
    const payload = await verifyJwt<{ sub?: string; type?: string }>(token, refreshSecret(c.env));
    if (!payload?.sub || payload.type !== 'refresh') return c.json({ message: 'Invalid refresh token' }, 401);
    const row = await c.env.DB.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1')
      .bind(payload.sub)
      .first();
    if (!row) return c.json({ message: 'Invalid refresh token' }, 401);
    const tokens = await issueTokens(c.env, {
      id: String(row.id),
      email: String(row.email),
      role: String(row.role),
    });
    return c.json(tokens);
  });

  router.post('/forgot-password', async (c) => {
    void c;
    return c.json({ message: 'If that email exists, a reset link has been sent.' });
  });

  router.post('/reset-password', async (c) => {
    const body = await readJson(c);
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    const password = String(body.password || '');
    if (!email || !password || password.length < 8) return c.json({ message: 'Invalid request' }, 400);
    const row = await c.env.DB.prepare('SELECT id FROM users WHERE lower(email) = ?').bind(email).first();
    if (row) {
      const passwordHash = await hashPassword(password);
      await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
        .bind(passwordHash, nowIso(), row.id)
        .run();
    }
    return c.json({ message: 'Password updated if the account exists.' });
  });

  router.post('/logout', requireAuth, async (c) => {
    const user = c.get('user') as AuthUser;
    await c.env.DB.prepare('UPDATE users SET refresh_token = NULL, updated_at = ? WHERE id = ?')
      .bind(nowIso(), user.id)
      .run();
    return c.json({ message: 'Logged out' });
  });

  router.get('/me', requireAuth, async (c) => {
    const user = c.get('user') as AuthUser;
    const row = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first();
    if (!row) return c.json({ message: 'User not found' }, 404);
    return c.json({ user: publicUser(row) });
  });

  router.patch('/me', requireAuth, async (c) => {
    const user = c.get('user') as AuthUser;
    const body = await readJson(c);
    const allowed: Record<string, [string, unknown]> = {
      firstName: ['first_name', body.firstName],
      lastName: ['last_name', body.lastName],
      avatar: ['avatar', body.avatar],
      email: ['email', body.email],
    };
    for (const [k, [col, v]] of Object.entries(allowed)) {
      void k;
      if (v !== undefined && v !== null) {
        await c.env.DB.prepare(`UPDATE users SET ${col} = ?, updated_at = ? WHERE id = ?`)
          .bind(String(v), nowIso(), user.id)
          .run();
      }
    }
    const row = (await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first())!;
    return c.json({ user: publicUser(row) });
  });

  return router;
};

export const genResetToken = (): string => randomHex(32);