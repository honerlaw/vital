/**
 * Best-effort write-through of the persisted settings to `PUT /api/me/state` (012; map form
 * since 015 — the full per-program cursor map replaces the column server-side). Throws on a
 * non-2xx response; the caller (StateProvider's wrapped dispatch) catches and console-warns —
 * local reducer state stays authoritative for the session.
 */
import { apiFetch } from '@/auth/api-fetch';

type GetSessionToken = () => Promise<string | null>;

export async function putUserState(
  getToken: GetSessionToken,
  activeProgramId: string,
  cursors: Record<string, number>,
): Promise<void> {
  const res = await apiFetch('/api/me/state', getToken, {
    method: 'PUT',
    body: JSON.stringify({ activeProgramId, cursors }),
  });
  if (!res.ok) {
    throw new Error(`Request failed (${String(res.status)})`);
  }
}
