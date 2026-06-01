# 009 — DB-backed program catalog (Programs tab reads from Postgres)

## Status

Implemented — review complete; PR pending (`minerva:ship` flips this to Shipped on merge). Approved
and delivered via `minerva:propose-ship-auto` consensus panels (scope 3/3; approach 3/3 after one
revision; whole-proposal 3/3 after one revision; completion 3/3; review triage 2/2; promote
partition 2/2 after one revision). All five success criteria verified (see scratchpad archive).

## Goal

Move VITAL's workout-program catalog out of the in-memory `src/data/programs.ts` constant
and into Postgres, expose it through a read-only `GET /api/programs` API route, and render the
Programs library **list** tab (`src/app/(tabs)/programs.tsx`) from that endpoint instead of
importing the in-memory array. This is the data-layer wiring that
[[009-decision-postgres-node-pg-migrate]] explicitly deferred.

## Why

Work 007/008 stood up Postgres + the migration pipeline, but no feature data lives there — the
only table (`app_meta`) exists solely to prove the pipeline end-to-end (009 "Scope boundary").
This unit delivers the **first feature table** and the **first runtime DB read path**. It turns
the catalog from a hardcoded array into persisted, server-served data, and establishes two
reusable patterns — a server-side data-access module (`src/server/db.ts`) and a client
data-fetch on a screen — that later user-scoped data (workout history, the active program) will
build on. It is the natural next step toward closing the "data evaporates on restart" gap.

## Approach

Approach A (panel-selected 3/3 after one revision). Alternatives considered and rejected:
**B** = full async cutover now (replace `PROGRAMS` everywhere, hydrate at startup) — deferred for
its reducer-purity / startup-gate blast radius; **C** = normalized 3-table schema
(`programs`/`program_days`/`program_exercises`) — rejected as overhead for a 5-row, read-whole,
author-curated catalog with no per-exercise query need.

### Schema + migration

One `node-pg-migrate` plain-SQL migration (`npm run migrate:create -- <name>`, `-j sql`) adds:

```sql
CREATE TABLE programs (
  id         text    PRIMARY KEY,
  name       text    NOT NULL,
  tag        text    NOT NULL,
  cred       text    NOT NULL,
  per_week   integer NOT NULL,
  blurb      text    NOT NULL,
  sort_order integer NOT NULL,
  days       jsonb   NOT NULL
);
```

`days` holds the `WorkoutDay[]` rotation verbatim — the catalog is 5 author-curated rows read
whole, and `jsonb` mirrors the nested `Program` type with no joins. Down migration drops the
table. Migration content stays plain SQL, off the strict-lint surface
([[009-decision-postgres-node-pg-migrate]]).

### Canonical seed via generation

`src/data/programs.ts` `PROGRAMS` **remains the single canonical source**. A new
`scripts/gen-programs-seed.js` (the lenient `scripts/` lane, like `scripts/check-database-url.js`,
off the strict-lint surface) deterministically emits the **entire migration file body** from
`PROGRAMS` — the Up section (`CREATE TABLE` + the `INSERT`s) and the Down section (`DROP TABLE`) —
synthesizing `sort_order` from array index and mapping camelCase → snake_case
(`perWeek` → `per_week`). The committed migration file **is** that generated output.

Remediation if `PROGRAMS` later changes: regenerate; because an applied migration is immutable,
if this migration has already shipped, write a **new** migration with the regenerated seed (never
edit an applied migration).

### Drift guard (offline)

A `src/**/*.test.ts` test imports `PROGRAMS` + the generator, regenerates the migration file body
in memory, reads the committed migration file from disk, and asserts **byte-equality**. No DB, no
import of `db.ts` or the route, no SQL parsing or seed-block extraction. The generated body
carries no timestamp (the timestamp lives only in the committed filename, at a fixed path the test
reads), so the comparison is deterministic. This keeps the in-memory engine source and the DB
seed identical while both exist. By design the test is strict: a hand-edit to the migration breaks
it — the fix is to regenerate, not hand-patch.

### Server DB module

`src/server/db.ts` — server-only (imported only by `+api.ts`, keeping `pg` off the client
bundle): module-scope `let pool: Pool | null = null`; `getPool()` lazily constructs
`new Pool({ connectionString: DATABASE_URL })` on first call (guarded singleton, **no connection
at import** → the route stays offline-importable); an exported `query()`. `DATABASE_URL` is read
**verbatim** from `process.env` exactly as the migrate pipeline does — SSL is whatever the URL
carries (`sslmode=require` in prod DO Managed Postgres, absent locally); the module never
hardcodes `sslmode`. Add `@types/pg` as a **regular** dependency (prod prunes devDeps under
`NODE_ENV=production`, per [[009-decision-postgres-node-pg-migrate]]; `pg` is already a regular
dep). Document the `@types/pg` rationale alongside the existing `"//db"` key in `package.json`.

### API route

