/**
 * Implementation of `PUT /api/me/state` (012) — single-row parameterized UPSERT of the
 * settings pair. Re-exported by `src/app/api/me/state+api.ts` (see `me-state-get.ts` for the
 * one-function-per-file rationale). Invalid JSON / body → 400.
 */
import { query } from '@/server/db';
import { requireAuth } from '@/server/requireAuth';

const UPSERT_STATE =
  'INSERT INTO user_state (clerk_user_id, active_program_id, cursor) VALUES ($1, $2, $3) ' +
  'ON CONFLICT (clerk_user_id) DO UPDATE SET active_program_id = EXCLUDED.active_program_id, ' +
  'cursor = EXCLUDED.cursor, updated_at = now()';

export async function PUT(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    !('activeProgramId' in body) ||
    typeof body.activeProgramId !== 'string' ||
    !('cursor' in body) ||
    typeof body.cursor !== 'number'
  ) {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }
  try {
    await query(UPSERT_STATE, [auth.userId, body.activeProgramId, body.cursor]);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('PUT /api/me/state failed:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
