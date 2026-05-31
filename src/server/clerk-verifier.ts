/**
 * Lazily-constructed Clerk session verifier for API routes.
 *
 * `requireAuth` (see ./requireAuth) takes a verifier function so tests can inject a typed
 * fake with zero casts. This module supplies the real, default verifier — a thin wrapper over
 * `@clerk/backend`'s `authenticateRequest`, built once on first use so importing the module
 * (e.g. during the web export's static prerender) never touches `process.env`.
 *
 * The verifier adapts Clerk's wide `RequestState` union down to a minimal `AuthState`, so the
 * rest of the server (and the tests) depend only on `{ userId }`, never on Clerk's internals.
 *
 * Server-only: it reads `CLERK_SECRET_KEY` and must never be imported into the client bundle.
 */
import { createClerkClient } from '@clerk/backend';

/**
 * Minimal auth state `requireAuth` consumes — `userId` is non-null iff the request is signed in.
 */
export interface AuthState {
  userId: string | null;
}

/** Authenticates an incoming request and reports the resolved `AuthState`. */
export type AuthVerifier = (request: Request) => Promise<AuthState>;

let cachedVerifier: AuthVerifier | null = null;

/**
 * Build (and memoise) the default verifier. Env vars are read with static property access
 * (Expo inlines `EXPO_PUBLIC_*` at build, so dynamic access is disallowed) and narrowed through
 * `unknown` + `typeof` — the repo pattern for the `any`-typed `process.env` (see app.config.ts).
 * `authorizedParties` comes from `CLERK_AUTHORIZED_PARTIES` (comma-separated origins): the
 * allowlist protecting the web cookie session from the subdomain-cookie-leak attack; native
 * Bearer requests are unaffected.
 */
export function getDefaultVerifier(): AuthVerifier {
  if (cachedVerifier !== null) return cachedVerifier;

  const str = (raw: unknown): string => (typeof raw === 'string' ? raw : '');
  const secretKey = str(process.env.CLERK_SECRET_KEY);
  const publishableKey = str(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const authorizedParties = str(process.env.CLERK_AUTHORIZED_PARTIES)
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  const client = createClerkClient({ secretKey, publishableKey });
  cachedVerifier = async (request) => {
    const state = await client.authenticateRequest(request, { authorizedParties });
    if (!state.isAuthenticated) return { userId: null };
    return { userId: state.toAuth().userId };
  };
  return cachedVerifier;
}
