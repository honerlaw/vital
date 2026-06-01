# 009 — program-catalog-db · scratchpad

## Log

## Open questions

## Panel decisions 2026-05-31

- [3/3 accept] scope check: single unit (only natural second unit — engine async cutover — is deferred)
- [3/3 accept after 1 revision] approach selection: Approach A (incremental list-only + jsonb + generate-from-canonical seed + lazy DB module). Revision folded in: @types/pg regular dep; cast-free type-guard predicates; generate-from-canonical seed + offline drift test; lazy Pool reading DATABASE_URL verbatim (no hardcoded sslmode). B (full cutover) and C (normalized) rejected.
- [3/3 accept after 1 revision] whole-proposal acceptance. Revision folded in: explicit manual method for SC#2; checkable import-graph/bundle-grep for SC#5; byte-equality whole-file drift-test contract; 500-on-row-validation-failure; shared base-URL helper.

### Carry-forward constraints from panels (binding for work)

- Drift test must NOT transitively import `db.ts` / the `+api.ts` route (db.ts must not connect at import); test stays offline.
- `db.ts`: lazy guarded singleton Pool; read `DATABASE_URL` verbatim from `process.env`; never hardcode `sslmode` (local URL has no TLS).
- Row→Program mapping: query `days: unknown` + hand-written predicates; no `any`/`as`/non-null/ts-comment. Bridge snake_case↔camelCase (`per_week`→`perWeek`); synthesize `sort_order` from array index.
- Generator owns the ENTIRE migration file body; committed file == regenerate(PROGRAMS) byte-for-byte.
- `@types/pg` as a REGULAR dependency.
- Client reuses a shared `EXPO_PUBLIC_API_URL` base-URL helper factored out of `api-fetch.ts`.
