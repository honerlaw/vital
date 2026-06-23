import { type FoodSearchResult } from '@/data/food-types';
import { isFoodSearchResult } from '@/data/guards/isFoodSearchResult';

/** Guard for the `GET /api/me/food-search` response — a `FoodSearchResult[]` (032). */
export function isFoodSearchResultArray(value: unknown): value is FoodSearchResult[] {
  return Array.isArray(value) && value.every(isFoodSearchResult);
}
