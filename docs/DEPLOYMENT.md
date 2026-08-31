# Ocean Stride Production Deployment

Ocean Stride is deployed as two independently hosted parts:

| Part | Host | Output |
| --- | --- | --- |
| Frontend | Vercel | `dist/` from `npm run build` |
| Backend API | Cloudflare Workers | `worker/src/index.ts` with D1, R2, KV, Cron |

There is no AWS, Firebase, Supabase, or Heroku dependency.

---

## 1. Backend: Cloudflare Worker

### 1.1 Create Cloudflare resources

```bash
cd worker
npm install

# D1 database
npx wrangler d1 create ocean-stride

# KV namespace (rate limiting / cache)
npx wrangler kv namespace create KV

# R2 bucket (uploads)
npx wrangler r2 bucket create ocean-stride-assets
```

Take the printed `database_id` and `id` and paste them into `worker/wrangler.toml`.

### 1.2 Set secrets

```bash
# At least 32 random bytes
npx wrangler secret put AUTH_SECRET

# Optional, used for password reset tokens. Falls back to AUTH_SECRET.
npx wrangler secret put RESET_SECRET
```

`AUTH_SECRET` is the HMAC signing secret for access tokens. Rotate it in an
emergency; rotating it will invalidate all current sessions.

### 1.3 Apply migrations

Local:
```bash
npm run worker:migrate:local   # or cd worker && npx wrangler d1 migrations apply DB --local
```

Production:
```bash
npm run worker:migrate:remote  # or cd worker && npx wrangler d1 migrations apply DB --remote
```

### 1.4 Configure CORS

`worker/wrangler.toml`:

```toml
[vars]
ENVIRONMENT = "production"
ALLOWED_ORIGINS = "https://your-frontend.vercel.app"
```

Add every frontend origin that should be allowed to call the API.

### 1.5 Deploy

```bash
npm run worker:deploy   # or cd worker && npx wrangler deploy
```

The Worker exposes:

- `GET /api/health`
- `POST /api/auth/register | login | refresh | logout | forgot-password | reset-password`
- `GET /api/auth/me`
- `GET/POST /api/users`, `GET/PATCH/DELETE /api/users/:id`
- `GET/POST /api/db/:store`, `GET/PATCH/PUT/DELETE /api/db/:store/:id`
- `POST /api/upload`, `GET /api/upload/:key`

### 1.6 Cron

A scheduled handler runs automatically to purge expired/revoked sessions.
Configure a Cron Trigger in the Cloudflare dashboard or in `wrangler.toml`:

```toml
[triggers]
crons = ["0 3 * * *"]
```

---

## 2. Frontend: Vercel

1. Import the repository into a new Vercel project.
2. Root directory: repo root.
3. Framework preset: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Environment variables:
   - `VITE_API_BASE_URL=https://ocean-stride-api.your-subdomain.workers.dev`
   - `VITE_REMOTE_DB=true`
   - `VITE_ENABLE_DEMO_MODE=false`

The frontend never stores authoritative business data in browser-only storage
in production; it routes reads/writes through the Worker-backed data layer.

---

## 3. Local development

### 3.1 Worker

```bash
cd worker
npm install
npx wrangler d1 migrations apply DB --local
npm run dev
```

The local Worker listens on `http://localhost:8787`.

### 3.2 Vite dev server

The Vite config proxies `/api` to the local Worker. Copy `.env.example` to
`.env`; leave `VITE_API_BASE_URL` unset so Vite uses the proxy.

```bash
npm install
npm run dev
```

---

## 4. Release validation

Run these from the repository root before merging to production:

```bash
npm install
npm run type-check
npm run lint
npm run build
npm run worker:typecheck
```

Expected result: typecheck 0 errors, lint 0 errors (warnings are accepted and
tracked), Vite build succeeds, Worker typecheck 0 errors.

---

## 5. Operational notes

- The Worker uses PBKDF2 (100k iterations) for password hashing.
- Refresh tokens are stored hashed in the D1 `sessions` table and rotated on
  every refresh.
- Access tokens are short-lived (1h, HS256) and signed with `AUTH_SECRET`.
- Rate limiting uses KV; uploads are capped at 10 MB.
- Audit logs are written to the D1 `audit_logs` table for admin/auth actions.
- The scheduled Cron job deletes expired/revoked sessions.
