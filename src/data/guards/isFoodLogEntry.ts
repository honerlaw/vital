import { type FoodLogEntry } from '@/data/food-types';
import { isNewFoodLogEntry } from '@/data/guards/isNewFoodLogEntry';

/**
 * Guard for a persisted diary entry (032): a `NewFoodLogEntry` plus a string `id`. Reuses
 * `isNewFoodLogEntry` so the persisted shape can't drift from the write shape, then adds the
 * server-minted id. Used client-side to validate the `GET /api/me/food-log` response.
 */
export function isFoodLogEntry(value: unknown): value is FoodLogEntry {
  return (
    isNewFoodLogEntry(value) && 'id' in value && typeof value.id === 'string' && value.id.length > 0
  );
}
