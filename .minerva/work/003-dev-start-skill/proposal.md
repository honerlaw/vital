# 003 — dev-start skill

## Status

Draft — skill implemented locally on 2026-05-31; not yet committed/shipped (see scratchpad).

## Goal

Add a Claude Code project skill, `dev-start` (invoked as `/dev-start`), that starts
the VITAL development environment in the background, restarts it if it is already
running, and accepts an optional argument to clear the Metro bundler cache.

## Why

Managing the Expo dev server by hand is repetitive and easy to get wrong: starting
a second server while one is already bound to port 8081, leaving orphaned Metro
processes, or forgetting the `--clear` cache reset when the bundler wedges. A skill
encodes the runbook so the agent does it the same way every time, and so the
detect-and-restart behavior keeps exactly one server alive.

## Approach

Create `.claude/skills/dev-start/SKILL.md` as a pure agent runbook (no new
dependencies, no package.json changes). The skill:

1. Detects an already-running dev server via Claude Code background tasks
   (`TaskList`) and the Metro port (`lsof -ti tcp:8081`).
2. If running, stops it (`TaskStop` and/or freeing port 8081) — restart semantics.
3. Starts `npx expo start` as a background Bash task (`run_in_background: true`),
   using `npx expo start --clear` when the optional `clean` argument is supplied.
4. Confirms Metro is up on `http://localhost:8081` and reports start-vs-restart and
   whether the cache was cleared.

Rationale for this over alternatives:
- **vs. a Node/PID-file helper script:** Claude Code's native background-task
  tooling already tracks the process; a port check covers detached/stale servers.
  Reinventing PID tracking adds a dependency and failure modes for no gain.
- **vs. npm scripts only:** "Start in the background + restart if running" is
  awkward to do cross-platform in a plain npm script; the skill leans on the
  harness's background tasks instead. An `npm run dev` convenience wrapper could be
  a later follow-up if non-Claude usage is wanted.

Scope: single process today (the Expo dev server). The skill notes how to extend
the start/stop steps if more dev processes are added later.

## Success criteria

1. `.claude/skills/dev-start/SKILL.md` exists with valid frontmatter (`name`,
   `description`) and is discoverable as `/dev-start`.
2. The skill instructs starting `expo start` in the background (non-blocking).
3. The skill defines restart behavior: detect running server → stop → start.
4. The skill supports an optional cache-clean argument mapping to
   `expo start --clear`.
5. No production code changes; `npm run lint` and `npm run typecheck` remain green
   (the change is markdown-only, so they are unaffected).

## Open questions

- Should a companion `npm run dev` script be added for developers not using Claude
  Code? Deferred — out of scope for this unit; candidate follow-up.
- Does "everything" ever include more than the Expo dev server (e.g. a future API
  server)? Assumed no for now; the skill documents how to extend.
