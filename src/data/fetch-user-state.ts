/**
 * Client-side fetch of the authenticated user's persisted state from `GET /api/me/state`.
 * The JSON body arrives typed `unknown` and is validated through the shared guard before being
 * handed back — a malformed response throws (→ the caller flips `userStateStatus` to 'error').
 */
import { apiFetch } from '@/auth/api-fetch';
import { isUserStatePayload } from '@/data/guards';
import { sanitizeSessionLog } from '@/data/sanitize-session-log';
import { type UserStatePayload } from '@/data/types';

type GetSessionToken = () => Promise<string | null>;

export async function fetchUserState(getToken: GetSessionToken): Promise<UserStatePayload> {
  const res = await apiFetch('/api/me/state', getToken);
  if (!res.ok) {
    throw new Error(`Request failed (${String(res.status)})`);
  }
  const body: unknown = await res.json();
  if (!isUserStatePayload(body)) {
    throw new Error('Malformed /api/me/state response');
  }
  // Per-entry sanitize (022): core fields stay strict (above), but the optional per-set data
  // degrades per entry — a corrupt `exercises` blob must never brick hydration/boot.
  return { ...body, history: body.history.map(sanitizeSessionLog) };
}
