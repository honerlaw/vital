---
name: dev-start
description: Start the VITAL Expo dev server in the background, restarting it if it is already running, with an optional cache-clear. Use when the user runs /dev-start, asks to start / restart / boot the dev server or Metro bundler, or wants a fresh-cache (clean) restart.
---

# dev-start

Bring the VITAL development environment up in the background. If it is already
running, restart it cleanly. Optionally clear the Metro bundler cache on the way up.

Today "everything" is a single process: the **Expo dev server** (`expo start`,
Metro on port `8081`). This is an Expo SDK 56 + Expo Router project — keep to the
SDK 56 CLI (`npx expo …`). If more long-running dev processes are added later
(e.g. an API server), extend the start/stop steps below to cover each one.

## Argument

The skill takes one optional argument that requests a cache clear before start:

- **No argument** → normal start/restart.
- **`clean`** (also accept `clear`, `cache`, `--clear`, `-c`) → start with
  `--clear`, which resets the Metro bundler cache. Use this when the bundler is
  wedged (stale modules, "unable to resolve", phantom errors after a dep change).

Anything else: treat as no cache clear and mention you ignored the unrecognized
argument.

## Procedure

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
   `run_in_background: true` so it does not block:
   - Normal: `npx expo start`
   - Cache clear (argument given): `npx expo start --clear`

   Run it from the project root. Do not wait for it to exit — it is a long-lived
   server.

4. **Confirm and report.** Give the dev server a moment to boot, then verify it
   is up (`lsof -ti tcp:8081` returns a PID, or the background task log shows the
   Metro "Waiting on http://localhost:8081" / QR-code banner). Tell the user:
   - whether this was a fresh start or a restart,
   - whether the cache was cleared,
   - that Metro is on `http://localhost:8081`,
   - how to watch logs (read the background task's output) and that pressing
     `i` / `a` / `w` in the Expo CLI opens iOS / Android / web.

## Notes

- `--clear` (alias `-c`) is the SDK 56 flag that resets the Metro cache; prefer
  it over manually deleting cache directories.
- Keep this idempotent: running `/dev-start` repeatedly should always leave
  exactly one dev server running, never a pile of orphaned Metro processes — that
  is the whole point of the detect-and-stop step.
- If `npx expo start` fails immediately (missing deps), surface the error and
  suggest `npm install` rather than silently retrying.
