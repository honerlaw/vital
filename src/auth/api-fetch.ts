/**
 * Authenticated fetch to VITAL's own API routes.
 *
 * Transport contract: native attaches `Authorization: Bearer <session token>`; web is
 * same-origin and relies on Clerk's session cookie (the Bearer header is harmless if also
 * present), so `requireAuth` on the server accepts either. The Bearer header is built by the
 * shared `authHeaders` helper (also used by the streaming `streamRoutine`, 034).
 *
 * On native the request needs an absolute origin (there is no page origin); it is read from
 * `EXPO_PUBLIC_API_URL` via the shared `apiBaseUrl` helper. On web the var is unset and a
 * relative path is used. An optional `signal` lets callers cancel (used by the buffered NO-GO
 * fallback path of 034).
 */
import { apiBaseUrl } from '@/auth/api-base';
import { authHeaders, type GetSessionToken } from '@/auth/auth-headers';

interface ApiFetchInit {
  method?: 'PUT' | 'POST' | 'DELETE';
  body?: string;
  signal?: AbortSignal;
}

export async function apiFetch(
  path: string,
  getToken: GetSessionToken,
  init?: ApiFetchInit,
): Promise<Response> {
  const headers: Record<string, string> = await authHeaders(getToken);
  if (init?.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(`${apiBaseUrl()}${path}`, { headers, ...init });
}
