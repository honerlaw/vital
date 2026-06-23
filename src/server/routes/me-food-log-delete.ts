/**
 * Implementation of `DELETE /api/me/food-log/[id]` (032). Auth-enforced; deletes one of the
 * caller's diary entries. The id is matched as text (`id::text = $1`) so a malformed id simply
 * matches nothing instead of erroring on the uuid cast (same shape as `me-programs-delete`).
 * Scoped to the caller's rows by `clerk_user_id`. One function per file; re-exported by
 * `src/app/api/me/food-log/[id]+api.ts`.
 */
import { query } from '@/server/db';
import { requireAuth } from '@/server/requireAuth';

const DELETE_ENTRY = 'DELETE FROM food_log_entries WHERE id::text = $1 AND clerk_user_id = $2';

export async function DELETE(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  const id = new URL(request.url).pathname.split('/').pop() ?? '';
  if (id.length === 0) {
    return Response.json({ error: 'Bad Request' }, { status: 400 });
  }
  try {
    await query(DELETE_ENTRY, [id, auth.userId]);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/me/food-log/[id] failed:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
