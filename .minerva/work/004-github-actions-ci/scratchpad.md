# 004 — GitHub Actions CI · scratchpad

## Panel decisions 2026-05-31

- [3/3 accept] scope check: single work unit (one ci.yml wiring four pre-existing
  gate commands; tightly coupled, low novelty)
- [1/3 accept — consensus failure, round 1] approach selection: skeptic+arbiter
  traced node_modules and found `expo export` does NOT generate `.expo/types` /
  `expo-env.d.ts` in SDK 56 → feared typecheck/lint would fail on fresh checkout
- [3/3 accept — round 2, after empirical disproof] approach selection: Approach A'
  (single job, no type-gen step). Verified on live repo: clean `npm ci` + all four
  gates pass with generated type files ABSENT (typecheck/lint/rules-test/export all
  exit 0). Folded in skeptic hardening: `permissions: contents: read`, exact
  `24.13.0` `.nvmrc`, ref-scoped `concurrency` cancel-in-progress, gate steps gated
  on install success, `name:`/step names.
- [3/3 accept] whole-proposal acceptance. Folded in skeptic concerns: softened Goal
  (workflow makes the CHECK red; merge-blocking needs deferred branch protection),
  reclassified "PR check goes green" as a ship-phase observation, pinned explicit
  concurrency group key.

Run totals so far: 4 panel decisions (one revision round on approach), 0 escalations.

## Key empirical evidence (de-risks the approach)

Run on the live repo from a clean `npm ci`, with `.expo/types` and `expo-env.d.ts`
absent (the exact fresh-CI-checkout condition):

- `npm run typecheck` → exit 0
- `npm run lint` → exit 0
- `npm run lint:rules-test` → 20/20 tests pass
- `npx expo export --platform web` → exit 0 (bundled 7 static routes + 1 API route)

`expo export` does not create the generated type files, and their absence does not
break any gate (TS non-matching `include` globs are empty, not errors). Therefore NO
type-generation step is required in CI.

## Log
