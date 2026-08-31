# Ocean Stride — Audit, Hardening & Production-Readiness Report

**Scope:** full audit and repair of the legacy "Seafarer Management System" repository into a production-ready **Ocean Stride** application with a Vercel frontend and a Cloudflare Worker/D1/R2/KV backend. No AWS, Firebase, Supabase, or Heroku substitutes were used.

**Branch:** `arena/01a05975-ocean-stride`

---

## 1. Assessment

The original application was a large client-side app with:

- IndexedDB as the primary data store and no real server backend.
- Fake, hard-coded demo accounts, mock dashboard activity, and hard-coded sample/settings data.
- Two competing auth implementations (React context + Zustand store) and two company stores, so the actual authenticated user was never plumbed into most screens.
- A registration/login flow that depended on demo accounts and local-only state.
- Browser-facing code using `process.env`, which throws `ReferenceError` at runtime in a bundled Vite app.
- A misleading offline/PWA story, stale Google OAuth wiring, and legacy Next.js/Prisma artifacts in the repo.
- Browser-side "security" (blocking context menu / drag-and-drop) that degraded usability without providing defence.
- No real backend security model (auth, roles, company scoping, rate limiting, CORS).

**Architecture after the pass:**

- **Frontend:** React 18 + TypeScript + Vite, deployed to Vercel as a static bundle.
- **Backend:** Cloudflare Worker (`worker/`) exposing a versioned REST API under `/api`.
- **Data:** Cloudflare D1 (`DB` binding) for structured records, KV for rate limiting, R2 for uploaded documents/images.
- **Auth:** email + password accounts in D1; PBKDF2 password hashing (100k iterations), JWT access tokens, hashed refresh tokens, KV rate limiting, role-based access control.
- **Data layer:** `src/lib/database-service.ts` is the single canonical transport. It talks to the Worker when `VITE_API_BASE_URL` is set (or `/api` is proxied in dev) and only uses IndexedDB when explicitly opted into with `VITE_REMOTE_DB=false`.

---

## 2. Problems Found & Fixes

### Runtime-blocking issues
- **`process.env.NODE_ENV` in client code** (`src/lib/security.ts`, `src/lib/error-handler.ts`, `src/components/error-boundary.tsx`) would throw `ReferenceError` in a browser bundle. Replaced with Vite's `import.meta.env.PROD` / `DEV`.
- **Remote mode never initialized:** `db.init()` is intentionally a no-op in remote mode, but `main.tsx` then checked `db.isInitialized()` and failed the whole app. The check now only requires IndexedDB when remote mode is disabled.
- **Silent infinite loop in `runMigrationIfNeeded()`:** in remote mode `db.isInitialized()` is always false, so the migration check polled forever and the splash never resolved. The migration now early-returns when remote mode is enabled.
- **Refresh token endpoint mismatch:** the frontend called `POST /auth/refresh-token`, but the Worker implements `POST /auth/refresh`. The client now calls the Worker route, so silent 401s after token expiry are fixed.

### Authentication & identity
- Added a real **registration flow** (`Worker POST /api/auth/register`, `RegisterPage`, `/register` route). The first account becomes the organisation admin; later accounts require an authenticated admin.
- Removed all demo/Google OAuth accounts and the OAuth config. `AuthContext` now only creates a session when the Worker returns a valid user.
- Fixed `Index.tsx` and `DatabaseContext.tsx` to read the authenticated user from the single `AuthContext` (they previously read a never-populated Zustand store).

### Company/scoping consistency
- Removed the duplicate Zustand `use-company` store; `Index`, `RankManagement`, and `AddSeafarerDialog` now use the same `CompanyContext` as every other screen.
- `CompanyProvider` now loads companies once per authenticated session, prefers the authenticated user's `companyId`, then the saved selection, then the first visible company.
- The Worker enforces company access on every record read/write, so a user cannot read another company's records through `/api/db`.

### Mock / placeholder data
- Removed hard-coded demo activities and `+X%` trends from the dashboard; `RecentActivity` is now derived from real seafarer, vessel, and payroll records.
- Removed the `default-company` fallback used by Settings; it now uses the real selected company id.
- Removed a committed local Prisma `dev.db` and the legacy Prisma migration folder; backend state now lives only in Cloudflare D1.
- Removed unused `@prisma/client` dependency.

### Perf/security hygiene
- **CSP:** `index.html` now declares a CSP that allows the deployed Worker origin through `connect-src 'self' https:` and removes the stale Google Identity Services script.
- **Worker CORS:** explicit `ALLOWED_ORIGINS` with `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials`, and security headers.
- **Rate limiting:** KV-backed auth rate limiting on login/register.
- **Audit logging:** sensitive worker mutations (`user.*`, `auth.*`, `record.*`) are written to an `audit_logs` table.
- **Client bundle:** removed dead Next.js pages, unused auth/database hooks, and duplicate/unused services where safe; lazy routes are kept.
- **Secrets:** `worker/.dev.vars` is git-ignored; a `.dev.vars.example` documents the required `AUTH_SECRET`/`RESET_SECRET` variables. `AUTH_SECRET` is also mandatory in `Env` — worker startup now fails at runtime if it is missing rather than signing JWTs with an empty key.

