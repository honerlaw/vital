# 008 — Doppler-sourced local env + hardcoded local Postgres compose

## Status

Draft

## Goal

Local development sources **every** environment variable from Doppler via the Doppler
CLI (`doppler run`), and the local Postgres `docker-compose.yml` **hardcodes** the
credentials and port with no env-var overrides. Production is unchanged — it already
gets every secret from Doppler's native DigitalOcean App Platform integration.

## Why

Today a single gitignored `.env` (copied from `.env.example`) is the local source of
truth for three consumers:

1. **Docker Compose interpolation** — `POSTGRES_USER/PASSWORD/DB/PORT` via
   `${VAR:-default}` configure the local container.
2. **The migrate runner** — `npm run migrate` reads `DATABASE_URL` via
   `node --env-file-if-exists=.env`.
3. **Expo / Metro** — `expo start` reads `EXPO_PUBLIC_*` and inlines them into the
   client bundle.

Production already manages every secret in Doppler; the native DO integration writes
them into `process.env`, so the running container reads them straight from `process.env`
with **no Doppler CLI in the image** (see `docs/deploy-digitalocean.md`). Moving local
dev onto Doppler gives **one** source of truth that mirrors prod's `process.env` model
and removes loose on-disk secrets. Hardcoding the Compose creds removes the only reason
Compose ever needed `.env` (the `POSTGRES_*` vars) and makes the local DB identity
deterministic — `docker compose up` then needs no env at all.

## Approach

Local dev uses the Doppler CLI; production stays Doppler-CLI-free (native integration).
The unifying invariant: **`DATABASE_URL`/`EXPO_PUBLIC_*` are read from `process.env`
everywhere** — injected by `doppler run` locally, by the native DO integration in prod.

1. **Hardcode `docker-compose.yml`.** Replace all `${POSTGRES_*:-...}` interpolation
   with literals: user/password/db = `vital`, port mapping `5432:5432`, healthcheck
   `pg_isready -U vital -d vital`. No `${...}` remains. Consequence: `docker compose up`
   reads no env and needs no `doppler run` wrapper.

2. **Local env via the Doppler CLI.** Developers run `doppler run -- npm run migrate`
   and `doppler run -- npx expo start`. `docker compose up -d --wait` stays bare
   (Compose is self-contained now).

3. **Migrate scripts read `DATABASE_URL` from `process.env` only.** Drop
   `--env-file-if-exists=.env` from all three migrate scripts (`migrate`,
   `migrate:create`, `migrate:down`). Add a committed `scripts/check-database-url.js`
   that exits 1 with a clear message naming `DATABASE_URL` and pointing at
   `doppler run -- npm run migrate`; chain it before the `node-pg-migrate` bin on the
   **connecting** commands only (`up` and `down` — `create` is offline file
   scaffolding). The guard is **prod-safe**: in the DO `PRE_DEPLOY` migrate job
   `DATABASE_URL` is present (RUN_TIME, native integration), so it passes; it also turns
   the documented "first-deploy `DATABASE_URL` empty" case into an actionable message
   instead of an opaque libpq connection error. (Note: `node-pg-migrate` already exits 1
   on unset `DATABASE_URL`; the guard adds an **earlier exit + clearer message**, not new
   safety.)

4. **Commit `doppler.yaml`** pinning `setup: { project: vital, config: dev }` so
   `doppler setup` is non-interactive. (Verify at implementation time that the installed
   Doppler CLI consumes the committed file; correct the doc to the right file/shape if
   it does not.)

5. **Retire `.env` as the local mechanism.** Delete `.env.example`. Keep `.env` and
   `.env*.local` gitignored. Docs **imperatively** instruct deleting any stray local
   `.env`/`.env.local`, because Expo's auto-dotenv would otherwise inline a stale
   `EXPO_PUBLIC_*` into the client bundle for any key Doppler did not set. (The work
   happens in a git worktree where `.env` is never checked out; the user's separate main
   checkout still has one — deleting it there is a hand-off instruction, not an agent
   action.)

6. **Doc / skill sweep.** Update every surface that teaches the `.env` flow:
   - `docs/database.md` — replace `cp .env.example .env` + the `--env-file-if-exists`
     teaching (incl. the Node ≥ 20.12 caveat near the end) with the Doppler bootstrap
     (`doppler login` → `doppler setup` → `doppler run -- npm run migrate`); document the
     `scripts/check-database-url.js` guard; document the **5432 collision resolution**
     (free port 5432 / stop the other local Postgres — the `POSTGRES_PORT` override is
     intentionally gone).
   - `docs/deploy-digitalocean.md` — note local dev uses the Doppler **CLI** while prod
     uses the **native integration**; both land in `process.env`.
   - `.claude/skills/dev-start/SKILL.md` — Compose needs no `.env`; Expo via
     `doppler run -- npx expo start`; add a `doppler login` + `doppler setup` onboarding
     prereq; replace the "set `POSTGRES_PORT` in `.env`" port-conflict guidance with
     "free 5432".
   - `README.md` — light touch: change the getting-started `npx expo start` to
     `doppler run -- npx expo start` and add a one-line pointer to `docs/database.md` for
     backend / Doppler / migrate setup.

