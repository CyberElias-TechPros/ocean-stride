# Ocean Stride — reconstruction and verification report

**Date:** 14 September 2026  
**Branch:** `arena/01a0a08b-ocean-stride`  
**Result:** a redesigned, locally verified fleet-and-crew operations foundation on Cloudflare architecture. **Not a fully migrated enterprise suite and not a remotely deployed production release.**

## A. Product reconstruction

Ocean Stride is maritime operations software for shipping-company administrators and crew managers. Its central job is to connect companies, vessels, seafarers, assignments, and compliance-related information. The historical repository also attempted payroll, recruitment, document management, users, and analytics.

- **Primary category:** fleet/crew operations and personnel management.
- **Secondary category:** compliance reminders and administrative reporting.
- **Context classification:** context-limited. A feature-heavy README existed, but implementation, schemas, routes, and tooling contradicted several claims.
- **Current supported persona:** a workspace owner responsible for their own company's fleet and personnel.
- **Maturity:** production-oriented pilot foundation. Financial, identity-recovery, document, and historical-data requirements still need completion before broader use.

## B. Initial state

The baseline frontend build succeeded with large-chunk warnings. The baseline TypeScript command failed with extensive missing modules, conflicting types, obsolete Next.js files inside a Vite application, and inconsistent domain contracts. Raw output is retained in `docs/audit/baseline-build.txt` and `baseline-types.txt`.

Contrary to the migration assumption, no active Supabase integration was found. Active persistence was IndexedDB. Two database services opened the same v2 database with different requested versions. One version-conflict recovery handler could delete the local database.

The active authentication context accepted any email/password meeting trivial formatting rules, inferred roles from the email string, trusted localStorage sessions, and decoded Google JWT payloads without verification. There was no authoritative backend boundary.

## C–D. Major findings and fixes

| Severity | Problem / evidence                                                              | Root cause                                                                             | Correction and verified result                                                                                                         |
| -------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Critical | Arbitrary-password login and email-derived admin role in the active AuthContext | Client treated as identity authority                                                   | Worker-verified passwords, opaque hashed sessions, server-owned organization identity; authentication and tenant tests pass            |
| Critical | IndexedDB version-conflict handler called `deleteDatabase`                      | Destructive recovery and competing adapters                                            | No legacy DB access in new bootstrap; old code preserved, not shipped; original records not imported or deleted                        |
| High     | Company isolation depended on browser data and UI conventions                   | No server-side authorization                                                           | Tenant filters on every data query plus composite ownership foreign key; foreign-owner mutations do not change data                    |
| High     | Conflicting schemas, adapters, routes, and abandoned framework files            | Multiple unfinished architectures coexisted                                            | One active React entry point, shared validation contracts, one Worker, one D1 schema; historical source isolated under `legacy/`       |
| High     | No authoritative assignment concurrency protection                              | Client-only business rules                                                             | SQL capacity and availability triggers, versioned updates, atomic audit events; simultaneous assignments cannot overfill a vessel      |
| High     | Repeated writes could be ambiguous after network failure                        | No retry identity                                                                      | Per-form idempotency keys for creates, stored transactionally; concurrent identical creates produce one record and one event           |
| High     | Missing secure deployment boundary                                              | Static hosting/local storage assumptions                                               | Same-origin Vercel gateway, shared Worker secret, exact production origin, secure cookies, fail-closed missing configuration           |
| Medium   | Broad dependency surface and known advisories                                   | Obsolete/unused dependencies and stale versions                                        | Runtime dependency reduction and targeted compatible upgrades; final `npm audit` reports zero known vulnerabilities                    |
| Medium   | Dead links and misleading pseudo-features                                       | UI routes existed without working chains                                               | Supported navigation rebuilt around verified features; unsupported features explicitly listed rather than presented as working buttons |
| Medium   | Mobile page overflow found in browser testing                                   | Absolutely positioned table accessibility text escaped its scroll container            | Positioned scroll container and intentional internal table scrolling; 390px browser checks pass                                        |
| Medium   | Secondary text and status labels failed contrast checks                         | Overly faint visual palette                                                            | Darker semantic colors and larger table information; automated WCAG checks pass on tested pages                                        |
| Medium   | Incorrect public SEO assertions                                                 | Invented canonical, free price/schema claims, private routes treated as public content | Accurate metadata, noindex workspace pages, no fabricated structured claims or private sitemap                                         |
| Low      | Network font/image dependencies and inconsistent motion                         | Generic, fragmented presentation                                                       | Local variable fonts, local hero imagery, coherent motion tokens, reduced-motion support, consistent forms and state feedback          |

