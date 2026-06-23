/**
 * Sum a day's diary entries into the four running totals (032). Pure reduce over the snapshotted
 * per-entry macros — the totals row and any later targets/dashboard read this one function so the
 * arithmetic can't drift between surfaces.
 */
import { type FoodLogEntry, type FoodMacros } from '@/data/food-types';

export const sumMacros = (entries: FoodLogEntry[]): FoodMacros =>
  entries.reduce<FoodMacros>(
    (total, entry) => ({
      calories: total.calories + entry.calories,
      proteinG: total.proteinG + entry.proteinG,
      carbsG: total.carbsG + entry.carbsG,
      fatG: total.fatG + entry.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
