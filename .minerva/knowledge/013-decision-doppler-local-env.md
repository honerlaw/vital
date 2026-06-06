# Decision: local dev sources env from Doppler (CLI); local Postgres compose is hardcoded

- Type: decision
- Date: 2026-05-31
- Work unit: 008-doppler-local-env
- Supersedes (in part): [[009-decision-postgres-node-pg-migrate]] (its "port 5432 overridable
  via `POSTGRES_PORT`" and the `--env-file-if-exists=.env` flow),
  [[010-pattern-do-app-platform-migrations]] (its "Buildpack Node major / `--env-file-if-exists`
  needs Node ≥ 20.12" caveat)
- Related: [[006-decision-digitalocean-app-platform-hosting]] (the native Doppler→DO integration),
  [[011-pattern-clerk-expo-core3-auth-and-endpoint-enforcement]] (the `CLERK_*` / `EXPO_PUBLIC_*`
  secrets this also sources),
  [[018-decision-eas-ios-release-workflow]] (EAS builds can't see Doppler — production
  EXPO_PUBLIC_* values live separately as EAS environment variables, now auto-mirrored
  from Doppler prd on every release by [[021-decision-gh-actions-ios-release-orchestration]])

Local development sources **every** environment variable from **Doppler via the Doppler CLI**
(`doppler run -- <cmd>`); production keeps using Doppler's **native DigitalOcean App Platform
integration**. There is **no `.env` file**. The local Postgres in `docker-compose.yml` is
**hardcoded** (`vital`/`vital`/`vital` on `5432`) with no env override.

## The invariant: code reads `process.env`; only the injector differs per environment

This is the reusable shape — any future secret (Stripe key, queue URL, …) follows it:

- App / server / migrate / Metro code always reads secrets from `process.env` (`DATABASE_URL`,
  `EXPO_PUBLIC_*`, `CLERK_*`). It never loads a `.env` file and never shells out to Doppler.
- The **injector** differs by environment: **locally** the Doppler **CLI** (`doppler run`)
  populates `process.env`; **in prod** Doppler's **native DO integration** writes app-level env
  vars. Same `process.env` contract on both sides.
- Therefore prod-run scripts (`npm run migrate`, `npm run serve`) MUST stay **Doppler-CLI-free**.
  The `doppler run` wrapper is applied by developers **at invocation**, never baked into shared
  npm scripts or `.do/app.yaml` commands — the prod image has no Doppler CLI. (Verified at promote:
  no `doppler` token in any `package.json` script or `.do/app.yaml` build/run command.)

## Local mechanics

- `doppler.yaml` (committed) pins `setup: { project: vital, config: dev }` so `doppler setup` is
  non-interactive (verified: CLI v3.76.0 prints "Auto-selecting project/config from repo config
  file"). One-time onboarding: `doppler login` → `doppler setup`; then run anything needing secrets
  through `doppler run -- <cmd>` (`doppler run -- npm run migrate`, `doppler run -- npx expo start`).
- **Operator prerequisite / onboarding gate.** The Doppler `dev` config must already be populated
  with the local values — notably `DATABASE_URL=postgres://vital:vital@localhost:5432/vital`, plus
  `EXPO_PUBLIC_*` and `CLERK_*`. Until it is, `doppler run` yields an empty/partial env, so this
  **hard-blocks every new developer's first run**. Provisioning it is an out-of-repo operator step,
  per the 005/006/007 convention.

## `docker-compose.yml` is hardcoded — no override

- Creds/port are literal `vital`/`vital`/`vital` on `5432:5432`; no `${...}` interpolation, no
  `.env`. `docker compose up` needs no env and is **not** wrapped in `doppler run` (it is fully
  self-contained). The local connection string is the fixed
  `postgres://vital:vital@localhost:5432/vital`.
- **Accepted tradeoff (explicit request):** the host-5432 collision escape hatch (`POSTGRES_PORT`)
  is gone. If 5432 is already taken, **free it** (stop the other local Postgres) — the port is no
  longer overridable.

## Migrate reads `process.env`; a fail-fast guard fronts the connecting commands

- The three migrate scripts dropped `--env-file-if-exists=.env`; `DATABASE_URL` is read from
  `process.env` only — the same way locally (`doppler run`) and in prod (native integration).
- `scripts/check-database-url.js` is `&&`-chained before the bin on the **connecting** commands
  (`migrate` = `up`, `migrate:down`); `migrate:create` is offline file scaffolding and is
  unguarded. **`node-pg-migrate` already exits non-zero on unset `DATABASE_URL`** — so the guard is
  purely an **earlier exit + clearer message** (it names `DATABASE_URL` and points at
  `doppler run`), not new safety. It is prod-safe: the `PRE_DEPLOY` migrate job has `DATABASE_URL`
  at RUN_TIME so it passes, and it converts the documented first-deploy "secret not yet synced"
  case into a legible failure instead of an opaque libpq connection error.

## Expo auto-dotenv footgun

- Expo's CLI auto-loads `.env`/`.env.local` into the bundle, so a **stray local `.env` silently
  inlines a stale `EXPO_PUBLIC_*` into the client bundle** for any key Doppler doesn't set.
  `.env.example` was removed; the docs imperatively instruct deleting any stray `.env`/`.env.local`;
  `.env`/`.env*.local` stay gitignored. (Doppler-injected `process.env` wins for keys it sets —
  dotenv is `override:false` — but keys Doppler does *not* set still leak from a stray file, which
  is why deletion is imperative, not advisory.)