The historical implementation is not secretly “fixed” by exclusion. It has been **retired from the supported runtime** and preserved for evidence and reviewed migration. This is an explicit scope/architecture replacement, not a declaration of parity with all former screens.

## E. Completed feature chains

| Feature            | UI/state                                       | API/server/D1                                          | Validation and permissions                                          | States and verification                                                     |
| ------------------ | ---------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Preview            | Read-only illustrative fixture                 | No fake backend                                        | Clearly labeled; editing opens real registration                    | Navigation, filters, detail dialog, and CSV tested                          |
| Owner registration | Accessible form                                | Organization + hashed-password user + server session   | Email/password/name/company limits; authentication throttle         | Empty real workspace verified; no production seed records                   |
| Sign-in/out        | Real forms and session restoration             | D1 session lookup/invalidation                         | Server password verification; no local role editing                 | Wrong password and post-logout unauthorized access tested                   |
| Fleet CRUD         | Search/filter, table, detail/edit/delete       | Tenant-scoped Worker writes and D1 rows                | IMO checksum, status/type, capacity, version, uniqueness            | Create/update/delete/reload/conflict tests pass                             |
| Personnel CRUD     | Forms, ranks, nationality, email/date, search  | D1-backed personnel rows                               | Shared runtime schema, tenant isolation, duplicate email protection | Creation/edit/persistence tested; deletion exercised in API tests           |
| Assignments        | Assign, reassign, sign off                     | Current vessel relationship in D1                      | Ownership, capacity, availability, version checks                   | Happy path, full capacity, concurrency, and referential delete guard tested |
| Certificate watch  | Valid/expiring/expired views and filters       | Derived from stored primary expiry                     | UTC dates, 30-day threshold, impossible-date rejection              | Unit boundaries and browser display tested                                  |
| Operations export  | Downloadable CSV                               | Current authorized snapshot                            | Formula escaping; no invented values                                | Browser download verified                                                   |
| Audit history      | Latest 100 successful events                   | Atomic, tenant-scoped D1 audit inserts                 | Failed/conflicting changes do not create success events             | Event counts verified against failed writes                                 |
| Settings/help      | Account context, export, sign-out, field guide | Uses actual account/data                               | No fake billing, role, recovery, or upload settings                 | Routes and guide dialog tested                                              |
| Daily maintenance  | No misleading UI controls                      | Cron removes expired sessions, throttle and retry keys | Does not delete business records                                    | Local scheduled invocation verified; expired rate-limit fixture removed     |

## F. Inferences and architectural decision ledger

| Decision                                     | Provenance / confidence                                     | Reason                                                                   | Alternative / risk                                                            | Mitigation                                                                        |
| -------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Use Workers + D1                             | Explicit request; high confidence                           | Appropriate relational operations backend                                | Rebuilding every historical abstraction would retain contradictions           | Narrow shared contract and additive migrations                                    |
| Replace local authentication                 | Direct evidence; required                                   | Existing auth did not authenticate anyone                                | Managed identity provider would require external product/configuration choice | Implement tested owner sessions; disclose missing recovery, verification, and MFA |
| Owner-owned company workspace                | Company schemas and user journey; high-confidence inference | Simplest enforceable tenant boundary                                     | Multi-company/multi-role workflows have more complex permissions              | Do not claim or expose unsupported roles/switching                                |
| Read-only illustrative preview               | Reasonable UX enhancement                                   | Lets users explore without insecure demo accounts                        | Sample data could be mistaken for production/live data                        | Persistent preview label, fixed reference date, no sample writes                  |
| Version checks / idempotency                 | Reliability standard; strongly justified                    | Real users retry and work in multiple tabs                               | Stale forms and retries can still require user review                         | Specific errors, refresh controls, stable create request keys                     |
| No R2/KV/Queues/Durable Objects yet          | Simplicity requirement                                      | Supported features need only relational data and scheduled cleanup       | Document upload scope remains unfinished                                      | Explicitly defer uploads; no fake upload success                                  |
| Preserve rather than auto-import legacy data | Direct destructive-code evidence; required                  | Unknown mappings and unsupported fields make automatic conversion unsafe | Cutover requires reviewed migration work                                      | Dedicated preservation/reconciliation procedure                                   |
| Noindex current application                  | Security/SEO standard                                       | No private operations data should enter search results                   | This does not create a public acquisition/content site                        | Accurate metadata; defer indexable marketing content to a real content strategy   |

