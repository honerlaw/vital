/**
 * Client call to `DELETE /api/me/programs/[id]` (030). Throws on a non-2xx response; the caller
 * dispatches REMOVE_USER_PROGRAM on success (local reducer stays authoritative for the session).
 */
import { apiFetch } from '@/auth/api-fetch';

type GetSessionToken = () => Promise<string | null>;

export async function deleteUserProgram(
  getToken: GetSessionToken,
  id: string,
): Promise<void> {
  const res = await apiFetch(`/api/me/programs/${id}`, getToken, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(`Request failed (${String(res.status)})`);
  }
}
