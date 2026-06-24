# Pattern: USDA household serving portions — read `foodMeasures[]`, not just top-level `servingSize`

- Type: pattern
- Date: 2026-06-24
- Work unit: 040-usda-household-portions
- Related: [[036-pattern-food-tracking-foundation]] (the search proxy this extends — 036 built
  `servingOptions` from only the `100 g` base + top-level gram `servingSize`; this enriches it),
  [[038-pattern-urlsearchparams-plus-space-gateway-400]] (same USDA `/foods/search` response, a
  different field of it), [[014-pattern-server-pg-access-expo-routes]] (the cast-free `unknown`
  narrowing idiom reused for the third-party measure objects), [[002-pattern-eslint-strict-config-gotchas]]
  (the `local/single-declaration` rule that forced the parse loop to be inlined rather than a
  second top-level function)

How VITAL made food serving sizes pickable as **common consumer portions** (040) instead of
forcing everything through "100 g".

## The problem: generic FNDDS foods have a `null` top-level `servingSize`

The 032 search proxy built `servingOptions` from exactly two sources: a hardcoded `100 g` base and
the food's **top-level** `servingSize` (only when its unit was `g`). But generic **Survey (FNDDS)**
foods — beverages and prepared dishes, precisely where grams are least intuitive — return
`servingSize: null`. So "Iced Coffee, brewed" collapsed to a single "100 g" option, and a 16 oz
coffee had no sane serving to translate to. Verified live against the USDA API (Doppler key).

## The fix: USDA already ships household measures in the SAME search response

Each search hit carries a `foodMeasures[]` array of authoritative household measures — for iced
coffee: `1 fl oz`/30 g (rank 1), `1 cup (8 fl oz)`/240 g (rank 2), `1 small`/360 g, `1 medium`/480 g,
`1 large`/600 g, plus a `Quantity not specified`/360 g catch-all. Each entry has:

- `disseminationText` — the consumer-readable label (used verbatim; already names the volume).
- `gramWeight` — the authoritative grams (no density guessing — this is why we read USDA's number
  rather than converting fl oz → g ourselves, which is wrong for most solids).
- `rank` — USDA's own display-preference ordering.

`buildServingOptions(food: unknown)` (`src/server/usda-serving-options.ts`, pure + unit-tested per
[[012-pattern-src-unit-tests-node-tsx]]) returns, in order: **household portions** (rank-sorted,
the `Quantity not specified` catch-all filtered, labels deduped case-insensitively, capped at 6),
then the top-level gram `servingSize` (032 behavior kept), then a trailing **`100 g`** base. Leading
with household portions makes the default-selected chip (`servingIndex = 0`) a real consumer portion
whenever USDA exposes one, falling back to `100 g` only when it doesn't.

## What did NOT have to change — the slim-result contract absorbed it

The win is that `FoodServingOption` is `{ label, grams }` and the macro math is already per-100 g ×
chosen grams (036). So enriching the list touched **nothing downstream**: the `FoodSearchResult`
type, the `isFoodServingOption` / `isFoodSearchResult` guards, the `me-food-search-get` route, and
the `FoodSearchPanel` chip UI (it already `.map`s wrapping chips and multiplies by `option.grams`)
were all unchanged. A pre-existing slim, uniform result shape let a real UX gap close as a
server-only change.

## Gotchas locked in by tests

- Unranked measures sort with a `Number.MAX_SAFE_INTEGER` sentinel, **not** `Infinity` — two
  unranked entries with `Infinity` hit `Infinity - Infinity = NaN` in the comparator (undefined
  sort order). Caught in review; regression-tested.
- The `local/single-declaration` strict-lint rule ([[002-pattern-eslint-strict-config-gotchas]])
  counts every top-level `function`/arrow-const, so the measure-parse loop is **inlined** into
  `buildServingOptions` rather than split into a second named helper; the nested `add` arrow is
  exempt (the rule only scans `Program.body`).