## G. Design and interaction improvements

A nautical operations language replaces the fragmented component-library presentation:

- Ink-green navigation, warm neutral work surfaces, restrained lime actions, and semantic status colors.
- Self-hosted Manrope and DM Sans variable typography with a contrasting serif hero line.
- Cinematic maritime hero artwork, subtle camera drift, nautical chart detail, and a deliberately asymmetrical lower composition.
- Tactile button/card responses, route entrances, continuous chart-line movement, and coherent modal transitions.
- No scroll-jacking, hidden essential content, custom-cursor dependency, or WebGL overhead.
- Responsive recomposition with mobile navigation, focus containment, Escape dismissal, inert hidden navigation, visible focus, and skip navigation.
- Real empty, loading, saved, conflict, validation, unavailable-service, and not-found states.
- Reduced-motion support disables decorative animation instead of removing content.

Hero imagery is **AI-generated**; the chart is illustrative, not vessel telemetry. Screenshots in `docs/audit/` show the actual local browser render, not design mockups.

## H. SEO and content architecture

The application is private operational software. It now uses accurate titles/descriptions, semantic headings/navigation, local assets, meaningful alt text, and explicit noindex metadata. The old unverified domain canonical, price claims, and unrelated external social imagery are removed. Private entities are not published into a sitemap or schema.org feed.

The application is still client-rendered; no public marketing-content SSR or search acquisition strategy was invented. Search rankings are neither promised nor measured.

## I. Security

- Unique password salts with Web Crypto PBKDF2-SHA256 (100,000 iterations, reflecting the Workers API ceiling).
- 256-bit random session tokens; SHA-256 token hashes at rest, seven-day expiry, HttpOnly/SameSite cookies, Secure in production, logout invalidation.
- Thirty authentication attempts per trusted client-IP ten-minute bucket, verified with a rate-limit test.
- Server-only tenant context; parameterized SQL; no client-controlled role or organization IDs.
- Same-origin browser API and an authenticated Vercel-to-Worker gateway. Production writes require the exact configured browser origin.
- Bounded request bodies; allowlisted API paths; no arbitrary proxy destinations or followed redirects.
- Versioned updates, D1 relational constraints, atomic audit logging, and create idempotency.
- No client secrets, fake Google authentication, or offline write/cache mechanism in the deployed runtime.

This is not a penetration-test certification or a GDPR compliance declaration. Email verification, recovery, MFA, privileged operator tooling, abuse prevention beyond throttling, and live operational review remain launch considerations.

## J. Performance

The original primary bundle was approximately **612 kB / 186 kB gzip**, with additional large feature chunks. The new primary bundle is approximately **324 kB / 99 kB gzip**. This is a smaller supported feature surface as well as dependency cleanup, not a like-for-like benchmark.

The hero image is approximately 258 kB. Fonts are self-hosted and subset by font-face declarations. Motion uses transforms/opacity and lightweight SVG rather than layout loops or a 3D library. Table pages render ten records at a time, but the API still returns a whole-workspace snapshot.

No production Core Web Vitals, cross-region latency, large-dataset load test, or infrastructure cost benchmark has been measured. Large-fleet server pagination remains a necessary future scalability task.

## K. Database

Three append-only migrations create the new D1 model, assignment-integrity triggers, and idempotency storage. They have been applied successfully to local Wrangler D1. Foreign keys, uniqueness, capacity checks, indexes, and optimistic versions protect the supported workflows. Cron cleanup is additive maintenance, not business-record deletion.

**No original browser/SQLite data was migrated.** Unsupported payroll/document/rotation fields require reviewed mappings or new models. See `MIGRATION.md`.

## L–N. Architecture, Vercel, and Cloudflare

```text
React/Vite frontend on Vercel
 → same-origin /api gateway on Vercel
 → Cloudflare Worker (all business logic and auth)
 → Cloudflare D1
 → Cloudflare daily Cron cleanup
```

The Vercel gateway only performs constrained forwarding, timeout handling, secure header propagation, and cache prevention. Cloudflare services actually used: **Workers, D1, Cron**. No unnecessary R2/KV/Queues/Durable Objects provisioning is included.

