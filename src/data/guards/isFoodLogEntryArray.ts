import { type FoodLogEntry } from '@/data/food-types';
import { isFoodLogEntry } from '@/data/guards/isFoodLogEntry';

/** Guard for the `GET /api/me/food-log` response — a `FoodLogEntry[]` (032). */
export function isFoodLogEntryArray(value: unknown): value is FoodLogEntry[] {
  return Array.isArray(value) && value.every(isFoodLogEntry);
}
