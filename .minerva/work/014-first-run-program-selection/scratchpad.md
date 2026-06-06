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
