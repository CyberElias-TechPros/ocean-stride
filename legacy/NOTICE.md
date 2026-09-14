# Historical implementation — not production code

This directory preserves the pre-reconstruction application and tooling for forensic reference and data-mapping work. It is deliberately outside the runtime, production TypeScript project, and lint targets. It contains known insecure authentication, destructive IndexedDB recovery, conflicting schemas, and unverified financial logic. **Do not deploy or execute it against original browser data.**

The original package manifest and Bun lock are historical; the only supported dependency installation is `npm ci` in the repository root. The original SQLite file and migration remain here unchanged. No original IndexedDB database has been opened, altered, imported, or deleted by the new runtime.

The new release is a narrower, verified operations foundation, not feature parity with every original payroll, recruitment, document, and admin screen. See `docs/RECONSTRUCTION_REPORT.md` and `docs/MIGRATION.md` for the explicit scope and remaining work.
