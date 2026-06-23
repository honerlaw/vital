import { type FoodSearchResult } from '@/data/food-types';
import { isFoodServingOption } from '@/data/guards/isFoodServingOption';
import { isMacroNumber } from '@/data/guards/isMacroNumber';

/**
 * Guard for one slim USDA search hit (032), used client-side to validate the
 * `GET /api/me/food-search` response. The four per-100 g macros must be finite and non-negative,
 * and `servingOptions` must be a non-empty array of valid options (the server always supplies at
 * least the `100 g` base).
 */
export function isFoodSearchResult(value: unknown): value is FoodSearchResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'fdcId' in value &&
    typeof value.fdcId === 'string' &&
    value.fdcId.length > 0 &&
    'name' in value &&
    typeof value.name === 'string' &&
    value.name.length > 0 &&
    'caloriesPer100g' in value &&
    isMacroNumber(value.caloriesPer100g) &&
    'proteinPer100g' in value &&
    isMacroNumber(value.proteinPer100g) &&
    'carbsPer100g' in value &&
    isMacroNumber(value.carbsPer100g) &&
    'fatPer100g' in value &&
    isMacroNumber(value.fatPer100g) &&
    'servingOptions' in value &&
    Array.isArray(value.servingOptions) &&
    value.servingOptions.length > 0 &&
    value.servingOptions.every(isFoodServingOption)
  );
}
