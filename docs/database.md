# VITAL database & migrations

VITAL uses **Postgres**. Locally it runs in Docker Compose; in production it is **DO Managed
Postgres** reached over an ordinary TCP connection. Schema changes are applied by the same
mechanism — [`node-pg-migrate`](https://github.com/salsita/node-pg-migrate) — in both places, so
local and production stay symmetric.

> Scope note: this sets up the database and the migration pipeline. Wiring the app's data-access
> layer and replacing the mock data in `src/data/programs.ts` is deliberately a later unit.

## Local development

Local secrets come from **Doppler** via the Doppler CLI — the same values production gets,
read the same way (from `process.env`), just injected by `doppler run` locally instead of by
Doppler's native DO integration. **There is no `.env` file.**

### 0. One-time Doppler setup

Install the [Doppler CLI](https://docs.doppler.com/docs/install-cli)
(`brew install dopplerhq/cli/doppler`), then from the repo root:

```sh
doppler login          # authenticate this machine (once)
doppler setup          # selects project=vital / config=dev from the committed doppler.yaml
```

`doppler setup` is non-interactive thanks to the repo's `doppler.yaml`
(`setup: { project: vital, config: dev }`). The `dev` config must already exist in the Doppler
project, populated with the local values — notably
`DATABASE_URL=postgres://vital:vital@localhost:5432/vital`, plus `EXPO_PUBLIC_*` and `CLERK_*`
for the client and auth. Provisioning the Doppler project/config is an **operator step**, like
the DO Managed Postgres instance itself.

If you have a leftover `.env` / `.env.local` from before this change, **delete it.** Expo
auto-loads `.env` and would inline a stale `EXPO_PUBLIC_*` into the client bundle for any key
Doppler doesn't set.

### 1. Start Postgres

```sh
docker compose up -d --wait   # --wait blocks until the healthcheck passes
```

This starts the `vital-postgres` container (`postgres:16-alpine`) with **hardcoded** credentials
`vital`/`vital`/`vital` on port `5432`, data persisted in the `vital_pgdata` named volume. The
compose file is fully self-contained — `docker compose up` needs no env and is **not** wrapped in
`doppler run`. `/dev-start` runs this for you.

The host port is hardcoded to `5432` with **no override** (the `POSTGRES_PORT` env var is gone).
If `5432` is already taken by another local Postgres, **free it** (stop the other instance)
before bringing this one up.

Stop it with `docker compose down` (add `-v` to also wipe the volume).

### 2. Apply migrations

```sh
doppler run -- npm run migrate     # apply all pending migrations (idempotent)
```

`doppler run` injects `DATABASE_URL` (and the rest of the `dev` config) into the process
environment; the migrate runner reads `DATABASE_URL` straight from `process.env`. Running
`npm run migrate` **without** `doppler run` fails fast with a clear message (from
`scripts/check-database-url.js`) instead of an opaque libpq connection error. Re-running when
nothing is pending prints `No migrations to run!` and exits 0.

### 3. Author a migration

```sh
doppler run -- npm run migrate:create -- add_workouts_table   # creates migrations/<timestamp>_add-workouts-table.sql
doppler run -- npm run migrate:down                            # roll back the most recent migration
```

`migrate:create` only scaffolds a file and needs no connection, but running everything through
`doppler run` keeps the workflow uniform.

Migrations are **plain SQL** files in `migrations/`, with `-- Up Migration` and
`-- Down Migration` sections. Keeping them SQL (not TS) keeps migration content off the strict
TypeScript ESLint surface — the same lenient lane `server.js` uses.

## How it is wired

- **`pg` + `node-pg-migrate` are regular `dependencies`** (not devDependencies). The production
  migrate job builds under `NODE_ENV=production`, which prunes devDeps, so the runner must
  survive pruning. `pg` is pure-JS (no `pg-native`), and migrations/scripts never enter the
  Metro / `expo export` graph, so the client bundle and strict `.ts` lint are untouched.
- **`DATABASE_URL` is read from `process.env` everywhere** — there is no `--env-file` indirection.
  Locally, `doppler run -- npm run migrate` injects it; in production the native DO integration
  injects it into the `PRE_DEPLOY` job's environment. The same migrate scripts work unchanged in
  both places because both resolve `DATABASE_URL` the same way.
- **A fail-fast guard fronts the connecting migrate commands.** `migrate` (`up`) and
  `migrate:down` run `node scripts/check-database-url.js && …`, which exits 1 with an actionable
  message when `DATABASE_URL` is unset (the common "forgot `doppler run`" case, and the documented
  first-deploy "secret not yet synced" case). `node-pg-migrate` already errors on a missing
  connection — the guard just fails earlier and clearer. `migrate:create` is offline file
  scaffolding, so it carries no guard.

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
  most likely moment for `DATABASE_URL` to be empty (secret not yet synced). The
  `scripts/check-database-url.js` guard turns this into a clear "DATABASE_URL is not set" failure
  rather than an opaque connection error; confirm the Doppler sync, then redeploy.
- **Operator alternative.** To apply migrations out-of-band (or recover from the above), run them
  manually against the deployed app: `doctl apps run <app-id> --component migrate -- npm run migrate`.

### Migration safety notes

- node-pg-migrate wraps the pending batch in a single transaction by default and takes an
  advisory lock, so concurrent or interrupted runs don't corrupt state. At `instance_count: 1`
  with a single job this is already safe; the lock covers future scale-up.
- A migration that uses `CREATE INDEX CONCURRENTLY` (or anything that can't run inside a
  transaction) must opt out of the per-migration transaction — add the
  `-- node-pg-migrate "noTransaction"` directive at the top of that migration file.
