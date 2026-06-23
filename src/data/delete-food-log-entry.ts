/**
 * Client call to `DELETE /api/me/food-log/[id]` (032). Throws on a non-2xx response; the caller
 * reloads the day on success (the local list stays authoritative until then).
 */
import { apiFetch } from '@/auth/api-fetch';

type GetSessionToken = () => Promise<string | null>;

export async function deleteFoodLogEntry(getToken: GetSessionToken, id: string): Promise<void> {
  const res = await apiFetch(`/api/me/food-log/${encodeURIComponent(id)}`, getToken, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Request failed (${String(res.status)})`);
  }
}
