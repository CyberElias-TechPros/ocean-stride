# API contract

Browser base path: `/api`. All bodies/responses are JSON. Production requests pass through the Vercel gateway; do not configure a browser-facing Worker URL. Cookies are same-origin and managed by the server.

## Public/session endpoints

| Method | Path             | Request                                                    | Response                                                                   |
| ------ | ---------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| GET    | `/health`        | None                                                       | `{ "status": "ok", "storage": "Cloudflare D1" }`                           |
| POST   | `/auth/register` | `name`, `company`, `email`, `password` (12–128 characters) | `{ user: { id, name, email, company, role: "admin" } }` and session cookie |
| POST   | `/auth/login`    | `email`, `password`                                        | Same user envelope and session cookie                                      |
| POST   | `/auth/logout`   | `{}`                                                       | `{ "ok": true }`, current session invalidated and cookie expired           |
| GET    | `/auth/me`       | Session cookie                                             | User envelope or 401                                                       |

Registration creates a new isolated organization and its owner, not a verified company identity. Authentication endpoints have a per-client-IP limit of 30 attempts per ten-minute bucket. All production endpoints additionally require the server-only gateway secret.

## Protected operations

| Method | Path                   | Request                                              | Response                                                                       |
| ------ | ---------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| GET    | `/workspace`           | Session                                              | `{ vessels: Vessel[], crew: Crew[], activity: Activity[] }`; latest 100 events |
| POST   | `/vessels`             | Vessel input; optional UUID `Idempotency-Key` header | `{ id }`, 201 (200 on same-payload replay)                                     |
| PUT    | `/vessels/:id`         | Full vessel input plus current integer `version`     | `{ ok: true }`                                                                 |
| DELETE | `/vessels/:id`         | `{ version }`                                        | `{ ok: true }`; assigned crew must be signed off first                         |
| POST   | `/crew`                | Crew input; optional UUID `Idempotency-Key` header   | `{ id }`, 201 (200 on same-payload replay)                                     |
| PUT    | `/crew/:id`            | Full crew input plus current integer `version`       | `{ ok: true }`                                                                 |
| DELETE | `/crew/:id`            | `{ version }`                                        | `{ ok: true }`                                                                 |
| PUT    | `/crew/:id/assignment` | `{ vesselId: UUID or null, version }`                | `{ ok: true }`; null signs off                                                 |

`Vessel` and `Crew` returned by the workspace include `id`, `version`, and `createdAt`. Crew additionally includes `vesselId`. IDs/tenant ownership are server-managed. `Activity` is `{ id, message, createdAt }`. Timestamps are UTC ISO strings.

### Vessel input

```json
{
  "name": "Example Pioneer",
  "imo": "9074729",
  "type": "Container ship",
  "flag": "Panama",
  "capacity": 20,
  "status": "In port",
  "destination": "Rotterdam"
}
```

Type: `Container ship`, `Bulk carrier`, `Tanker`, `Offshore vessel`, `General cargo`. Status: `At sea`, `In port`, `Maintenance`. IMO must have seven digits, a nonzero first digit, and a valid checksum. Capacity is an integer from 1 through 500. This validates the format/checksum, not a vessel's actual registration in an external registry.

### Crew input

```json
{
  "name": "Example Captain",
  "email": "captain@example.com",
  "rank": "Captain",
  "nationality": "Nigeria",
  "certificateExpiry": "2027-05-01"
}
```

Supported ranks and all field limits are defined in `shared/domain.ts`. Certificate dates use real `YYYY-MM-DD` calendar dates. Only one primary expiry is tracked; this is not a regulatory certificate inventory.

## Integrity, retries, and errors

- Every query and mutation derives organization identity from the authenticated session. Client organization IDs/role fields do not grant access.
- Every successful update increments `version`. Stale/missing/foreign-tenant update targets return 409 without changing data or creating a success event.
- Assignment availability, ownership, and capacity are enforced server-side; capacity/availability are also enforced inside SQL writes.
- Use one unique `Idempotency-Key` per create intent. Identical retries return the original ID for seven days. Reusing it with a changed payload returns 409. Closing/reopening a form creates a new intent. Idempotent replay does not recreate a record deleted later.
- Existing unique IMO/email constraints additionally prevent duplicate records within a tenant.
- The Worker accepts bodies up to 16 KiB. Do not send binary files or unsupported document fields.
- Errors use `{ error: string, requestId?: string }`. `X-Request-Id` is supplied by the Worker. Gateway-only errors may lack a Worker ID.
- Statuses: 400 validation/JSON, 401 session/credentials, 403 origin/gateway boundary, 404 endpoint, 405 method, 409 conflict, 413 body size, 415 content type, 429 throttling, 500 internal failure, 503 gateway/configuration/network availability.
- No automatic mutation retries are performed by the browser. Refresh after an uncertain update/delete response and review the current version. Creates are retry-safe from the same form via their stable key.
- There is no cross-origin browser CORS API, refresh token, password recovery, upload, payroll, invitation, or AIS endpoint in this release.
