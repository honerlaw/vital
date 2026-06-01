---
name: dev-start
description: Bring up the VITAL dev environment — the local Postgres (Docker Compose) and the Expo dev server (Metro) — in the background, restarting the dev server if it is already running, with an optional cache-clear. Use when the user runs /dev-start, asks to start / restart / boot the dev server, Metro bundler, or local database, or wants a fresh-cache (clean) restart.
---

# dev-start

Bring the VITAL development environment up in the background. If it is already
running, restart it cleanly. Optionally clear the Metro bundler cache on the way up.

The dev environment is **two** long-running pieces:

1. **Local Postgres**, run via **Docker Compose** (`docker compose up -d --wait`,
   container `vital-postgres`, default port `5432`). This is how you get a database
   to connect to locally; data persists in the `vital_pgdata` volume across restarts.
2. The **Expo dev server** (`expo start`, Metro on port `8081`). This is an Expo
   SDK 56 + Expo Router project — keep to the SDK 56 CLI (`npx expo …`).

Postgres is brought up first (idempotently — leave it running across dev-server
restarts), then the Expo dev server. If more long-running dev processes are added
later, extend the start/stop steps below to cover each one.

## Argument

The skill takes one optional argument that requests a cache clear before start:

- **No argument** → normal start/restart.
- **`clean`** (also accept `clear`, `cache`, `--clear`, `-c`) → start with
  `--clear`, which resets the Metro bundler cache. Use this when the bundler is
  wedged (stale modules, "unable to resolve", phantom errors after a dep change).

Anything else: treat as no cache clear and mention you ignored the unrecognized
argument.

## Procedure

0. **Bring up local Postgres (Docker Compose).** From the project root, run
   `docker compose up -d --wait`. `--wait` blocks until the `pg_isready`
   healthcheck passes, so anything that connects (e.g. the migrate runner) won't hit
   a cold-start "connection refused". This is idempotent — if `vital-postgres` is
   already healthy it returns immediately; do **not** restart it on a dev-server
   restart. The compose file hardcodes `vital`/`vital`/`vital` on port `5432` and
   reads **no** env — run `docker compose up` bare (not via `doppler run`). Requires
   Docker to be running; the host port `5432` is **not** overridable, so if it is
   already taken by another local Postgres, free it (stop the other instance). If the
   Docker daemon is down, surface that and suggest starting Docker rather than
   retrying. To apply schema after it is up, run `doppler run -- npm run migrate`; to
   stop the DB later, `docker compose down` (add `-v` to wipe the volume). See
   `docs/database.md`.

   **Doppler prerequisite (env / secrets).** Local env vars come from Doppler via the
   CLI, not a `.env` file. A first-time developer must install the Doppler CLI and run
   `doppler login` then `doppler setup` once (the committed `doppler.yaml` pins
   `vital`/`dev`). Migrations and the Expo dev server are launched through
   `doppler run -- …` so they receive `DATABASE_URL` / `EXPO_PUBLIC_*` from the `dev`
   config. If a stale local `.env` / `.env.local` exists, remove it — Expo would
   otherwise inline its values into the client bundle. If `doppler run` reports it is
   not set up, surface the `doppler login` / `doppler setup` steps rather than falling
   back to a `.env`.

1. **Detect an already-running dev server.** Check both signals:
   - Claude Code background tasks: `TaskList` — look for a running task whose
     command is `expo start` (started by a previous `/dev-start`).
   - The Metro port: `lsof -ti tcp:8081` (macOS/Linux). A PID means something is
     bound to `8081`. On Windows use `netstat -ano | findstr :8081`.

2. **If a server is running, stop it (restart semantics).**
   - If it is a Claude Code background task, stop it with `TaskStop`.
   - Also free the port in case of a detached/stale process:
     `kill $(lsof -ti tcp:8081)` (macOS/Linux), or `taskkill /PID <pid> /F`
     (Windows). Tolerate "no such process" — if nothing was listening, continue.

3. **Start the dev server in the background.** Run via the Bash tool with
   `run_in_background: true` so it does not block. Wrap in `doppler run` so Metro
   inlines `EXPO_PUBLIC_*` from the Doppler `dev` config:
   - Normal: `doppler run -- npx expo start`
   - Cache clear (argument given): `doppler run -- npx expo start --clear`

   Run it from the project root. Do not wait for it to exit — it is a long-lived
   server.

4. **Confirm and report.** Give the dev server a moment to boot, then verify it
   is up (`lsof -ti tcp:8081` returns a PID, or the background task log shows the
   Metro "Waiting on http://localhost:8081" / QR-code banner). Tell the user:
   - whether this was a fresh start or a restart,
   - whether the cache was cleared,
   - that Postgres is up (`vital-postgres`, `docker compose ps`) and on which port,
   - that Metro is on `http://localhost:8081`,
   - how to watch logs (read the background task's output) and that pressing
     `i` / `a` / `w` in the Expo CLI opens iOS / Android / web.

## Notes

- `--clear` (alias `-c`) is the SDK 56 flag that resets the Metro cache; prefer
  it over manually deleting cache directories.
- Keep this idempotent: running `/dev-start` repeatedly should always leave
  exactly one dev server running, never a pile of orphaned Metro processes — that
  is the whole point of the detect-and-stop step.
- If `doppler run -- npx expo start` fails immediately, distinguish the cause:
  missing deps → suggest `npm install`; Doppler not set up (`doppler run` errors) →
  suggest `doppler login` / `doppler setup`. Don't silently retry or fall back to a
  `.env`.
- Postgres and Metro are independent: a wedged Metro (`/dev-start clean`) does not
  require touching the database, and `docker compose down` does not stop Metro.
  Leave Postgres running across dev-server restarts.