7. **Operator prerequisite (out of repo, per convention).** A Doppler `dev` config
   populated with the local values — notably
   `DATABASE_URL=postgres://vital:vital@localhost:5432/vital`, plus `EXPO_PUBLIC_*` and
   `CLERK_*` for full local auth. This mirrors how units 005/006/007 kept live
   provisioning / secret population operator-run and out of the repo.

### Approaches considered

- **A — CLI-wrap, keep the env-file flag.** Smallest diff, but leaves a dual-source
  `DATABASE_URL` (a stale `.env` could shadow Doppler) and keeps docs teaching a flag
  the change is trying to retire. Rejected: keeps the footgun.
- **B′ — CLI-wrap + unify on `process.env` (chosen).** Drops the flag so migrate reads
  `DATABASE_URL` only from `process.env` in both local and prod; adds the fail-fast
  guard; full doc sweep. Prod behavior is identical (the flag is already an inert no-op
  in prod).
- **C — Regenerate `.env` from `doppler secrets download`.** Reintroduces the very
  `.env` file the change exists to remove. Rejected.

## Success criteria

1. `docker-compose.yml` contains no `${...}` interpolation; user/password/db are literal
   `vital`, the port mapping is literal `5432:5432`, and the healthcheck is
   `pg_isready -U vital -d vital`. `docker compose config` resolves with **no `.env`
   present** (verified in the worktree / a clean checkout) and emits no
   "variable is not set" warnings.
2. No `--env-file-if-exists=.env` remains in `package.json`. The `up` and `down` migrate
   scripts chain `node scripts/check-database-url.js && …`; `migrate:create` does not.
   `scripts/check-database-url.js` names `DATABASE_URL` specifically and points to
   `doppler run -- npm run migrate`. `npm run typecheck`, `npm run lint`,
   `npm run lint:rules-test`, and `npm test` all pass.
3. No `doppler` token appears in any `package.json` script or in `.do/app.yaml`
   build/run commands (prod stays native-integration only). The `PRE_DEPLOY` migrate job
   still declares `DATABASE_URL` at `RUN_TIME`, so the guard passes in prod.
4. `doppler.yaml` is committed pinning `setup.project: vital` / `setup.config: dev`; the
   installed CLI's consumption of it is verified (or the doc is corrected to the right
   file/shape).
5. `.env.example` is removed; `.env` and `.env*.local` remain gitignored; no doc or skill
   instructs copying `.env`; docs imperatively instruct deleting any stray local
   `.env`/`.env.local` with the Expo-auto-dotenv rationale stated.
6. `docs/database.md`, `docs/deploy-digitalocean.md`, the dev-start skill, and
   `README.md` all describe the `doppler login` → `doppler setup` →
   `doppler run -- …` flow; the `--env-file-if-exists` teaching (incl. the Node ≥ 20.12
   caveat) is removed from `docs/database.md`; the 5432 collision resolution is
   documented; no dangling `.env.example` references remain.
7. The end-to-end local path is documented: `doppler login` → `doppler setup` →
   `docker compose up -d --wait` → `doppler run -- npm run migrate` →
   `doppler run -- npx expo start`.

## Open questions / accepted tradeoffs

- **Hardcoded host port 5432 collides on the current machine.** The user's main-checkout
  `.env` uses `POSTGRES_PORT=5434` because 5432 was already taken. Honoring the explicit
  "hardcode the port, no overrides" instruction means the override escape hatch is gone;
  the documented resolution is to free 5432 (stop the other local Postgres). Accepted per
  explicit user instruction.
- **The user must delete their main-checkout `.env`.** The agent works in a worktree and
  cannot reach the main checkout's gitignored `.env`; retiring it there is a hand-off
  instruction surfaced in the docs and the final report. No success criterion asserts the
  live `.env` is gone (unverifiable by the agent).
- **Operator must populate the Doppler `dev` config** with the local values before
  `doppler run -- …` works. Out-of-repo, per the 005/006/007 convention.
- **Knowledge entries 009 / 010** document the `--env-file-if-exists` flag in past tense.
  They are historical records — reconcile at promote (do not rewrite history mid-work);
  `docs/database.md` being corrected is the binding safeguard.
