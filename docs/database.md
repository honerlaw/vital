# VITAL database & migrations

VITAL uses **Postgres**. Locally it runs in Docker Compose; in production it is **DO Managed
Postgres** reached over an ordinary TCP connection. Schema changes are applied by the same
mechanism — [`node-pg-migrate`](https://github.com/salsita/node-pg-migrate) — in both places, so
local and production stay symmetric.

> Scope note: this sets up the database and the migration pipeline. Wiring the app's data-access
> layer and replacing the mock data in `src/data/programs.ts` is deliberately a later unit.

## Local development

### 1. Start Postgres

```sh
cp .env.example .env          # first time only
docker compose up -d --wait   # --wait blocks until the healthcheck passes
```

This starts the `vital-postgres` container (`postgres:16-alpine`) on port `5432`, with data
persisted in the `vital_pgdata` named volume. `/dev-start` runs this for you.

If port `5432` is already taken by another local Postgres, set `POSTGRES_PORT` **and** the
matching `DATABASE_URL` in `.env` (e.g. `5440` / `postgres://vital:vital@localhost:5440/vital`).

Stop it with `docker compose down` (add `-v` to also wipe the volume).

### 2. Apply migrations

```sh
npm run migrate          # apply all pending migrations (idempotent)
```

The migrate scripts read `DATABASE_URL` from `.env` via Node's `--env-file-if-exists` flag (no
extra dependency). Re-running `npm run migrate` when nothing is pending prints
`No migrations to run!` and exits 0.

### 3. Author a migration

```sh
npm run migrate:create -- add_workouts_table   # creates migrations/<timestamp>_add-workouts-table.sql
npm run migrate:down                            # roll back the most recent migration
```

Migrations are **plain SQL** files in `migrations/`, with `-- Up Migration` and
`-- Down Migration` sections. Keeping them SQL (not TS) keeps migration content off the strict
TypeScript ESLint surface — the same lenient lane `server.js` uses.

## How it is wired

- **`pg` + `node-pg-migrate` are regular `dependencies`** (not devDependencies). The production
  migrate job builds under `NODE_ENV=production`, which prunes devDeps, so the runner must
  survive pruning. `pg` is pure-JS (no `pg-native`), and migrations/scripts never enter the
  Metro / `expo export` graph, so the client bundle and strict `.ts` lint are untouched.
- **The env-file flag is baked onto the migrate bin**, e.g.
  `node --env-file-if-exists=.env node_modules/node-pg-migrate/bin/node-pg-migrate.js up`. It
  must wrap the bin directly, **never** `node --env-file=.env npm run migrate` (there the flag
  would apply to `npm` and the spawned migrate child would not load `.env`). `--env-file-if-exists`
  requires **Node ≥ 20.12** (pinned via `engines.node`); in production no `.env` exists, so the
  flag is a non-fatal no-op and `DATABASE_URL` comes from Doppler-synced `process.env`.

## Production (DigitalOcean App Platform)

Migrations apply automatically on deploy via a **`PRE_DEPLOY` job** in
[`.do/app.yaml`](../.do/app.yaml). A DO job is its **own component with its own build** — it does
not inherit the web service's image or `node_modules` — so it re-declares `github:` /
`environment_slug:` and runs a deliberately cheap build (`npm ci --omit=dev`, **not**
`npm run export:web`). It runs `npm run migrate` **before** new web containers take traffic; if a
migration fails, the deploy fails.

`DATABASE_URL` is a **Doppler-declared key** (`scope: RUN_TIME`) on both the migrate job and the
web service — the value is populated by Doppler's native DO integration, never hardcoded in the
spec. See [`deploy-digitalocean.md`](./deploy-digitalocean.md) for the Doppler setup, and
[[006-decision-digitalocean-app-platform-hosting]] for why DO's full Node runtime was chosen.

The operator provisions the DO Managed Postgres instance and sets the Doppler `DATABASE_URL`
secret once; that step is outside this repo (mirrors how 005 kept live DO provisioning
operator-run).

### Verify-post-deploy caveats

These behaviors can't be exercised by a local `node` — confirm them on the first real deploy:

- **Failure blocks the deploy.** A failing `PRE_DEPLOY` job is expected to fail the deployment so
  bad schema never ships ahead of, or behind, the code. Confirm on the first intentional failure.
- **First-deploy Doppler timing.** The very first deploy that introduces the migrate job is the
  most likely moment for `DATABASE_URL` to be empty (secret not yet synced). If the first migrate
  fails for that reason, confirm the Doppler sync, then redeploy.
- **Buildpack Node major.** `environment_slug: node-js` does not pin a Node major; the
  `--env-file-if-exists` flag needs Node ≥ 20.12. If the buildpack resolves an older major, the
  job crashes with an unknown-flag error — pin the Node version (e.g. an `engines`/`.node-version`
  the buildpack honors) and redeploy.
- **Operator alternative.** To apply migrations out-of-band (or recover from the above), run them
  manually against the deployed app: `doctl apps run <app-id> --component migrate -- npm run migrate`.

### Migration safety notes

- node-pg-migrate wraps the pending batch in a single transaction by default and takes an
  advisory lock, so concurrent or interrupted runs don't corrupt state. At `instance_count: 1`
  with a single job this is already safe; the lock covers future scale-up.
- A migration that uses `CREATE INDEX CONCURRENTLY` (or anything that can't run inside a
  transaction) must opt out of the per-migration transaction — add the
  `-- node-pg-migrate "noTransaction"` directive at the top of that migration file.
