# Proposal: usda-household-portions

**Date**: 2026-06-24
**Status**: Shipped (2026-06-24)

## Goal

Make it easy to log a food in a **common consumer serving** instead of only grams. Today a USDA
search hit exposes just a `100 g` base (plus the food's top-level gram `servingSize` when USDA
gives one), so a beverage like **"Iced Coffee, brewed"** — which has `servingSize: null` — offers
**only "100 g"**, and there is no sane way to translate that to a 16 oz coffee. This unit surfaces
USDA's own **household portions** (`foodMeasures[]`: "1 cup (8 fl oz)" → 240 g, "1 fl oz" → 30 g,
"1 small/medium/large", each with an authoritative `gramWeight`) as selectable serving chips, so
the user picks "1 cup (8 fl oz)" × 2 (or "1 fl oz" × 16) rather than reverse-engineering grams.

This is an additive enrichment of the **032 food-tracking foundation** USDA search proxy. It
changes only how `servingOptions` are built server-side; the response shape, the macro math, the
schema, and the client chip UI are all unchanged and absorb the richer list for free.

## Why

The 032 search proxy only read `food.servingSize` (and only when its unit was `g`). Generic FNDDS
foods — exactly the beverages and prepared dishes where grams are least intuitive — carry no
top-level `servingSize`, so they collapse to "100 g". Yet the **same search response** already
includes a `foodMeasures[]` array of authoritative household measures with gram weights and a USDA
`rank`. We are discarding the precise data that solves the problem. Reading it is the smallest,
most accurate fix: the gram weights come straight from USDA (no density guessing), and because
macros are stored per-100 g × chosen grams (032), no calculation changes.

## Approach

Enrich the server-side search mapper to read USDA `foodMeasures[]` into `servingOptions`.

### New pure helper — `src/server/usda-serving-options.ts`

A pure, unit-testable `buildServingOptions(food: unknown): FoodServingOption[]` (mirrors the
existing pure helpers `usdaNutrientValue` / `buildUsdaSearchUrl`; knowledge 012 test discipline).
The measure-parse loop is **inlined** into this one function rather than split into a second named
helper, because the `local/single-declaration` strict-lint rule (knowledge 002) counts every
top-level declaration. From an `unknown` USDA food object it returns, in this order:

1. **Household portions** from `food.foodMeasures[]`, each narrowed cast-free: an object with a
   non-empty `disseminationText` (string) and a finite `gramWeight > 0`. Sorted by USDA `rank`
   ascending (USDA's own display preference). The catch-all `"Quantity not specified"` measure is
   filtered out. Deduped by label (case-insensitive). Capped at **6** portions so the chip row
   can't explode.
2. The food's top-level gram `servingSize` (the existing behavior — kept), if present and not a
   duplicate of a portion already added.
3. The **`100 g` base** — always last, as the uniform fallback.

Leading with household portions means the default selected chip (`servingIndex = 0`) is a real
consumer portion whenever USDA exposes one, and falls back to `100 g` only when it doesn't —
directly serving the goal. The label is USDA's `disseminationText` verbatim ("1 cup (8 fl oz)"),
which is already consumer-readable.

### `src/server/usda-search.ts`

Replace the inline `servingOptions` construction (the `[{ '100 g' }]` seed + the `servingSize`
push) with a single call to `buildServingOptions(food)`. Nothing else in the mapper changes.

### Unchanged (verified)

- `FoodServingOption` is `{ label, grams }` — the new options fit it; **no type change**.
- `isFoodServingOption` / `isFoodSearchResult` already validate a non-empty array of `{label,
  grams>0}` — **no guard change**; the client still narrows the response.
- `FoodSearchPanel` already `.map`s over `servingOptions` into wrapping chips and multiplies
  per-100 g × `option.grams` × qty — **no client change**; more chips just render.
- No schema / migration, no route change (`me-food-search-get` passes results straight through),
  no public-interface change.

### Approaches considered (rejected)

- **Client-side universal unit picker** (oz / fl oz / cup / tbsp with density assumptions) —
  rejected: fl-oz→grams needs per-food density, which is wrong for most solids; introduces a
  cross-cutting unit-conversion contract and real inaccuracy.
- **Hardcoded common-beverage volume presets** — rejected: not data-driven, won't generalize
  across foods, arbitrary gram weights.

## Success criteria

1. A search hit with `foodMeasures[]` (e.g. "Iced Coffee, brewed") returns `servingOptions`
   containing its household portions ("1 cup (8 fl oz)", "1 fl oz", "1 small/medium/large") with
   USDA's gram weights, ordered by `rank`, **plus** a trailing `100 g` base.
2. The `"Quantity not specified"` catch-all measure is excluded; duplicate labels are deduped;
   no more than 6 household portions are emitted.
3. A hit with **no** `foodMeasures` still returns at least the `100 g` base (and its gram
   `servingSize` when present) — i.e. no regression from 032 behavior.
4. Macros are unchanged: the client still computes per-100 g × chosen grams × qty; picking
   "1 cup (8 fl oz)" yields 240 g worth of macros at qty 1.
5. `buildServingOptions` has a unit test (`src/server/usda-serving-options.test.ts`, node:test +
   tsx) covering: portions parsed & rank-ordered, junk filtered, dedup, cap, and the
   no-foodMeasures fallback. `npm run lint`, `npm run typecheck`, `npm test` all pass.

## Open Questions

None load-bearing. (Whether to append "· N g" to portion labels was considered and declined —
`disseminationText` is already consumer-readable and several measures already name a volume;
a reviewer may revisit as a SUGGEST.)
