# Deployment and operations

## Status and prerequisites

The frontend builds and the production Worker bundles successfully in a dry-run. **Remote D1, Vercel routing, production cookies, custom domains, and cloud availability have not been exercised.** Local Wrangler tests are not a substitute for a staging release.

Required: Node 22, a Vercel project, a Cloudflare Workers account with D1, and permission to configure their environment variables. Keep separate projects/databases/secrets for preview and production. Do not deploy the `legacy/` application.

## 1. Create a production D1 database

```sh
npm ci
npx wrangler login
npx wrangler d1 create ocean-stride-production
```

Copy the returned database ID into `env.production.d1_databases[0].database_id` in `wrangler.jsonc`. The committed value is deliberately a placeholder. Set `env.production.vars.APP_ORIGIN` to the exact frontend origin (for example, `https://your-actual-domain.example`, with no trailing slash). Do not use a wildcard.

Production and local bindings are separate. The zero ID at the top level is a local-emulation placeholder, not a production database.

## 2. Create a shared gateway secret

Generate a long random secret in your password/secrets manager (at least 32 random bytes). Set the same value in:

```sh
npx wrangler secret put INTERNAL_PROXY_SECRET --env production
```

and Vercel's **server-side** environment variable `INTERNAL_PROXY_SECRET`. Never prefix it with `VITE_`, paste it into chat, or commit it. The browser never receives this secret. The Worker rejects direct production API requests without it.

## 3. Apply migrations and deploy the Worker

For an existing D1 database, export a backup first (see recovery below).

```sh
npx wrangler d1 migrations apply ocean-stride-production --remote --env production
npm run check:worker
npm run deploy:api
```

Record the deployed HTTPS Worker origin. Add it to the Vercel server-side environment variable `API_WORKER_ORIGIN`, e.g. `https://your-worker.your-account.workers.dev`. Use only an origin, with no path, query, credentials, or fragment. Database migrations are **not** applied automatically by deploying the Worker.

`npm run deploy:api` always selects the production environment. Local work uses `npm run dev:api`. The Worker refuses incomplete production configuration; a successful dry-run does not imply a database ID or domain was verified.

## 4. Deploy Vercel

Import this repository into Vercel, using the repository root:

- Framework: Vite
- Node version: 22
- Install command: `npm ci`
- Build command: `npm run build`
- Output: `dist`
- Server environment: `API_WORKER_ORIGIN` and `INTERNAL_PROXY_SECRET`

The committed `vercel.json` routes `/api/*` to `api/proxy.ts` before the SPA fallback. This gateway only forwards allowlisted API paths and headers, enforces an HTTPS upstream, rejects redirects, forwards cookies, and forces `no-store`. All business logic remains in the Worker.

Security headers disallow embedding in production. This is intentional; Arena's development preview uses a separate Vite configuration without production frame restrictions. The production CSP permits self-hosted scripts, fonts, images, styles, and connections only; inline styles are needed for React/Radix dynamic presentation.

Vercel's trusted `x-vercel-forwarded-for` ingress value is forwarded with the gateway secret for per-client authentication throttling. Confirm real distinct client IPs at staging; if the hosting layer supplies no trusted IP, throttling conservatively groups those requests rather than trusting a spoofable client header.

## 5. Staging and preview isolation

Use a **separate Cloudflare Worker, D1 database, and gateway secret** for staging. Add an explicit `env.staging` block modeled on `env.production`, retaining `ENVIRONMENT: production` for Secure cookies and strict gateway/origin validation. Give it its own stable Vercel preview-domain alias and exact `APP_ORIGIN`. Use Vercel Preview environment variables for the staging Worker and secret.

Do not enable arbitrary preview origins against production. Per-branch ephemeral previews need matching isolated backend configuration; this is not automated in this release.

## 6. Release acceptance checks (must run on the deployed domains)

1. `GET https://YOUR-FRONTEND/api/health` returns JSON with `status: ok`, not HTML.
2. Direct calls to the Worker without the gateway secret return 403.
3. Register a dedicated staging owner, then log out and log in.
4. Verify the browser cookie is HttpOnly, Secure, SameSite=Lax, and host-only.
5. Add a vessel and a crew member, assign them, and refresh the page.
6. Test a second organization: no cross-tenant records appear; direct ID mutations fail.
7. Attempt a duplicate IMO, stale version, full-vessel assignment, and foreign-origin mutation.
8. Open every nested route directly and refresh it; verify the SPA fallback.
9. Export CSV, confirm the data, and delete the staging records safely.
10. Confirm D1 backups, Cron invocation, error logs/request IDs, and quota alerts.
11. Verify email ownership/recovery and business requirements before a broad self-service launch; those capabilities are not supplied here.

## Configuration and failure behavior

- Missing Vercel configuration → safe JSON 503, not a fake success.
- Incorrect gateway secret → Worker 403.
- Incorrect `APP_ORIGIN` → mutations 403 (reads still require sessions).
- Missing migrations → safe API error with request ID; inspect Worker logs and migration status.
- A timed-out create can be retried from the same form with the same idempotency key for seven days. Changing the payload after a successful attempt requires reopening the form.
- An update/delete with stale `version` → 409; refresh, reopen, and review the current record.
- Expired cookies → sign-in required. No offline writes or cached private records.

## Monitoring and scheduled cleanup

Workers observability is enabled. Responses carry `X-Request-Id`; internal server-error logs include the request ID and endpoint without request bodies, credentials, or personal data. Successful mutations write tenant-scoped audit events atomically in D1. The UI shows the most recent 100 events; earlier events remain in D1.

The daily Cron at **03:15 UTC** removes expired sessions, throttle buckets, and idempotency keys. It does not delete people, vessels, or audit history. Verify the production trigger after deployment. Locally:

```sh
curl http://localhost:8787/cdn-cgi/local/scheduled
```

Monitor 5xx/429 rates, D1 reads/writes/storage, Worker CPU usage (especially password derivation), and latency. Load thresholds and alert delivery have not been established in a live cloud account.

## Backup, rollback, and recovery

Before migrations:

```sh
npx wrangler d1 export ocean-stride-production --remote --env production --output /SECURE-EXTERNAL-PATH/ocean-stride-backup.sql
```

Store backups encrypted outside this checkout, with a retention/access policy appropriate for personal data. CSV exports are operational reports, **not** database backups (they omit identities, sessions, and complete audit history).

- Prefer forward-only corrective migrations. Do not edit an already-applied migration.
- Roll back frontend and Worker releases together only after verifying schema compatibility.
- Test D1 restore/time-travel procedures in staging before relying on them in production. No live restore drill was performed here.
- If a record was deleted, use a reviewed backup restore into an isolated database, then reconcile carefully. Do not overwrite current production records blindly.
- Rotate the gateway secret on both platforms in a coordinated maintenance window. Revoke compromised user sessions with an authorized D1 operation; never edit role fields client-side.

## Known launch limitations

This release has no password recovery/rotation UI, verified-email flow, MFA, multi-user invitations, organization switching, subscription controls, storage quotas, full regulatory document model, or automated legacy importer. Public registration can create isolated owner workspaces but does not prove company or email ownership. Restrict initial rollout to a controlled pilot; add a reviewed identity/recovery and abuse-management flow before broad adoption.

Workspace data is fetched as a snapshot and paginated in the client. Large-fleet server pagination and load testing remain necessary before making scalability claims. Financial/payroll logic from the old implementation has not been approved or ported.
