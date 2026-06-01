# Decision: VITAL persists in Postgres; schema migrations via node-pg-migrate

- Type: decision
- Date: 2026-05-31
- Work unit: 007-postgres-migrations
- Related: [[006-decision-digitalocean-app-platform-hosting]] (the runtime that hosts it),
  [[010-pattern-do-app-platform-migrations]] (how migrations apply in prod)
- Superseded in part by [[013-decision-doppler-local-env]] (work 008): the **`POSTGRES_PORT`
  port override** and the **`--env-file-if-exists=.env` flow** described below were removed —
  see the ⚠ markers. This entry stays a true record *as of work 007*.

VITAL's database is **Postgres**, and schema is evolved with **`node-pg-migrate`** (plain-SQL
migrations). Local dev runs Postgres in **Docker Compose** (`postgres:16-alpine`, container
`vital-postgres`, named volume `vital_pgdata`, default port 5432 overridable via
`POSTGRES_PORT`); production is **DO Managed Postgres** reached over an ordinary TCP `pg`
connection with the URL as a `RUN_TIME` Doppler secret. This realized the DB deferral 005 left in
its followups.

> ⚠ Superseded by [[013-decision-doppler-local-env]] (008): the port is now **hardcoded to 5432
> with no `POSTGRES_PORT` override** (free the port instead of overriding it), and local
> `DATABASE_URL` comes from the Doppler `dev` config via `doppler run`, not `.env`.

## Why node-pg-migrate (not a hand-rolled runner, not an ORM)

- **Not hand-rolled.** Owning ordering / per-migration transactions / advisory locking /
  partial-failure recovery is needless risk; node-pg-migrate provides all of it plus an idempotent
  `up` and a `pgmigrations` tracking table.
- **Not Drizzle / an ORM.** A typed TS schema DSL is exactly the strict-`.ts`-ESLint surface this
  infra work wanted to avoid (see [[001-constraint-strict-eslint-guardrails]]), and ORM adoption is
  a separate, deferrable decision. Migrations are authored as **plain SQL** (`migrate:create -- <name>`
  → `node-pg-migrate create -j sql`), keeping migration content off the lint surface entirely — the
  same lenient lane `server.js` uses ([[007-pattern-expo-router-server-self-host]]).

## Load-bearing implementation facts

- `pg` + `node-pg-migrate` are **regular `dependencies`** (NOT devDependencies): the production
  migrate job builds under `NODE_ENV=production`, which prunes devDeps, so the runner must survive
  pruning. A `"//db"` key in `package.json` documents this (JSON has no comments, and a `"//"` key
  inside `dependencies` would be read as a package).
- npm scripts bake the env-file flag **directly onto the bin**:
  `node --env-file-if-exists=.env node_modules/node-pg-migrate/bin/node-pg-migrate.js up`. Never
  `node --env-file ... npm run migrate` (the flag would apply to npm, not the spawned child — a
  silent local-only failure masked in prod by Doppler). `--env-file-if-exists` needs **Node ≥ 20.12**
  (pinned via `engines.node`); in prod no `.env` exists so it is a non-fatal no-op and `DATABASE_URL`
  comes from `process.env`.

  > ⚠ Superseded by [[013-decision-doppler-local-env]] (008): the **`--env-file-if-exists=.env`
  > flag was dropped** from all migrate scripts (so the Node ≥ 20.12 dependency is moot). Migrate
  > now reads `DATABASE_URL` from `process.env` only — injected by `doppler run` locally and the
  > native integration in prod — and a `scripts/check-database-url.js` guard fronts `up`/`down`.

- Local creds are kept **alphanumeric** so the `DATABASE_URL` parses identically under Docker
  Compose interpolation and Node's `--env-file` parser.

## Scope boundary

This unit delivered the DB + the migration pipeline only. Wiring the app's data-access layer and
replacing the mock data in `src/data/programs.ts` is a deliberate future unit; the one shipped
migration (`pgcrypto` + a neutral `app_meta` table) exists only to prove the pipeline end-to-end.
