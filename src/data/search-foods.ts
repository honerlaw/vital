/**
 * Client call to `GET /api/me/food-search?q=` (032) — USDA generic-food search via the server
 * proxy. The JSON body arrives typed `unknown` and is validated through `isFoodSearchResultArray`;
 * a malformed response (or a 502 when USDA / the key is unavailable) throws so the caller can show
 * an error and fall back to manual entry.
 */
import { apiFetch } from '@/auth/api-fetch';
import { type FoodSearchResult } from '@/data/food-types';
import { isFoodSearchResultArray } from '@/data/guards';

type GetSessionToken = () => Promise<string | null>;

export async function searchFoods(
  getToken: GetSessionToken,
  queryText: string,
): Promise<FoodSearchResult[]> {
  const res = await apiFetch(`/api/me/food-search?q=${encodeURIComponent(queryText)}`, getToken);
  if (!res.ok) {
    throw new Error(`Request failed (${String(res.status)})`);
  }
  const body: unknown = await res.json();
  if (!isFoodSearchResultArray(body)) {
    throw new Error('Malformed /api/me/food-search response');
  }
  return body;
}
