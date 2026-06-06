/**
 * Append a finished workout session AND advance the persisted cursor in one round-trip (012).
 * Auth-enforced via `requireAuth`.
 *
 * The two writes are ONE data-modifying-CTE statement: a single statement runs in a single
 * implicit transaction, so the session insert and the cursor upsert commit or roll back
 * together (history and cursors can never split). The `ins` CTE term is never referenced by
 * the main statement — Postgres guarantees a data-modifying CTE executes anyway. Since 015 the
 * body's `cursor` is the NEW value for `cursors[programId]`, merged into the per-program map
 * (`||` sets exactly that key; sibling programs untouched). The upsert's INSERT arm still
 * needs `active_program_id` (NOT NULL) for a user with no settings row yet, so the body
 * carries the client's current active program; the conflict arm deliberately updates ONLY the
 * cursor map (finishing a workout never changes the active program).
 */
import { query } from '@/server/db';
import { requireAuth } from '@/server/requireAuth';

const INSERT_SESSION_AND_CURSOR =
  'WITH ins AS (' +
  'INSERT INTO workout_sessions (clerk_user_id, program_id, program_name, day_name, finished_at) ' +
  'VALUES ($1, $2, $3, $4, $5)' +
  ') ' +
  'INSERT INTO user_state (clerk_user_id, active_program_id, cursors) ' +
  'VALUES ($1, $6, jsonb_build_object($2::text, $7::integer)) ' +
  'ON CONFLICT (clerk_user_id) DO UPDATE SET ' +
  'cursors = user_state.cursors || jsonb_build_object($2::text, $7::integer), ' +
  'updated_at = now()';

export async function POST(request: Request): Promise<Response> {
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
    !('programId' in body) ||
    typeof body.programId !== 'string' ||
    !('programName' in body) ||
    typeof body.programName !== 'string' ||
    !('dayName' in body) ||
    typeof body.dayName !== 'string' ||
    !('dateISO' in body) ||
    typeof body.dateISO !== 'string' ||
    !('cursor' in body) ||
    typeof body.cursor !== 'number' ||
    !('activeProgramId' in body) ||
    typeof body.activeProgramId !== 'string'
  ) {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }
  try {
    await query(INSERT_SESSION_AND_CURSOR, [
      auth.userId,
      body.programId,
      body.programName,
      body.dayName,
      body.dateISO,
      body.activeProgramId,
      body.cursor,
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('POST /api/me/sessions failed:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
