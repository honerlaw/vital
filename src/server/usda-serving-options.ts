/**
 * Build the selectable `servingOptions` for one USDA search hit (040; extends 032).
 *
 * The 032 mapper exposed only a `100 g` base plus the food's top-level gram `servingSize`. Generic
 * FNDDS foods — beverages and prepared dishes, exactly where grams are least intuitive — carry no
 * top-level `servingSize`, so they collapsed to "100 g" and a 16 oz coffee had no sane serving to
 * pick. But the SAME search response already carries a `foodMeasures[]` array of authoritative
 * household measures ("1 cup (8 fl oz)" → 240 g, "1 fl oz" → 30 g, "1 small/medium/large"), each
 * with a USDA `rank`. This reads them into `servingOptions` so the user picks a real portion.
 *
 * The food is an `unknown` parsed third-party body, so every field is narrowed cast-free (the same
 * discipline as `usdaNutrientValue`). Pure (no fetch, no env) so the mapping is unit-testable.
 *
 * Order: household portions first (by USDA `rank`), then the top-level gram `servingSize`, then a
 * trailing `100 g` base — so the default selected chip is a real consumer portion when USDA
 * exposes one, and falls back to `100 g` only when it does not. Macros stay per-100 g × the chosen
 * grams (032), so emitting more options changes nothing downstream.
 */
import { type FoodServingOption } from '@/data/food-types';

/** USDA's catch-all non-portion; never a real serving the user would pick. */
const QUANTITY_NOT_SPECIFIED = 'quantity not specified';
/** Keep the chip row bounded — generic foods can list many measures. */
const MAX_HOUSEHOLD_PORTIONS = 6;

interface RankedPortion {
  option: FoodServingOption;
  rank: number;
}

export function buildServingOptions(food: unknown): FoodServingOption[] {
  const options: FoodServingOption[] = [];
  const seenLabels = new Set<string>();
  const add = (option: FoodServingOption): void => {
    const key = option.label.trim().toLowerCase();
    if (seenLabels.has(key)) return;
    seenLabels.add(key);
    options.push(option);
  };

  if (typeof food === 'object' && food !== null) {
    // Household portions from `foodMeasures[]`, each narrowed cast-free.
    const measures = 'foodMeasures' in food ? food.foodMeasures : undefined;
    if (Array.isArray(measures)) {
      // `Array.isArray` narrows to `any[]`; re-typing as `unknown[]` (a safe assignment, no cast)
      // keeps each element `unknown` so member access stays guarded, not `any`.
      const entries: unknown[] = measures;
      const ranked: RankedPortion[] = [];
      for (const measure of entries) {
        if (typeof measure !== 'object' || measure === null) continue;

        const text = 'disseminationText' in measure ? measure.disseminationText : undefined;
        if (typeof text !== 'string' || text.length === 0) continue;
        if (text.trim().toLowerCase() === QUANTITY_NOT_SPECIFIED) continue;

        const gram = 'gramWeight' in measure ? measure.gramWeight : undefined;
        if (typeof gram !== 'number' || !Number.isFinite(gram) || gram <= 0) continue;

        const rawRank = 'rank' in measure ? measure.rank : undefined;
        const rank = typeof rawRank === 'number' && Number.isFinite(rawRank) ? rawRank : Infinity;

        ranked.push({ option: { label: text, grams: gram }, rank });
      }
      // Sort by USDA rank (its own display preference); unranked sink to the end.
      ranked.sort((a, b) => a.rank - b.rank);
      for (const { option } of ranked.slice(0, MAX_HOUSEHOLD_PORTIONS)) add(option);
    }

    // The food's top-level gram serving, if USDA exposes one (the 032 behavior, kept).
    const servingSize = 'servingSize' in food ? food.servingSize : undefined;
    const servingUnit = 'servingSizeUnit' in food ? food.servingSizeUnit : undefined;
    if (
      typeof servingSize === 'number' &&
      Number.isFinite(servingSize) &&
      servingSize > 0 &&
      typeof servingUnit === 'string' &&
      servingUnit.toLowerCase() === 'g'
    ) {
      add({ label: `${String(servingSize)} g`, grams: servingSize });
    }
  }

  // The uniform fallback basis — always present, always last.
  add({ label: '100 g', grams: 100 });
  return options;
}
