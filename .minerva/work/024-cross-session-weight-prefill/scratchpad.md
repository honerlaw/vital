# 024 — cross-session-weight-prefill · scratchpad

## Panel decisions 2026-06-07

- [skipped — small] scope check: single additive client-side unit (evidence: one engine
  helper + two component touches, no DB/API/schema change, no new public interface)
- [skipped — small] approach selection: history-derived prefill dominant (rejected: B
  catalog weight field — global catalog cannot hold per-user weights; C explicit
  default-weight settings — schema + API + settings UI for the same outcome with manual
  upkeep)
- [1/3 accept → revision round] whole-proposal acceptance v1: Proponent accept, Skeptic +
  Arbiter revise — load-bearing spec gaps: coalescing point unstated, done-filter asymmetry
  unjustified, false "entire catalog straight-set" premise, suffix fragmentation
  unacknowledged
- [3/3 accept] whole-proposal acceptance v2 (revised draft): all four prior critiques
  verified resolved against code; Arbiter folded in the workout.tsx `state.history` wiring
  note (now in proposal)

## Implementation notes 2026-06-07

- Non-load-bearing deviation from proposal: `workout.tsx` derives `historyWeights` as a
  plain const after the render gates instead of `useMemo` — the file has ZERO manual
  `useMemo` (house style: plain derivation, e.g. `sessionProgress(live)`), the React
  Compiler (`experiments.reactCompiler: true`, knowledge 004) auto-memoizes, and a hook
  would have to sit BEFORE the early-return gates with internal guards (hooks-before-gates
  contortion). Same intent (computed once per history/day change), conforming shape. Round-1
  panel already rated memoization placement an implementation note, not design.
- Coalesce implemented as `prior ? prior.weight : historyWeight` inside `priorWeight` —
  equivalent to the proposal's `priorWeight(si) ?? historyWeight` (the find predicate
  guarantees `prior.weight !== null`), keeps one return path.
- Test fixture: single `session` helper with `[done, weight]` tuple sets — the
  single-declaration lint rule allows only one top-level helper per test file (matches
  finishSession.test.ts / updateSet.test.ts shape).
- Verification: lint ✓ (--max-warnings 0), typecheck ✓, tests 74/74 ✓ (6 new).

## Panel decisions 2026-06-07 (completion)

- [3/3 accept] completion verification: all four success criteria honestly met — all three
  agents independently re-ran lint/typecheck/tests (74/74) and traced the UI chain; SetRow
  byte-for-byte unchanged (no 022 regression); criterion 2's no-device-run transparently
  disclosed, rests on unchanged 022 machinery (rated non-load-bearing). Two low notes:
  workout.tsx comment should cite hook-rules constraint over "house style" (fixed
  post-panel); device verification deferred.