`GET /api/programs` — **public** (recorded decision: non-sensitive author-curated catalog;
mirrors the public `/api/health`; the UI is auth-gated anyway; contrast the opt-in `requireAuth`
on `/api/me`, see [[011-pattern-clerk-expo-core3-auth-and-endpoint-enforcement]]). Queries rows
as primitives + `days: unknown`, then narrows with hand-written type-guard predicates
(`isProgramTag`, `isExercise`, `isWorkoutDay`, `isWorkoutDayArray`) validating the `ProgramTag`
union and the nested `days[].exercises[]` shape at runtime — **no `any`, no `as`, no non-null
`!`, no `ts-*` comment** (the `unknown`-narrowing discipline of
[[012-pattern-src-unit-tests-node-tsx]] / `clerk-verifier.ts`). A row failing validation → the
route returns **500** (no partial list). Maps validated rows (snake → camel) to `Program[]`
ordered by `sort_order`.

### Client

The Programs list tab (`src/app/(tabs)/programs.tsx`) fetches `/api/programs` and renders
**loading / error / empty / list** states (the `native-data-fetching` convention). The
`EXPO_PUBLIC_API_URL` base-URL resolution currently inlined in `src/auth/api-fetch.ts` is factored
into a tiny shared helper, reused by both `apiFetch` (with Bearer) and the new public programs
fetch (no Bearer). The tab stops importing `PROGRAMS` for the list.

### Deferred (out of scope this unit)

The synchronous engine path — `getProgram()`, `state/reducer.ts`, home `(tabs)/index.tsx`,
`workout.tsx`, the program detail screen `program/[id].tsx` — keeps reading the in-memory
`PROGRAMS`. Full async cutover (single source of truth) is a named follow-up; the drift guard
holds the two sources identical until then.

## Success criteria

1. A new plain-SQL migration creates the `programs` table and seeds all 5 programs; `npm run
   migrate` applies cleanly to local Postgres and `npm run migrate:down` drops it cleanly.
2. **(Manual acceptance step — the automated lane is offline-only.)** With the migration applied
   to local Postgres, boot the self-hosted server (`node server.js` / the serve script) and
   `curl /api/programs`; assert HTTP 200 and a JSON array of exactly 5 programs ordered by
   `sort_order`, each matching the `Program` shape (`id`/`name`/`tag`/`cred`/`perWeek`/`blurb`/`days`).
3. The Programs list tab renders the list from the API with working loading, error, and empty
   states, and no longer imports `PROGRAMS` for the list.
4. The offline drift-guard test asserts the committed migration file is byte-equal to a fresh
   regeneration from canonical `PROGRAMS`, and passes under `npm test`.
5. `npm run lint` (`--max-warnings 0`), `tsc --noEmit`, `npm test`, and `npm run lint:rules-test`
   are all green; `expo export -p web` succeeds bundling all routes; and `pg`/`@types/pg`/
   `src/server/db.ts` are reachable only from server-only modules (`+api.ts` / `src/server/`) —
   verified by grepping the import graph and grepping the web export output
   (`dist/_expo/static/js`) for `Pool(`/`pg`.

## Open Questions

- **(Resolved by panel)** Auth on `GET /api/programs`: **public**, consistent with `/api/health`.
- Whether the program **detail** screen (`program/[id].tsx`) should also fetch
  (`GET /api/programs/[id]`) — deferred; this unit is scoped to the list tab per the ask. Likely
  the first task of the follow-up async-cutover unit.

## As-built notes

Durable patterns from this unit are captured in [[014-pattern-server-pg-access-expo-routes]] and
[[015-pattern-generated-seed-drift-guard]]. Two divergences from the approach above, both benign:

- The seed generator shipped as `scripts/gen-programs-seed.ts` (TypeScript, strict-linted), **not**
  the `scripts/*.js` lenient lane — required so it can import the canonical TS `PROGRAMS` and be
  imported by the tsx-run drift test with no CJS/ESM friction. The migration `.sql` *content* still
  stays off the lint surface (ESLint never lints `.sql`).
- The shared guards were split into `src/data/guards/*` (one predicate per file + `index.ts`),
  forced by the one-function-per-file `local/single-declaration` rule; `db.ts` inlines its pool init
  into `query()`, and the generator's helpers are inner arrows, for the same reason.

Review fixes folded in (triage F1/F2): `db.ts` attaches `pool.on('error')` so an idle-client backend
drop logs and recycles instead of crashing the self-hosted server; `programs+api.ts` logs the caught
cause before returning the opaque 500. Deferred follow-ups (engine cutover, detail-screen fetch,
`pool.end()` on SIGTERM) are recorded in `followups.md`.

## Decision log

- **Scope** — single work unit (panel 3/3). The only natural second unit (engine async cutover)
  is explicitly deferred; splitting migration from route+tab would ship a table nothing reads.
- **Approach** — A: incremental list-only, `jsonb` schema, generate-from-canonical seed, lazy
  offline-testable DB module (panel 3/3 after one revision folding in: `@types/pg` regular dep;
  committed cast-free type-guard predicates; generate-from-canonical seed + offline drift test;
  lazy guarded Pool reading `DATABASE_URL` verbatim with no hardcoded `sslmode`).
- **Whole proposal** — accepted (panel 3/3 after one revision folding in: explicit manual method
  for SC#2; checkable import-graph/bundle-grep reframe for SC#5; byte-equality whole-file
  drift-test contract; 500-on-row-validation-failure; shared base-URL helper).
