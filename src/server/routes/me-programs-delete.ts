/**
 * `DELETE /api/me/programs/[id]` (030) — delete one of the user's generated programs. History is
 * self-contained (028), so deleting a program never corrupts past sessions; the client falls the
 * active program back to the null chooser (019) if it deleted the active one. The id is matched as
 * text (`id::text = $1`) so a malformed id simply matches nothing instead of erroring on the uuid
 * cast. Scoped to the caller's rows by `clerk_user_id`.
 */
import { query } from '@/server/db';
import { requireAuth } from '@/server/requireAuth';

const DELETE_PROGRAM = 'DELETE FROM user_programs WHERE id::text = $1 AND clerk_user_id = $2';

export async function DELETE(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  const id = new URL(request.url).pathname.split('/').pop() ?? '';
  if (id.length === 0) {
    return Response.json({ error: 'Bad Request' }, { status: 400 });
  }
  try {
    await query(DELETE_PROGRAM, [id, auth.userId]);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('DELETE /api/me/programs/[id] failed:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
