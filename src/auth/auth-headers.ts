/**
 * Build the `Authorization` header for a request to VITAL's own API routes (034). Extracted from
 * `apiFetch` so the streaming `streamRoutine` helper (which must use `expo/fetch`, not the global
 * `fetch` `apiFetch` wraps) shares the exact same token logic. `getToken` comes from `useAuth()`;
 * in Clerk Core 3 it can throw `ClerkOfflineError`, so the call is wrapped and a missing token
 * simply means "no Bearer header" (the server still rejects with 401). Deliberately returns ONLY
 * the auth header — the base URL stays the caller's concern (api-base).
 */
export type GetSessionToken = () => Promise<string | null>;

export async function authHeaders(getToken: GetSessionToken): Promise<Record<string, string>> {
  let token: string | null = null;
  try {
    token = await getToken();
  } catch {
    token = null;
  }
  return token !== null && token.length > 0 ? { Authorization: `Bearer ${token}` } : {};
}
