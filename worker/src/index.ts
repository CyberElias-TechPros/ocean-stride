/**
 * OceanStride API - Cloudflare Worker (Hono + D1 + KV file blobs).
 * All routes are served under /api to match the frontend's axios baseURL.
 */
import { Hono } from 'hono';
import type { Env } from './env';
import { corsHeaders } from './auth';
import { authRoutes } from './auth';
import { crewRoutes, documentRoutes, reportRoutes, uploadRoutes, userRoutes, vesselRoutes } from './entities';

const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    const headers = corsHeaders(c);
    return new Response(null, { status: 204, headers });
  }
  await next();
  const headers = corsHeaders(c);
  for (const [k, v] of Object.entries(headers)) c.res.headers.set(k, v);
});

app.use('*', async (c, next) => {
  await next();
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('X-Frame-Options', 'DENY');
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
});

app.route('/api/auth', authRoutes());
app.route('/api/users', userRoutes());
app.route('/api/crew', crewRoutes());
app.route('/api/vessels', vesselRoutes());
app.route('/api/fleet/vessels', vesselRoutes());
app.route('/api/documents', documentRoutes());
app.route('/api/uploads', uploadRoutes());
app.route('/api/reports', reportRoutes());

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    service: 'ocean-stride-api',
    time: new Date().toISOString(),
    database: 'connected',
  })
);

app.get('/', (c) =>
  c.json({
    name: 'OceanStride API',
    stack: 'Cloudflare Workers + D1 + KV',
    health: '/api/health',
  })
);

app.notFound((c) => c.json({ message: 'Not found' }, 404));

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ message: 'Something went wrong!' }, 500);
});

export default {
  fetch: app.fetch,
};