/**
 * Best-effort write-through of the persisted settings pair to `PUT /api/me/state` (012).
 * Throws on a non-2xx response; the caller (StateProvider's wrapped dispatch) catches and
 * console-warns — local reducer state stays authoritative for the session.
 */
import { apiFetch } from '@/auth/api-fetch';

type GetSessionToken = () => Promise<string | null>;

export async function putUserState(
  getToken: GetSessionToken,
  activeProgramId: string,
  cursor: number,
): Promise<void> {
  const res = await apiFetch('/api/me/state', getToken, {
    method: 'PUT',
    body: JSON.stringify({ activeProgramId, cursor }),
  });
  if (!res.ok) {
    throw new Error(`Request failed (${String(res.status)})`);
  }
}
