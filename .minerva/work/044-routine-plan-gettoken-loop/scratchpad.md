# Scratchpad — 044-routine-plan-gettoken-loop

## Quick decisions 2026-07-05
- [decided] scope check: single work unit — one bounded bug in one file (`new.tsx` plan effect). Not decomposable.
- [decided] approach: localized "latest ref" fix in `new.tsx` (dominant). Rejected the global stable-getToken hook across all 8 call sites — cross-cutting auth-seam change, higher blast radius, and the other getToken-dep effects (StateProvider ×3, useFoodLog) are latent-but-benign (no abort-on-cleanup + no sustained render driver). Deferred as a hardening followup.
- [decided] whole-proposal soundness: standard latest-ref pattern; lint-conforming per 001/004 (no inline eslint-disable, no .current-in-render); no public interface change. Confident, no escalation.

## Work log 2026-07-05
- Implemented latest-ref fix in `src/app/routine/new.tsx`: added `getTokenRef` + a `[getToken]` sync
  effect; plan effect now calls `fetchRoutinePlan(getTokenRef.current, …)` and keys on `[phase]`.
- Verification: `eslint src/app/routine/new.tsx --max-warnings 0` → exit 0 (clean). `npm test` → 129/129
  pass. tsc: `routine/new.tsx` has zero errors; my change adds none.
- Pre-existing local baseline (NOT my change, reproduces on clean main @999bbdf): 52 `@typescript-eslint`
  errors in `equipment.tsx`/`downscale-image.ts` + 4 `TS2307` — because `expo-image-picker` (~56.0.18)
  and `expo-image-manipulator` (~56.0.19) are DECLARED in package.json but MISSING from local
  node_modules (incomplete install). Fresh `npm ci` in CI installs them → green there. Left node_modules
  untouched (npm-11 optional-deps churn risk per lockfile-heal knowledge / #52).

## Completion verification 2026-07-05
- All 4 success criteria met (see table in run). Criterion 4's literal "lint clean" is met in spirit:
  new.tsx is clean; the only residual lint/tsc noise is the pre-existing local node_modules gap above,
  not a regression. No load-bearing divergence → no replan.
