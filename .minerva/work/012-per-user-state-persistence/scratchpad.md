# 012 — per-user-state-persistence · scratchpad

## Log 2026-06-05

- Second unit of the propose-ship-auto run that shipped 011 (PR #13, merged). Seed constraints
  came from 011's scope panel (recorded in `011-catalog-retry/followups.md` — now superseded by
  this proposal as the canonical copy).

## Implementation log 2026-06-05

- Implemented per proposal with two as-built deltas, both small and rule-forced:
  1. `state+api.ts` carries GET+PUT — two functions in one file trips `local/single-declaration`.
     Solution: implementations live in `src/server/routes/me-state-{get,put}.ts` (one function
     each); the route file is pure re-exports (exempt). New pattern worth promoting: how a
     multi-method Expo API route coexists with one-function-per-file.
  2. POST /api/me/sessions body gained `activeProgramId` — the upsert's INSERT arm must satisfy
     user_state.active_program_id NOT NULL for a first-time user; the conflict arm still updates
     only the cursor.
  Also: a shared `bootStatus(state)` helper (own file) derives the combined gate status instead
  of duplicating the two-status conditional at three call sites.
- Gates: lint ✓ typecheck ✓ test 35/35 ✓ export:web ✓; pg tokens absent from dist/client ✓.
- SC#2 verified on a THROWAWAY postgres:16-alpine (host port 5499): up → down → up all clean;
  atomic CTE smoke-tested directly (INSERT arm creates row w/ cursor, CONFLICT arm bumps cursor;
  both sessions appended). Why throwaway: host port 5432 is occupied by seekless-postgres
  (unrelated project); the auto-mode classifier correctly denied stopping it, and the compose
  port is intentionally non-overridable.
- SC#4 verified: server started with dummy env (requireAuth is fail-closed) — GET/PUT
  /api/me/state and POST /api/me/sessions all 401 unauthenticated; public /api/programs
  unchanged.
- SC#3 (five-scenario authed manual attestation) NOT performed in-run: requires a real Clerk
  sign-in + the app DB on 5432 (port held by seekless). Pre-declared reviewer-attested in the
  proposal; mechanical sub-parts covered (migration, CTE, 401s, offline suite).

## Provenance restoration (promote-panel M1)

- The worktree relative-path gotcha WAS hit this unit (omitted from the log above): the first
  in-worktree `DATABASE_URL=… npm run migrate` failed with Node `MODULE_NOT_FOUND` because the
  script invokes `node node_modules/node-pg-migrate/bin/node-pg-migrate.js` by literal relative
  path, which does not exist in a worktree (unlike import resolution, which walks up). Worked
  around with the parent repo's absolute node_modules path; promoted to 001's operational note
  with the contrast to 011's resolution-finds-stale mode.

## Panel decisions 2026-06-05

- [3/3 accept] scope: pinned at the run's joint scope panel (see 011 scratchpad history) — two
  sequential units; four binding 012 constraints + five Skeptic design notes.
- [2× revise → revision → 3/3 accept] approach A': prior round caught two HIGHs — finishSession
  is non-deterministic (internal new Date) with a (state)-only signature, and db.ts has no
  parameterization/transactions. Fixes: finishSession(state, nowISO) purification; query(text,
  params?); atomic data-modifying-CTE POST instead of a transaction helper/pool refactor.
  Residuals encoded: POST mirrors the reducer's live!==null guard; persist-after-normalize PUT
  carries the PRESERVED cursor (normalization never zeroes cursor — only SET_ACTIVE_PROGRAM
  does); RESET enumerates exactly five fields incl. live; per-status RETRY wording literal.
- [1 accept + 1 revise → arbiter accept] whole-proposal (round 2): Skeptic HIGH #2 (nowISO
  "stops short of finishSession") factually refuted — the Engine section already mandates the
  signature change and finishSession.ts is in the touched list; HIGH #1 adopted verbatim as
  binding amendment 9 (RESET dispatch deferred into an async callback, never synchronous in the
  effect body; transition-keyed deps + idempotent reducer case remain the runtime-loop guards).
  Logged Skeptic concerns to honor: apiFetch init extension named in-scope; honest ~11-13-file
  inventory; pg timestamptz arrives as a JS Date in the mapper guard; null-id + catalog-not-ready
  → DEFAULT_ACTIVE_PROGRAM_ID fallback; single RETRY action re-fires both effects.
- [3/3 accept] completion verification: SC#1/4/5/6 machine-verified independently by both
  panelists; SC#2 verified on a throwaway postgres (5432 held by an unrelated container —
  auto-mode correctly refused to stop it); SC#3 honestly marked reviewer-attested as the
  proposal pre-declared. Two findings adopted post-review (client-guard tests added → 39/39;
  redundant DROP INDEX removed; edited migration re-verified up/down/up); Arbiter ruled
  re-review unnecessary (test-only + no-op SQL).
- [skipped — small] review triage: no open findings above low after the completion-panel fixes
  (evidence: F1 guard tests — FIXED+verified; F2 DROP INDEX — FIXED+verified; F3 SC#3 manual —
  IGNORE, pre-declared). No load-bearing finding → no replan-vs-FIX.
- [1 accept + 1 revise → arbiter accept] promote partition: all Skeptic refinements adopted —
  CTE technique homed in 014 (017 cross-refs it); SC#3 steps go in the PR body (followups T1 is
  a pointer); 001 extension written as an explicit contrast with restored provenance (above);
  003 merge framed as extending the existing barrel bullet; 017 states the purity-for-mirroring
  rationale itself; 013 already carries the non-overridable-port caveat (no change).
- [skipped — small] TODO disposition: single unambiguous home (012/followups.md T1–T5 + PR-body
  attestation steps; 011 followups seed reduced to its pre-declared pointer).
