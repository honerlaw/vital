/**
 * Test seam for request verification. In production `current` stays `null` and `requireAuth`
 * falls back to the real Clerk verifier. Tests assign a typed fake here so the *actual* route
 * handlers (which call `requireAuth(request)` with no injected argument) exercise the fake —
 * letting a route-level test assert 401 / `{ userId }` deterministically and offline, with no
 * casts. It is a plain data holder, so it does not count against the one-function-per-file rule.
 */
import { type AuthVerifier } from '@/server/clerk-verifier';

export const verifierRegistry: { current: AuthVerifier | null } = { current: null };
