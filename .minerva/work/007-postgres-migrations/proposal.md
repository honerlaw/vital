# 007 — Database infrastructure: local Postgres + schema migrations (local & production)

## Status

Shipped (2026-05-31). Approved + delivered via `minerva:propose-ship-auto` consensus panels —
scope (revision → single unit), approach (revision → Approach A with wiring corrections),
whole-proposal (revision → 3/3); completion verified 3/3 (live: compose healthy, migration applied
+ idempotent, `doctl` spec validate, all gates green); review triage 0 high / 0 medium / 11 low
(all IGNORE); promote partition 2/3. No user escalations. Durable learnings promoted to
[[009-decision-postgres-node-pg-migrate]] and [[010-pattern-do-app-platform-migrations]]; forward
work in `followups.md`.

## Goal

Establish VITAL's database infrastructure so the team can run Postgres locally and evolve schema
with discipline:

1. A `docker-compose.yml` that starts a local Postgres for development.
2. A schema-migration mechanism (author + apply migrations) wired to apply in **both**
   environments — locally against the Compose Postgres, and in **production** on DigitalOcean
   (DO) App Platform.
3. An updated `dev-start` skill noting that local Postgres is brought up via Docker Compose.

**Out of scope (deliberate):** wiring the app's data-access layer, replacing mock data
(`src/data/programs.ts`), and any domain schema beyond one neutral proof-of-pipeline migration.
Live DO provisioning (creating the Managed Postgres instance and the Doppler `DATABASE_URL`
secret) is **operator-run**, consistent with 005's hosting boundary — there is no DO account in
this environment.

## Why

005 chose DO's full Node runtime specifically to enable an ordinary TCP Postgres later;
`.minerva/work/005-digitalocean-hosting/followups.md` lists "Database integration (DO Managed
Postgres)" as the next step, with the connection URL as a `RUN_TIME` Doppler secret (see
[[006-decision-digitalocean-app-platform-hosting]]). Before the app outgrows mock data — or the
in-flight auth/data work needs persistence — the team needs a reproducible local DB and an
**environment-symmetric** way to evolve schema. This unit lays that foundation without coupling
to any domain schema.

## Approach

**Approach A — `node-pg-migrate` + `pg`.** Selected over a hand-rolled runner (owning ordering /
transactions / locking / partial-failure is needless risk) and over Drizzle/an ORM (a typed TS
schema DSL is exactly the strict-`.ts`-lint surface we want to avoid for an infra task, and ORM
adoption is a separate decision).

