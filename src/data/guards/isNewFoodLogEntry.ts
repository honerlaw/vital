import { type NewFoodLogEntry } from '@/data/food-types';
import { isFoodSource } from '@/data/guards/isFoodSource';
import { isLocalDay } from '@/data/guards/isLocalDay';
import { isMacroNumber } from '@/data/guards/isMacroNumber';

// Bounds on the free-text fields so a crafted POST can't store an unbounded blob in `text`
// columns (the strict-writer boundary, 028). Generous enough for any real food name / serving.
const MAX_NAME = 200;
const MAX_SERVING_LABEL = 100;

/**
 * Strict-writer validator (028) for the `POST /api/me/food-log` body — also reused client-side to
 * type the value before sending. A malformed body fails the route with 400 rather than inserting
 * junk. `loggedOn` must be a real calendar day (`isLocalDay` — format AND validity, so an
 * impossible date is a 400, not a Postgres 500); `name`/`servingLabel` must be non-empty and
 * length-capped; `quantity` and the four macros must be finite and non-negative, and `quantity`
 * additionally `> 0` (a zero-serving row is meaningless — the macros may legitimately be 0);
 * `sourceRef` is a string or null.
 */
export function isNewFoodLogEntry(value: unknown): value is NewFoodLogEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    'loggedOn' in value &&
    isLocalDay(value.loggedOn) &&
    'name' in value &&
    typeof value.name === 'string' &&
    value.name.length > 0 &&
    value.name.length <= MAX_NAME &&
    'quantity' in value &&
    isMacroNumber(value.quantity) &&
    value.quantity > 0 &&
    'servingLabel' in value &&
    typeof value.servingLabel === 'string' &&
    value.servingLabel.length > 0 &&
    value.servingLabel.length <= MAX_SERVING_LABEL &&
    'calories' in value &&
    isMacroNumber(value.calories) &&
    'proteinG' in value &&
    isMacroNumber(value.proteinG) &&
    'carbsG' in value &&
    isMacroNumber(value.carbsG) &&
    'fatG' in value &&
    isMacroNumber(value.fatG) &&
    'source' in value &&
    isFoodSource(value.source) &&
    'sourceRef' in value &&
    (value.sourceRef === null || typeof value.sourceRef === 'string')
  );
}