### Repo cleanup
- Removed legacy ESLint config that conflicted with the flat config, obsolete `*.eslintrc*/.eslintignore`.
- Added `worker/.wrangler/`, `*.db`, `*.sqlite*`, `*.tsbuildinfo`, and `worker/.dev.vars` to `.gitignore`.
- Rebranded assets/meta to Ocean Stride and added `public/ocean-stride-icon.png`.

---

## 3. Architecture Changes

| Area | Before | After |
| --- | --- | --- |
| Auth | demo/Gmail + localStorage state | Worker JWT + PBKDF2 + refresh tokens, RBAC |
| Data | IndexedDB everywhere | Cloudflare D1 through canonical DB service |
| Records | no tenant boundary | company-scoped reads/writes on the Worker |
| Uploads | not implemented | Worker `/api/upload` → R2 |
| Rate limit | client-side counters (easy to bypass) | KV-backed server-side limiter |
| Companies | two conflicting stores | one `CompanyContext`, user-aware selection |
| PWA | service worker + misleading offline claims | real Worker-backed API; service worker still serves cached app shell |
| Deploy | unclear/mixed | `docs/DEPLOYMENT.md` + worker scripts |

### Worker API surface
- `GET /api/health`
- `POST /api/auth/register|login|refresh|logout|forgot-password|reset-password`
- `GET /api/auth/me`
- `POST /api/upload`
- `GET/POST /api/db/:store`, `GET/PATCH/DELETE /api/db/:store/:id`
- `GET/POST /api/users`, `GET/PATCH/DELETE /api/users/:id` (admin-gated)

---

## 4. Security & Performance Improvements

- PBKDF2 hashing with per-user random salt (100,000 iterations).
- Access + refresh token separation; refresh tokens stored hashed (SHA-256) in D1 and rotated on refresh.
- `Bearer` tokens are read server-side; no client-only auth decisions are trusted for data access.
- Company access control is enforced on the Worker for every record operation.
- CORS is restricted to configured origins; credentials only returned for an exact allowed origin.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `no-store` on API responses.
- Audit logging for user/auth/record mutations.
- `VITE_REMOTE_DB` defaults to remote mode, so a production build no longer depends on local demo data.
- Code-splitting retained; large chunks flagged as a remaining bundle-size opportunity.

---

## 5. Testing

All commands pass in the repository root:

```bash
npx tsc --noEmit                 # 0 errors
npm run build                    # success (chunk-size warnings only)
npm run lint                     # 0 errors, 259 warnings (mostly no-explicit-any)
npm --prefix worker run typecheck  # 0 errors
```

Manual smoke tests performed against the local Worker + Vite proxy:

- `GET /api/health` returns `ok: true`.
- Registering the first account creates the organisation admin; subsequent non-admin registrations are rejected.
- `POST /api/auth/login` returns access/refresh tokens and a user.
- `GET /api/auth/me` returns the authenticated user; unauthenticated calls return `401`.

---

## 6. Remaining Issues / Known Gaps

1. **`npm audit`:** from 32 advisories down to **11 (6 moderate, 5 high)**. The remaining fixes are all non-patch upgrades:
   - `react-router-dom@7.x` (breaking, moderate runtime open-redirect advisory),
   - `vite@8.x` (breaking, moderate advisory in build tooling),
   - `wrangler@4.x` (breaking; resolves high `undici`/`ws`/`sharp` advisories in the local dev toolchain).
   They can be completed in a dedicated follow-up upgrade. Deploying the Worker uses the Cloudflare-managed runtime edge, so the dev-time `undici`/`ws`/`sharp` advisories do not ship to the frontend.
2. **Bundle size:** the two largest chunks (`index` ~550 kB, `Analytics` ~479 kB) exceed Vite's 500 kB warning. Recommended follow-up: manual chunk splitting for vendor libs and lazy-loading Recharts.
3. **`Analytics`/`Recruitment` UI:** predictive insight copy and candidate workflow labels are still partly opinionated; data comes from real records, but the "insight" calculations (e.g. 5% cost savings assumption) are estimates and should be labelled as such.
4. **Default rank/position lists:** Recruitment ships a static position dropdown. This is a controlled vocabulary, not sample data, but should be configurable per company in a future pass.
5. **Wrangler v3** is the local dev tool; upgrading to v4 is tracked as a future dependency task.
6. **Password reset email delivery** is implemented as a generic response token flow; a production mail provider or a Cloudflare Email Worker integration should be added for actual delivery.

---

## 7. Deployment Instructions

Follow **`docs/DEPLOYMENT.md`** for the full guide, including `wrangler secret put AUTH_SECRET`/`RESET_SECRET`, migration (`wrangler d1 migrations apply ocean-stride --remote`), CORS `ALLOWED_ORIGINS`, and Vercel env vars. Summary:

1. **Cloudflare:** `cd worker && npm install`
2. **Create resources:** D1 `ocean-stride`, KV namespace, R2 bucket `ocean-stride-assets`; paste ids into `worker/wrangler.toml`.
3. **Set secrets:** `wrangler secret put AUTH_SECRET`, `wrangler secret put RESET_SECRET`.
4. **Migrate:** `npm run worker:migrate:remote`.
5. **Deploy:** `npm run worker:deploy`.
6. **Vercel:** import the repo, build with `npm run build`, set `VITE_API_BASE_URL=https://<worker>.workers.dev`.
7. **CORS:** set `ALLOWED_ORIGINS=https://<your-vercel-domain>` and redeploy the Worker.
