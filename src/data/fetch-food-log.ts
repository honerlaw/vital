/**
 * Client-side fetch of the authenticated user's food diary for one local day from
 * `GET /api/me/food-log?date=` (032). The JSON body arrives typed `unknown` and is validated
 * through `isFoodLogEntryArray` before being handed back — a malformed response throws so the
 * caller flips the diary status to 'error' rather than rendering untyped data.
 */
import { apiFetch } from '@/auth/api-fetch';
import { type FoodLogEntry } from '@/data/food-types';
import { isFoodLogEntryArray } from '@/data/guards';

type GetSessionToken = () => Promise<string | null>;

export async function fetchFoodLog(
  getToken: GetSessionToken,
  date: string,
): Promise<FoodLogEntry[]> {
  const res = await apiFetch(`/api/me/food-log?date=${encodeURIComponent(date)}`, getToken);
  if (!res.ok) {
    throw new Error(`Request failed (${String(res.status)})`);
  }
  const body: unknown = await res.json();
  if (!isFoodLogEntryArray(body)) {
    throw new Error('Malformed /api/me/food-log response');
  }
  return body;
}
