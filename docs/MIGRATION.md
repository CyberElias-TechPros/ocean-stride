# Data preservation and migration

## What changed

The active application used IndexedDB (`OceanStrideDB`, `OceanStrideDB_v1`, `OceanStrideDB_v2`), not Supabase. Two v2 adapters requested different versions (2 and 4). The old version-conflict handler could delete a database; startup also attempted cleanup of older stores. Running that startup is not a safe export strategy.

The new application **never opens or deletes those IndexedDB databases**. Old service worker registrations are retired so they cannot continue serving the unsafe cached app after update. A no-cache retirement worker remains at `/sw.js` for installed PWAs; it claims clients and unregisters without replaying queued writes, deleting caches/IndexedDB, or forcing an unsaved page to reload. Verify this update on each original browser and export any offline queues before removing old cached data. Existing browser records are not automatically sent to Cloudflare. The historical SQLite file and its migrations are preserved under `legacy/prisma/`; no destructive database migration was executed against them.

## Current D1 model

- `organizations` → many `users`, `vessels`, `crew`, and `activity` events.
- `users` → opaque hashed `sessions` with absolute expiry.
- `crew.vessel_id` + `organization_id` → a composite foreign key to an owned vessel.
- Vessel uniqueness is `(organization_id, imo)`; crew uniqueness is `(organization_id, email)`.
- Integer `version` fields protect updates against stale clients.
- Capacity/availability triggers protect concurrent assignment writes.
- `idempotency_keys` gives same-payload create retries stable IDs for seven days.
- `rate_limits` and session/idempotency indexes support cleanup.

Migrations are additive to a **new D1 database**, not an in-place conversion of the historical data. Source and destination IDs, business statuses, and field nesting differ.

## Required process before importing real records

1. **Identify owners and source locations.** Inventory the actual browser profiles/origins containing IndexedDB and any server SQLite exports. Obtain data-controller authorization.
2. **Take read-only backups.** Use browser developer tools or a reviewed export-only script which does not import or execute the old application bootstrap. Record counts, store names, schema versions, relationships, and timestamps. Never commit those exports.
3. **Review the schema mapping.** The active D1 release only supports the fields below. Do not drop unsupported fields silently.
4. **Validate on a copy.** Check IDs, organization ownership, unique emails/IMOs, IMO checksums, invalid dates, duplicate crew, capacity conflicts, and missing vessel references. Produce a reconciliation report before writing anything.
5. **Import to staging first.** Build an offline, authenticated, reviewed importer against the concrete export format. It must be repeatable, transactional, preserve source IDs in a mapping ledger, and reject unknown/unmapped data.
6. **Reconcile and approve.** Compare source/destination counts and sampled records. Review every rejected or unsupported field with the operator. Keep the original export untouched.
7. **Cut over intentionally.** Freeze edits, export once more, take a D1 backup, apply the approved import, and validate journeys. Keep the old data in read-only archival storage.

## Mapping decisions still required

| Historical area                 | Current destination             | Required review                                                                                   |
| ------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------- |
| Company                         | Organization                    | Company ownership and duplicate companies; current account owns exactly one workspace             |
| Vessel particulars              | Vessel                          | Valid IMO, flag, capacity, supported type/status; retain other particulars in source archive      |
| Nested personnel profile        | Crew                            | Name, email, rank, nationality; other employment/medical fields are not represented               |
| Crew assignments/rotations      | Current vessel ID               | Select current assignment only; historical/future rotations need a separate approved model        |
| Many certificates/documents     | One primary expiry date         | Operator must choose the tracked primary certificate; this is not a lossless compliance migration |
| Payroll/settings/currency/tax   | No destination yet              | Financial requirements must be validated before a schema and calculation engine are implemented   |
| Fake local users and roles      | Newly registered owner accounts | Never import unauthenticated client roles or treat old passwords as valid server credentials      |
| Recruitment/notifications/files | No destination yet              | Preserve outside D1 until those workflows are explicitly designed                                 |

**No production records were imported and no lossless importer is claimed.** A generic importer without actual source exports and field-mapping approval would be unsafe. This is a material remaining migration dependency, not a hidden happy path.
