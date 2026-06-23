/**
 * Maps a raw `food_log_entries` row (every column `unknown`) to the typed `FoodLogEntry` (032),
 * mirroring `user-program-mapper`'s discipline: each field validated at runtime, a non-conforming
 * row throws so the route fails rather than serving malformed data. The SELECT casts uuid/date/
 * numeric columns to text (`id::text`, `logged_on::text`, `calories::text`, …) so `id` and
 * `loggedOn` arrive as strings and the numerics route through `numericColumn`. No `pg` import, so
 * it is unit-testable offline.
 */
import { type FoodLogEntry } from '@/data/food-types';
import { isFoodSource } from '@/data/guards';
import { type UnknownRow } from '@/server/db';
import { numericColumn } from '@/server/numeric-column';

export function rowToFoodLogEntry(row: UnknownRow): FoodLogEntry {
  const id = row['id'];
  const loggedOn = row['logged_on'];
  const name = row['name'];
  const servingLabel = row['serving_label'];
  const source = row['source'];
  const sourceRef = row['source_ref'];

  if (typeof id !== 'string') throw new Error('food_log_entries.id is not a string');
  if (typeof loggedOn !== 'string') throw new Error('food_log_entries.logged_on is not a string');
  if (typeof name !== 'string') throw new Error('food_log_entries.name is not a string');
  if (typeof servingLabel !== 'string') {
    throw new Error('food_log_entries.serving_label is not a string');
  }
  if (!isFoodSource(source)) throw new Error('food_log_entries.source is not a FoodSource');
  if (sourceRef !== null && typeof sourceRef !== 'string') {
    throw new Error('food_log_entries.source_ref is not a string or null');
  }

  return {
    id,
    loggedOn,
    name,
    servingLabel,
    source,
    sourceRef,
    quantity: numericColumn(row['quantity'], 'quantity'),
    calories: numericColumn(row['calories'], 'calories'),
    proteinG: numericColumn(row['protein_g'], 'protein_g'),
    carbsG: numericColumn(row['carbs_g'], 'carbs_g'),
    fatG: numericColumn(row['fat_g'], 'fat_g'),
  };
}
