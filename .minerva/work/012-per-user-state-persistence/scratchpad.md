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
