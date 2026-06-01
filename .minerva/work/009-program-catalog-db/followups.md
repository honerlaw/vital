# 009 — followups

Forward work deliberately deferred out of this unit. Surfaced as suggestions, not auto-started.

## T1 — Async engine cutover (retire the in-memory `PROGRAMS` runtime source)

The synchronous engine path still reads the in-memory `PROGRAMS` constant: `getProgram()`,
`state/reducer.ts`, home `(tabs)/index.tsx`, `workout.tsx`, and the detail screen `program/[id].tsx`.
Move these to async DB-backed reads (hydrate the catalog at startup or via a loader), making Postgres
the single source of truth. Then retire `src/data/programs.ts` as the runtime source and remove the
dual-source state + the seed drift guard ([[015-pattern-generated-seed-drift-guard]]). This is the
proposal's named deferred follow-up; it carries the reducer-purity / startup-gate blast radius that
kept it out of 009. Likely large enough to be its own work unit.

## T2 — Program detail screen fetches from the API

The detail screen (`program/[id].tsx`) still calls the synchronous `getProgram(id)`. Add
`GET /api/programs/[id]` and have the screen fetch it (with loading/error states). This was 009's
deferred Open Question and is likely the first task of T1.

## T3 — Drain the pg pool on shutdown (review F8)

`server.js`'s SIGTERM handler calls `server.close()` to drain in-flight HTTP requests but never
`pool.end()`, so Postgres connections are abandoned on every redeploy. Low impact (App Platform kills
the container; Postgres reaps the sockets), and adding a `closePool()` export to `db.ts` would put a
second function there against one-function-per-file — so it pairs naturally with T1 (when `db.ts` is
revisited). When done, fold the `pool.end()` lifecycle learning back into
[[014-pattern-server-pg-access-expo-routes]] so the construct→survive→drain story is complete in one place.
