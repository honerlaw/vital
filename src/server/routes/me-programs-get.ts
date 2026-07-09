/**
 * `GET /api/me/programs` (030) — the authenticated user's generated programs, newest-first. Each
 * row is validated by `rowToUserProgram`; an invalid row fails the whole request with 500 (mirrors
 * the catalog endpoint) rather than serving a partial list. Re-exported by the multi-method
 * `programs+api.ts` route.
 */
import { query } from '@/server/db';
import { requireAuth } from '@/server/requireAuth';
import { rowToUserProgram } from '@/server/user-program-mapper';

const SELECT_USER_PROGRAMS =
  'SELECT id, name, tag, cred, per_week, blurb, days, created_at FROM user_programs ' +
  'WHERE clerk_user_id = $1 ORDER BY created_at DESC, id DESC';

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  try {
    const rows = await query(SELECT_USER_PROGRAMS, [auth.userId]);
    return Response.json(rows.map(rowToUserProgram));
  } catch (error) {
    console.error('GET /api/me/programs failed:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
