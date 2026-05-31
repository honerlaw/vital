/**
 * Per-route authentication guard for Expo Router API routes.
 *
 * Usage in an `+api.ts` handler:
 *
 * ```ts
 * const auth = await requireAuth(request);
 * if (auth instanceof Response) return auth; // 401
 * // auth.userId is the authenticated user
 * ```
 *
 * Enforcement is opt-in per route (there is no global middleware), so public routes such as
 * `GET /api/health` stay public by simply not calling this. The `verify` parameter defaults to
 * the real Clerk verifier but is injectable, so tests pass a typed fake with no casts.
 */
import { type AuthState, type AuthVerifier, getDefaultVerifier } from '@/server/clerk-verifier';
import { verifierRegistry } from '@/server/verifier-registry';

/** The authenticated principal extracted from a valid request. */
export interface AuthResult {
  userId: string;
}

export async function requireAuth(
  request: Request,
  verify: AuthVerifier = verifierRegistry.current ?? getDefaultVerifier(),
): Promise<AuthResult | Response> {
  let state: AuthState;
  try {
    state = await verify(request);
  } catch {
    // Fail closed: any verification error (bad/expired token, missing config, transient Clerk
    // failure) is treated as unauthenticated. Returning a clean 401 also avoids leaking the
    // underlying stack trace to the client, which the raw thrown error otherwise would.
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (state.userId === null) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return { userId: state.userId };
}
