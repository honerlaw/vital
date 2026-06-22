/**
 * Client-side fetch of the authenticated user's generated programs from `GET /api/me/programs`
 * (030). The JSON body arrives typed `unknown` and is validated through the shared `isProgramArray`
 * guard (a generated program is structurally a `Program`); a malformed response throws so the
 * caller flips `userProgramsStatus` to 'error'.
 */
import { apiFetch } from '@/auth/api-fetch';
import { isProgramArray } from '@/data/guards';
import { type Program } from '@/data/types';

type GetSessionToken = () => Promise<string | null>;

export async function fetchUserPrograms(getToken: GetSessionToken): Promise<Program[]> {
  const res = await apiFetch('/api/me/programs', getToken);
  if (!res.ok) {
    throw new Error(`Request failed (${String(res.status)})`);
  }
  const body: unknown = await res.json();
  if (!isProgramArray(body)) {
    throw new Error('Malformed /api/me/programs response');
  }
  return body;
}
