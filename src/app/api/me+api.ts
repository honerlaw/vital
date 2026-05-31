/**
 * Protected example endpoint. Returns the authenticated user's id, or 401 when the request
 * carries no valid Clerk session (Bearer token on native, session cookie on web). Demonstrates
 * the per-route `requireAuth` enforcement pattern; contrast with the public `health+api.ts`.
 */
import { requireAuth } from '@/server/requireAuth';

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  return Response.json({ userId: auth.userId });
}
