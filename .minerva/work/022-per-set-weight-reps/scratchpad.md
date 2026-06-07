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
