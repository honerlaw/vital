# 012 — per-user-state-persistence · scratchpad

## Log 2026-06-05

- Second unit of the propose-ship-auto run that shipped 011 (PR #13, merged). Seed constraints
  came from 011's scope panel (recorded in `011-catalog-retry/followups.md` — now superseded by
  this proposal as the canonical copy).

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
