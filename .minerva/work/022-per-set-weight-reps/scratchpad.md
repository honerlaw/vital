# Scratchpad: 022-per-set-weight-reps

## Panel decisions 2026-06-07

- [2/3 accept v1 → 3/3 accept v2] scope check: single unit (skeptic round-1 dissent folded:
  coercion lives in pure updateSet not finishSession; 020-style absent-accept/malformed-400
  validator; ONE shared isSetEntry guard family with finite/non-negative discipline)
- [1/3 accept v1 → 3/3 accept v2] approach selection: A jsonb-denormalized per-set records
  (rejected: B normalized set table — first hard FK violates 017 no-FK convention, CTE
  complexity, premature analytics; C per-exercise weight + AMRAP-only reps — cannot represent
  the verbatim per-set request). Round-1 pins closed in revision: best-effort read path (one
  malformed set_log must not 500 history/brick boot), unit denormalized as 'lb', persist ALL
  set rows. Carried obligations: SELECT_SESSIONS must add set_log column; parseSchemeReps tested
  against live migration-seed vocab; isSetEntry exercised on the write path.
- [1/3 accept v1 → 1/3 accept v2 → escalated to user] whole-proposal acceptance: round-1 fixes
  folded (U+00D7 separator named; 16-scheme live vocab enumerated; SC#7 corrected — determinism
  test rewritten not "unchanged"; full edit surface named incl. actions.ts + engine/index.ts;
  lint-forced new component files budgeted; zip-by-index invariant stated; strict-writer/
  tolerant-reader asymmetry stated). Residual escalated question: client-side hydration failure
  semantics for malformed per-set data. User chose: degrade symmetrically (both boundaries drop
  the malformed optional field, keep the core entry; boot can never brick on set data).
  Escalation counter: 1/3.

## Implementation notes 2026-06-07

- Routine divergence (detail-level, not load-bearing): `set_log` stores the wrapper object
  `{"unit":"lb","exercises":[...]}` with DEFAULT `'{}'::jsonb` instead of the proposal's bare
  array + `'[]'`. Reason: a bare array has no home for `unit`, which would defeat the unit
  pin's whole purpose (self-describing rows, no future backfill). Read semantics unchanged in
  spirit: `'{}'` / absent / empty exercises → optional field omitted.
- Prefill realized as placeholder + commit-on-toggle (not a mount-time text seed): fallbacks
  render as input placeholders and are committed only when the set is toggled done with the
  field still blank. A mount-time seed could not implement "weight prefills from prior set"
  (all rows mount together at session start, before any weight exists); placeholders are
  live-derived but never overwrite typed/committed values, so the no-cascade pin holds.
- `Screen`'s ScrollView gained `keyboardShouldPersistTaps="handled"` — without it the done
  toggle eats the first tap dismissing the numeric keyboard.
- Migration smoke-tested against a throwaway postgres:16-alpine (up → down → up, column +
  default verified), NOT against the doppler-managed DB (permission classifier denied; the
  throwaway test covers the SQL). Local `npm ci` run inside the worktree.
- Old-fixture note: pre-022 `finishSession.test.ts` used `completed: [[true]]` (misaligned
  with the 2-exercise day anyway); rewritten fixtures now mirror the startSession seed shape.
