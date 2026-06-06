# 014 — first-run-program-selection · scratchpad

## Panel decisions 2026-06-06

- [2/3 accept → revision round] scope check: single unit — round-1 Skeptic flagged spec
  gaps (getProgram null fallout, chooser unspecified, dayIndex, NOT-NULL caveat, RESET
  sentinel); folded in.
- [3/3 accept] scope check (revised): single client-only unit — one invariant flip
  (`activeProgramId: string → string | null`) with verified transitive closure.
- [2/3 accept → revision round] approach selection: B accepted by Proponent+Skeptic but
  Arbiter demanded four binding amendments (synchronous two-dispatch constraint;
  null-fallout enumeration; stale-id keeps converging — only no-row null asks; single
  switch mechanism, drop "Set as my program").
- [3/3 accept] approach selection (revised B′): nullable id where null = "never chose"
  only; stale non-null ids converge as today; Today render-fork chooser; single
  context-dependent detail CTA (Choose / Begin / Switch & begin).
- [3/3 accept] whole-proposal acceptance: all line references code-verified by panel;
  four mechanical fixes folded into the written proposal (new-and-revised test wording,
  programs.tsx named as no-change-needed, START_WORKOUT guard is tsc-compulsory,
  finishSession safe-by-narrowing note).

## Panel concerns 2026-06-06

- (approach Skeptic, logged) one global cursor zeroes progress on every switch; B′ adds a
  casual switch path that amplifies it — per-program cursors are the likely next request
  (knowledge 017 files it as an anticipated additive migration).
- (approach Skeptic, logged) the synchronous-batch claim for the two-dispatch switch
  holds only inside an event handler — pin with a code comment.
- (proposal Skeptic, logged) reducer.test.ts:22 and :103 assert the old laundering
  behavior and must be rewritten, not just supplemented.

## Implementation log 2026-06-06

- Implemented per proposal Approach 1–8 in commit `feat: first-run program selection +
  switch-on-workout-start`. No divergences from the proposal — every edit landed where the
  panels' code-verification predicted (the four sentinel sites, the two persist branches,
  the two throwing-getProgram sinks).
- Gates: `npm test` 41/41 pass (revised: keeps-a-present-id now seeds 'bbr' explicitly;
  null-id hydration asserts null in both orders; RESET asserts null; FINISH setup gains a
  SET_ACTIVE_PROGRAM step. New: HYDRATE_PROGRAMS null-stays-null; START_WORKOUT null
  no-op contract). `tsc --noEmit` clean. `eslint --max-warnings 0` clean.
- SC#5 verified: diff touches exactly 7 client files — no src/server/, src/app/api/, or
  migrations/ paths.

## Panel decisions 2026-06-06 (cont.)

- [3/3 accept] completion verification: all three agents independently ran the gates
  (41/41 tests, tsc clean, eslint --max-warnings 0 clean) and spot-checked the null
  guards, persist guards, FINISH narrowing, fork placement, and diff boundary. Zero
  falsifications; all findings low.

## Panel decisions 2026-06-06 (review)

- [2/3 accept (quorum met at 2 accepts; arbiter not convened)] review triage: F1 FIX
  (header row + Account link in chooser branch — sole sign-out path was unreachable on
  first run), F2 FIX-comment + behavioral followup, F3 FIX (p→program), F4 IGNORE
  (subsumed by F1), F5 folded into F2. Gates re-run green after fixes (41/41, tsc, lint).

## Review finding 2026-06-06

- FOLLOWUP (product decision, deferred): should CANCEL_WORKOUT revert a
  switch-committed-at-Begin? Today "Switch & begin" persists SET_ACTIVE_PROGRAM (new id,
  cursor 0) at the tap; cancelling the workout keeps the new program active at cursor 0
  and the previous program's cursor position is lost (single global cursor). A revert
  would need remember-previous-{programId, cursor} machinery — pairs naturally with the
  per-program-cursor followup from knowledge 017.
