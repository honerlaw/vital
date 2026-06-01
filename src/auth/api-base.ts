/**
 * Resolves the base origin for requests to VITAL's own API routes.
 *
 * On native there is no page origin, so an absolute origin is read from `EXPO_PUBLIC_API_URL`
 * (the same value app.config.ts feeds to expo-router). On web the var is unset and a relative
 * path is used (empty base). Shared by `apiFetch` (authenticated routes) and the public
 * catalog fetch so both resolve the origin identically.
 */
export function apiBaseUrl(): string {
  const rawBase: unknown = process.env.EXPO_PUBLIC_API_URL;
  return typeof rawBase === 'string' ? rawBase : '';
}