Production binding IDs, frontend origin, gateway secret, and Vercel Worker-origin environment variable must be supplied. The production Worker dry-run bundles successfully; remote resource validity is not checked by a dry-run.

## O. Testing actually performed

- Baseline build: succeeded with bundle warnings; baseline TypeScript: failed (outputs preserved).
- Active strict TypeScript and Vite production build: passed.
- Active ESLint: passed.
- Unit tests: **20 passed** (domain validation, date boundaries, gateway allowlisting/failure behavior/header propagation, and direct-production-traffic rejection).
- Playwright suites: **9 passed** against actual local Worker + D1 emulation. These include API/auth/tenant isolation, CRUD, persistence, capacity/concurrency, create retries, throttling, malformed input, browser journeys, export, keyboard/mobile behavior, embedded-preview authentication handoff, and page/dialog accessibility.
- Automated Axe WCAG 2 A/AA and 2.1 AA checks: no violations on tested settled workspace pages and registration dialog; desktop and 390px mobile checks included. This is not a complete manual accessibility certification.
- D1 migrations: all three applied locally; second application reports no pending migrations.
- Scheduled cleanup: manually invoked the local scheduled route; an expired rate-limit fixture was removed and the remaining count was zero.
- Production Worker dry-run: passed; no remote deployment performed.
- `npm audit`: **zero known vulnerabilities** at verification time.
- CI workflow added; its GitHub-hosted execution has not been observed in this session.

Standard Playwright CDN browser/dependency downloads were blocked by this sandbox's network. Browser tests therefore ran using npm-distributed Chromium and its packaged support libraries. Browser web security was not disabled. CI is configured to use the normal Playwright browser installer. This workaround is test tooling, not application infrastructure.

## P. Documentation delivered

- Root README: actual supported workflows, architecture, local development, scripts, and limits.
- `docs/DEPLOYMENT.md`: precise Vercel/Worker setup, secrets, migrations, staging isolation, acceptance checks, monitoring, backup, rollback, and troubleshooting.
- `docs/MIGRATION.md`: original-data preservation and required mapping/reconciliation process.
- `docs/API.md`: endpoint contracts, payloads, permissions, versions, idempotency, and errors.
- This reconstruction report: evidence, decisions, scope, design, security, and exact verification.
- `legacy/NOTICE.md`: historical code is unsafe/unmaintained and must not be deployed.
- `.env.example`, `wrangler.jsonc`, `vercel.json`, and a GitHub CI workflow.

## Q. Remaining issues and limits

| Priority                              | Remaining issue                                                                                                                 | Status                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Release blocker                       | Remote Cloudflare database/Worker, Vercel project, exact origins, gateway secrets, cloud smoke test                             | Environment-dependent; not deployed                                            |
| Release blocker for existing users    | Review/export/import real legacy data without losing unsupported fields                                                         | Requires source-data inventory and owner-approved mapping; no importer claimed |
| High before broad self-service launch | Password recovery/rotation, email verification, MFA and abuse-management requirements                                           | Not implemented; controlled pilot recommended                                  |
| High if required for the business     | Payroll, recruitment, document uploads, richer certificate/STCW model, future rotations, multi-user roles and company switching | Historical scope not ported; no visible fake implementations                   |
| Medium before large-fleet adoption    | Server-side pagination, query/load/cost testing, quotas and telemetry thresholds                                                | Not verified at scale                                                          |
| Medium                                | Live alert delivery, cloud recovery drill, account lifecycle/deletion policy                                                    | Operational setup and business policy required                                 |
| Medium                                | Full manual screen-reader/device/browser testing and field CWV                                                                  | Chromium/automated coverage only                                               |
| Optional                              | Public marketing content, indexable resources, real AIS integration                                                             | No unsupported vendor, content, or telemetry assumptions added                 |

## R. Deployment next steps

Follow `DEPLOYMENT.md` in order: create isolated D1 → set binding ID/origin → put shared gateway secret on both platforms → apply migrations → deploy Worker → set Vercel server environment → deploy frontend → execute staging acceptance checklist → approve data migration and launch constraints.

**Bottom line:** the supported core has real persistence and verified happy/failure paths, with a distinctive new visual experience. It would be inaccurate to say every historical feature is complete or that the whole system is production-verified without the remaining cloud, identity, data-migration, and business-scope work.