1. **Local Postgres (Docker Compose).** `docker-compose.yml` with `postgres:16-alpine`, a named
   volume for persistence, host port `5432`, a `pg_isready` healthcheck, and credentials/db from
   env vars with **alphanumeric** dev defaults (`vital`/`vital`/`vital` — kept simple so the
   `DATABASE_URL` parses identically under Compose interpolation and Node's `--env-file` parser).
   Compose reads the local `.env` for overrides. The documented local flow uses
   `docker compose up -d --wait` so the healthcheck passes before `migrate` connects (plain
   `up -d` returns before Postgres is ready).

2. **Migration tooling.** `node-pg-migrate` + `pg` as **regular** `dependencies` (NOT
   devDependencies) with a why-comment: the production migrate job runs from a buildpack image
   that prunes devDeps (`NODE_ENV=production`), so the runner must survive pruning. `pg` is
   pure-JS (no `pg-native`/`libpq`), and migrations + scripts never enter the Metro / `expo
   export` graph, so the strict `.ts` ESLint config and the web export are untouched. Migrations
   live in `migrations/` as **plain SQL** (`node-pg-migrate create <name> --sql`), keeping
   migration content entirely off the strict-TS lint surface — the same `.js`/lenient lane the
   `server.js` precedent established (see [[007-pattern-expo-router-server-self-host]],
   [[001-constraint-strict-eslint-guardrails]]). node-pg-migrate owns the `pgmigrations` tracking
   table, ordering, advisory locking, and idempotent `up`.

3. **npm scripts.** `migrate`, `migrate:create`, `migrate:down`. The env-file flag is baked
   **directly onto the node-pg-migrate bin invocation** so it reaches the migrate process itself
   — e.g.
   `"migrate": "node --env-file-if-exists=.env node_modules/node-pg-migrate/bin/node-pg-migrate.js up"`
   (exact bin path confirmed during Work). It is **never** written as
   `node --env-file ... npm run migrate` (the flag would apply to npm, and the spawned migrate
   child would not load `.env` — a silent local-only failure masked in prod by Doppler). Locally
   this loads `.env`; in production no `.env` exists, so `--env-file-if-exists` is a non-fatal
   no-op and `DATABASE_URL` comes from Doppler-synced `process.env`. Add
   `engines.node: ">=20.12"` to `package.json` (the floor where `--env-file-if-exists` landed).

4. **Local flow.** `docker compose up -d --wait` → `npm run migrate`.

5. **Production apply (DO App Platform).** Add a **second component** to `.do/app.yaml`: a
   `jobs:` entry, `kind: PRE_DEPLOY`, that applies migrations before new web containers take
   traffic. A DO job is its **own component with its own build** — it does NOT inherit the web
   service's image or `node_modules`. So the job declares its own `github:` (same repo/branch),
   `environment_slug: node-js`, a **cheap** `build_command: npm ci --omit=dev` (NOT
   `npm run export:web` — the migrate job needs no Expo web build; `node-pg-migrate`/`pg` are
   regular deps so `--omit=dev` still installs them), `run_command: npm run migrate`,
   `instance_size_slug: basic-xxs`, and `DATABASE_URL` **declared** `scope: RUN_TIME`.
   `DATABASE_URL` (RUN_TIME) is also declared on the web service for when the app later connects.
   Per the existing app.yaml convention, `DATABASE_URL` is a **Doppler-declared key** (value
   populated by Doppler's native DO integration), never a hardcoded spec value — mirroring how
   `EXPO_PUBLIC_API_URL` is handled.

6. **One initial, domain-neutral migration** (`migrations/0001_*`) that proves the pipeline
   end-to-end without colliding with the in-flight auth work's eventual schema — enable the
   `pgcrypto` extension and create a trivial `app_meta(key text primary key, value text)` table.

7. **`dev-start` skill.** Add a step to bring Postgres up (`docker compose up -d --wait`) as part
   of the dev environment, note the local connection string, that data persists in the named
   volume, and `docker compose down` to stop it. Keep the existing Metro flow; treat Postgres as
   the second long-running dev process the skill already anticipated ("If more long-running dev
   processes are added later … extend the start/stop steps").

8. **Env + docs.** Add a bare `.env` line to `.gitignore` (the current `.env*.local` does NOT
   match a bare `.env`, which Compose and the migrate scripts read). Commit `.env.example`
   documenting all three consumers of the file: `POSTGRES_*` (Compose), `DATABASE_URL` (migrate),
   and `EXPO_PUBLIC_API_URL` (Metro). Add `docs/database.md` (local setup, authoring/applying
   migrations, the prod PRE_DEPLOY-job + Doppler `DATABASE_URL` wiring, and the verify-post-deploy
   caveats); link it from the DO runbook.

## Success criteria

1. `docker compose config` validates and `docker compose up -d --wait` brings up a **healthy**
   Postgres reachable on `5432` (verified live — Docker daemon available).
2. `migrations/` contains ≥1 SQL migration; `npm run migrate` applies it cleanly against the
   local Compose DB, is **idempotent** (run twice → the second run is a no-op), and the applied
   set is recorded in `pgmigrations` (verified live).
3. `package.json` exposes `migrate`, `migrate:create`, `migrate:down`; `pg` + `node-pg-migrate`
   are in `dependencies` (not devDependencies) with a why-comment; `engines.node` is set to
   `>=20.12`.
4. `.do/app.yaml` contains a PRE_DEPLOY `jobs:` component with its own
   `github:`/`environment_slug:`/cheap `build_command`/`run_command: npm run migrate` and a
   Doppler-declared `DATABASE_URL` (RUN_TIME); `DATABASE_URL` (RUN_TIME) is also declared on the
   web service; `doctl apps spec validate .do/app.yaml --schema-only` passes (verified live).
5. A bare `.env` is gitignored; `.env.example` is committed and documents the `POSTGRES_*`,
   `DATABASE_URL`, and `EXPO_PUBLIC_API_URL` vars; no secrets are committed.
6. `.claude/skills/dev-start/SKILL.md` documents bringing local Postgres up via
   `docker compose up -d --wait`.
7. Repo gates stay green: `npm run lint`, `npm run typecheck`, `npm run lint:rules-test` pass,
   and `expo export -p web` still builds. No inline lint disables; new Node scripts/config stay
   under the lenient `.js` lint per the `server.js` precedent.
8. `docs/database.md` documents the local + production migration flow and the verify-post-deploy
   caveats.

## Open Questions

1. **Prod-apply DO behaviors (verify-post-deploy / operator-run).** That a failed PRE_DEPLOY job
   blocks the deploy, the first-deploy Doppler `DATABASE_URL` timing for a brand-new component,
   and the buildpack's resolved Node major (must be ≥20.12 for `--env-file-if-exists`) cannot be
   exercised by a local `node` (per [[007-pattern-expo-router-server-self-host]] — buildpack
   behavior is verify-post-deploy). Documented in `docs/database.md`; the operator alternative is
   a manual `doctl apps run … npm run migrate` / console migration.
2. **Migration concurrency.** At `instance_count: 1` with a single PRE_DEPLOY job, concurrent
   apply is not a present risk; node-pg-migrate's advisory lock covers the forward case.
   Migrations needing `CREATE INDEX CONCURRENTLY` must opt out of the per-migration transaction
   (`-- node-pg-migrate "noTransaction"`); noted in `docs/database.md`.
3. **Merge sequencing.** The in-flight `006-clerk-auth` worktree also edits `.do/app.yaml` `envs:`
   and `package.json`; whichever merges second resolves a conflict in those files. Known, handled
   at PR/merge time — does not change this unit's design.
