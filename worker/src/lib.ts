/**
 * Core helpers: ids, PBKDF2 passwords, JWT (HS256), time, serialization.
 * WebCrypto only - runs on Cloudflare Workers as-is.
 */
import type { Env } from './env';

const enc = new TextEncoder();

export type Row = Record<string, unknown>;

/* ------------------------------------------------------------------ */
/* IDs & time                                                          */
/* ------------------------------------------------------------------ */

export const oid = (): string => {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const randomHex = (bytes = 32): string => {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const nowIso = (): string => new Date().toISOString();

/* ------------------------------------------------------------------ */
/* Base64 / JSON helpers                                               */
/* ------------------------------------------------------------------ */

export const toBase64 = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};

export const fromBase64 = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

export const toB64Url = (buf: Uint8Array | ArrayBuffer): string => {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return toBase64(arr.buffer as ArrayBuffer)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

export const fromB64Url = (s: string): Uint8Array => {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return fromBase64(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
};

export const readJson = async (
  c: { req: { json: () => Promise<unknown> } }
): Promise<Record<string, unknown>> => {
  try {
    const body = await c.req.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Row) : {};
  } catch {
    return {};
  }
};

/* ------------------------------------------------------------------ */
/* Passwords - PBKDF2-SHA256, stored as pbkdf2$iter$salt$hash          */
/* ------------------------------------------------------------------ */

const PBKDF2_ITERATIONS = 100_000;

export const hashPassword = async (password: string): Promise<string> => {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const bits = await deriveBits(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt.buffer as ArrayBuffer)}$${toBase64(bits)}`;
};

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  try {
    const [scheme, iterRaw, saltB64, hashB64] = String(stored).split('$');
    if (scheme !== 'pbkdf2') return false;
    const iterations = Math.min(Math.max(parseInt(iterRaw, 10) || 0, 10_000), 1_000_000);
    const salt = fromBase64(saltB64);
    const expected = fromBase64(hashB64);
    const bits = new Uint8Array(await deriveBits(password, salt, iterations));
    if (bits.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
};

const deriveBits = (
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<ArrayBuffer> =>
  crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']).then((key) =>
    crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
      key,
      256
    )
  );

/* ------------------------------------------------------------------ */
/* JWT - HS256                                                         */
/* ------------------------------------------------------------------ */

const base64UrlJson = (obj: unknown): string => toB64Url(enc.encode(JSON.stringify(obj)));

export const signJwt = async (
  payload: Record<string, unknown>,
  secret: string,
  ttlSeconds: number
): Promise<string> => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSeconds };
  const data = `${base64UrlJson(header)}.${base64UrlJson(body)}`;
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return `${data}.${toB64Url(sig)}`;
};

export const verifyJwt = async <T = Row>(
  token: string,
  secret: string
): Promise<(T & { exp?: number; iat?: number }) | null> => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const ok = await crypto.subtle.verify(
      'HMAC',
      key,
      fromB64Url(parts[2]),
      enc.encode(`${parts[0]}.${parts[1]}`)
    );
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64Url(parts[1]))) as T & {
      exp?: number;
    };
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

/* ------------------------------------------------------------------ */
/* Serialization helpers                                               */
/* ------------------------------------------------------------------ */

const camel = (k: string): string => k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

export const toApi = (row: Row): Row => {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) out[camel(k)] = v;
  if (out.id !== undefined) out._id = out.id;
  return out;
};

export const parseJsonField = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

export const parseIntParam = (v: string | undefined, fallback: number): number => {
  const n = parseInt(v || '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const likeAll = (columns: string[], q: string): { sql: string; params: unknown[] } => {
  const opt = (columns.length > 0 ? columns : ['name']).join(', ');
  if (columns.length === 1) {
    return { sql: `${columns[0]} LIKE ?`, params: [`%${q}%`] };
  }
  const groups: string[] = [];
  const params: unknown[] = [];
  for (const col of opt.split(', ').map((s) => s.trim())) {
    groups.push(`${col} LIKE ?`);
    params.push(`%${q}%`);
  }
  return { sql: `(${groups.join(' OR ')})`, params };
};