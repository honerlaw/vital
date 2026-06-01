/**
 * Client-side fetch of the public program catalog from `GET /api/programs`.
 *
 * The route is public, so no Bearer token is attached; only the shared base-origin resolution is
 * reused (see `@/auth/api-base`). The JSON body arrives typed `unknown` and is validated through
 * the shared guards before being handed back as `Program[]` — a malformed response throws rather
 * than flowing untyped data into the UI.
 */
import { apiBaseUrl } from '@/auth/api-base';
import { isProgramArray } from '@/data/guards';
import { type Program } from '@/data/types';

export async function fetchPrograms(): Promise<Program[]> {
  const res = await fetch(`${apiBaseUrl()}/api/programs`);
  if (!res.ok) {
    throw new Error(`Request failed (${String(res.status)})`);
  }
  const body: unknown = await res.json();
  if (!isProgramArray(body)) {
    throw new Error('Malformed /api/programs response');
  }
  return body;
}
