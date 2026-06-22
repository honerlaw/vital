/**
 * Authenticated fetch to VITAL's own API routes.
 *
 * Transport contract: native attaches `Authorization: Bearer <session token>`; web is
 * same-origin and relies on Clerk's session cookie (the Bearer header is harmless if also
 * present), so `requireAuth` on the server accepts either. `getToken` comes from
 * `useAuth()`; in Clerk Core 3 it can throw `ClerkOfflineError`, so the call is wrapped and
 * a missing token simply means "no Bearer header" (the server still rejects with 401).
 *
 * On native the request needs an absolute origin (there is no page origin); it is read from
 * `EXPO_PUBLIC_API_URL` via the shared `apiBaseUrl` helper. On web the var is unset and a
 * relative path is used.
 */
import { apiBaseUrl } from '@/auth/api-base';

type GetSessionToken = () => Promise<string | null>;

interface ApiFetchInit {
  method?: 'PUT' | 'POST' | 'DELETE';
  body?: string;
}

export async function apiFetch(
  path: string,
  getToken: GetSessionToken,
  init?: ApiFetchInit,
): Promise<Response> {
  let token: string | null = null;
  try {
    token = await getToken();
  } catch {
    token = null;
  }

  const headers: Record<string, string> = {};
  if (token !== null && token.length > 0) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (init?.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(`${apiBaseUrl()}${path}`, { headers, ...init });
}
