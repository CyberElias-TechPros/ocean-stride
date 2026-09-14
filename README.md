# Ocean Stride

**Every vessel. Every person. One horizon.**

A maritime operations workspace for small fleet operators: vessel management, crew records, current assignments, primary certificate expiry, and an auditable operations log. React + TypeScript on Vercel, with a Cloudflare Worker API and D1 relational storage.

## Release status

The core workflows are implemented and locally verified against real Workers/D1 emulation. This is a **production-oriented pilot foundation**, not a completed enterprise crewing suite or a compliance certification. Cloud deployment has not been performed. Payroll, recruitment, document storage, multi-user invitations, password recovery, and live tracking are **not implemented in this release**.

There was no active Supabase integration to migrate. The previous runtime used conflicting IndexedDB implementations and client-side fake authentication. It is preserved in `legacy/`, outside the deployed application. Original data is untouched; importing it requires the reviewed migration described below.

## What works

- A clearly labeled, read-only illustrative preview, available without credentials.
- Create an owner account and an empty, tenant-isolated workspace; sign in and sign out.
- Add, edit, search, filter, and delete vessels and crew.
- Validate IMO checksums, capacity, email, rank, status, and dates on the server.
- Assign/reassign/sign off crew with atomic capacity constraints and ownership checks.
- Monitor primary certificates due within 30 days, using UTC calendar dates.
- Export fleet and crew CSV reports with formula-injection protection.
- Audit successful mutations; failed writes do not produce success events.
- Optimistic version checks and idempotent create retries.
- Responsive navigation, keyboard dialogs, reduced-motion support, and local fonts/assets.

## Local development

Use Node.js **22** and npm. No Cloudflare login is required for local development.

```sh
npm ci
npm run db:local
# Terminal 1
npm run dev:api
# Terminal 2
npm run dev
```

Open `http://localhost:8080`. Explore the preview, or click **Create workspace** and register with a unique email and a password of at least 12 characters. There are no default passwords or production demo accounts. In embedded previews, authentication opens a new tab so first-party session cookies work without weakening browser protections. Local data is stored by Wrangler in ignored `.wrangler/state/`.

The browser uses relative `/api` requests. Vite proxies them to the local Worker; do not put localhost service URLs into browser code. Development servers bind to `0.0.0.0`, including Arena preview support.

## Verification

```sh
npm run type-check
npm run lint
npm run test             # domain and gateway unit tests
npm run build           # strict TypeScript + production Vite build
npm run check:worker     # production Worker dry-run; no cloud resources modified
npx playwright install --with-deps chromium
npm run test:e2e         # starts local services if needed
npm audit
```

Browser tests create isolated local test workspaces. Never point them at production. An optional `npm run test:e2e:bundled` command extracts and uses npm-distributed Chromium and support libraries on restricted Linux environments; standard Playwright Chromium is preferred in CI. See the report for the exact sandbox verification and limitations.

## Architecture

```text
Browser
  └─ Vercel static React frontend
       └─ /api/* → Vercel edge gateway (no business logic or storage)
            └─ Cloudflare Worker (authentication, authorization, validation)
                 └─ D1 (organizations, users, sessions, vessels, crew,
                        audit events, rate limits, idempotency keys)
                 └─ Cron (expired session/rate-limit/idempotency cleanup)
```

Only Workers, D1, and Cron are used. R2, KV, Queues, and Durable Objects are not justified by the supported workflows. R2 should be added when authenticated document uploads are actually implemented, not represented by a mock upload button.

## Project structure

| Path                 | Purpose                                                                            |
| -------------------- | ---------------------------------------------------------------------------------- |
| `src/`               | Active React workspace, visual system, forms, API client, explicit preview fixture |
| `shared/domain.ts`   | Runtime validation and domain contracts shared with the Worker                     |
| `worker/index.ts`    | Cloudflare API, sessions, tenant authorization, business rules                     |
| `worker/migrations/` | Append-only D1 migrations                                                          |
| `api/proxy.ts`       | Allowlisted, same-origin Vercel-to-Worker gateway                                  |
| `tests/`             | Unit, real local API, browser, and automated accessibility tests                   |
| `docs/`              | Deployment, data migration, architecture decisions, and verification report        |
| `legacy/`            | Unsafe historical source, retained for reference, not built or supported           |

## Security and operational boundaries

- Random opaque sessions stored only as SHA-256 hashes in D1; HttpOnly, SameSite=Lax cookies, with Secure in production; seven-day absolute expiry and logout invalidation.
- Passwords use unique salts and Web Crypto PBKDF2-SHA256, 100,000 iterations (Workers Web Crypto iteration ceiling); authentication attempts are rate-limited. This is not an independently audited identity platform.
- Every data query is tenant-scoped; the client cannot grant roles or choose an organization ID. Only workspace-owner access exists today.
- Production Workers require a shared gateway secret and an exact permitted browser origin. No wildcard production CORS.
- Mutations are bounded to 16 KiB; prepared SQL, constraints, transactions, version checks, and create idempotency protect integrity.
- No service worker caches private data. Fonts and imagery are self-hosted. CSV exports contain personal information and must be protected by the operator.
- Metadata is intentionally `noindex`: this is a private operations application, not a public content directory. No invented canonical, prices, ratings, or sitemap entries.

## Deploy and migrate

- [Deployment and operations](docs/DEPLOYMENT.md)
- [Data preservation and legacy migration](docs/MIGRATION.md)
- [API contract](docs/API.md)
- [Product reconstruction, decision ledger, and exact verification](docs/RECONSTRUCTION_REPORT.md)

No deployment credentials are stored in this repository. The generated hero illustration is AI-created maritime imagery; the route chart and demo vessels are illustrative, not AIS telemetry or navigation aids.
