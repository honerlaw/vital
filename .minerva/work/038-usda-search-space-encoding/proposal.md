# 038 — USDA food search 400: encode spaces as %20, not `+`

## Status
Shipped (2026-06-24). Delivered via `minerva:propose-ship-quick` (main-model decisions; no
escalations). Implementation matched the Approach exactly — no divergence, no replan. Review
surfaced no findings; the `+`-space pattern is isolated to this one builder (`src/` has no other
`URLSearchParams` query-string construction). Durable learning promoted to
[[038-pattern-urlsearchparams-plus-space-gateway-400]] with a reciprocal link from
[[036-pattern-food-tracking-foundation]]. **Open: final confirmation against live USDA needs the
real `USDA_API_KEY` (DEMO_KEY is rate-limited to 429, which already proves the fixed form clears
the nginx 400); the no-`+` unit test is the CI-side guard.**

## Goal
Make the nutrition-tab food search (`GET /api/me/food-search` → `searchUsdaFoods` →
`buildUsdaSearchUrl`) actually reach USDA instead of 502'ing on every query once a
`USDA_API_KEY` is present. The route still returns 502 today even after the 032 hotfix
(commit `4bae14e`), because that hotfix fixed the wrong thing.

## Why
USDA FoodData Central's nginx gateway rejects the request URL the builder emits with a **400**,
so `searchUsdaFoods` throws and the route returns 502 ("Search unavailable") for every query.

The 032 hotfix blamed the comma-joined `dataType` value (`%2C` after `URLSearchParams` encoding)
and switched to repeated `dataType` params. But that diagnosis was wrong — verified live against
USDA, the comma form returns **200**. The real trigger is the `Survey (FNDDS)` data type:
`URLSearchParams.toString()` serializes its space as `+`, producing
`dataType=Survey+%28FNDDS%29`, and nginx rejects the `+%28` sequence with a 400. The hotfix kept
the `+`-space encoding, so the 400 — and the 502 — survived. Its regression test only asserted
"no `%2C`", which is why it passed while the bug persisted.

Reproduced live (DEMO_KEY), one variable at a time:

| Query-string fragment | USDA status |
|---|---|
| `dataType=Survey+%28FNDDS%29` (current builder) | **400** |
| `dataType=Survey%20%28FNDDS%29` (space as `%20`) | 200 |
| `dataType=Survey (FNDDS)` (raw) | 200 |
| `query=a+%28b%29` (isolated `+%28`) | **400** |
| `query=a%20%28b%29` | 200 |
| `dataType=SR+Legacy` (plain `+`, no adjacent paren) | 200 |
| `dataType=Foundation%2CSR+Legacy` (the blamed `%2C`) | 200 |

This was invisible to CI, which never hits the live USDA API (the known untested seam, noted in
032's scratchpad).

## Approach
In `src/server/build-usda-search-url.ts`, build the query string by hand with `encodeURIComponent`
(which emits `%20` for spaces) instead of `URLSearchParams` (which emits `+`). `dataType` stays as
repeated params. Pure function, no fetch / no env read, so the request-URL contract stays
unit-testable.

Rewrite the regression test to pin the *actual* contract: the URL contains no `+` and contains
`Survey%20(FNDDS)`. Keep the `%2C`-absent assertion as a harmless guard. The old test asserted only
the red-herring `%2C` property, so it passed against the broken builder — the new assertion fails
against the old builder and passes against the fix.

### Considered, rejected
- **Post-hoc `.replace(/\+/g, '%20')` on `URLSearchParams.toString()`.** Works, but obscures *why*
  the replacement exists; the manual builder makes the `%20`-not-`+` contract self-evident.
- **Drop the `Survey (FNDDS)` data type to dodge the space.** Loses a whole generic-food source
  (FNDDS survey foods) for no reason — the encoding is the bug, not the data type.

## Success criteria
1. `buildUsdaSearchUrl(key, query)` output contains no `+` and contains `dataType=Survey%20(FNDDS)`.
2. `dataType` still appears as three repeated params (`Foundation`, `SR Legacy`, `Survey (FNDDS)`);
   `api_key`, `query`, `pageSize=25` unchanged.
3. The regression test asserts the no-`+` contract (fails against the old builder, passes against
   the fix).
4. `npm test` green (full suite); `npm run lint` clean; no NEW `tsc` errors vs. baseline (the three
   pre-existing Expo-Router typed-route errors in `(tabs)/index.tsx`, `nutrition.tsx`, `programs.tsx`
   are unrelated and present on a clean tree).

## Open Questions
- Final confirmation against the live USDA API requires the real `USDA_API_KEY` (DEMO_KEY is now
  rate-limited to 429 — which itself proves the fixed URL form gets *past* the nginx 400). The
  unit test guards the URL shape (no `+`), the best proxy without a live integration test in CI.
