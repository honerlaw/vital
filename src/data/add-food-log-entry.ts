/**
 * Client call to `POST /api/me/food-log` (032) — append one diary entry. The authoritative row
 * (with its server-minted id) comes back and is validated through `isFoodLogEntry` before the
 * caller uses it. Throws on a non-2xx response or a malformed body.
 */
import { apiFetch } from '@/auth/api-fetch';
import { type FoodLogEntry, type NewFoodLogEntry } from '@/data/food-types';
import { isFoodLogEntry } from '@/data/guards';

type GetSessionToken = () => Promise<string | null>;

export async function addFoodLogEntry(
  getToken: GetSessionToken,
  entry: NewFoodLogEntry,
): Promise<FoodLogEntry> {
  const res = await apiFetch('/api/me/food-log', getToken, {
    method: 'POST',
    body: JSON.stringify(entry),
  });
  if (!res.ok) {
    throw new Error(`Request failed (${String(res.status)})`);
  }
  const body: unknown = await res.json();
  if (!isFoodLogEntry(body)) {
    throw new Error('Malformed /api/me/food-log response');
  }
  return body;
}
