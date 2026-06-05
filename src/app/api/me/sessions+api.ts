/**
 * Append a finished workout session AND advance the persisted cursor in one round-trip (012).
 * Auth-enforced via `requireAuth`.
 *
 * The two writes are ONE data-modifying-CTE statement: a single statement runs in a single
 * implicit transaction, so the session insert and the cursor upsert commit or roll back
 * together (history and cursor can never split). The `ins` CTE term is never referenced by the
 * main statement — Postgres guarantees a data-modifying CTE executes anyway. The upsert's
 * INSERT arm needs `active_program_id` (NOT NULL) for a user with no settings row yet, so the
 * body carries the client's current active program; the conflict arm deliberately updates ONLY
 * the cursor (finishing a workout never changes the active program — current client semantics).
 */
import { query } from '@/server/db';
import { requireAuth } from '@/server/requireAuth';

const INSERT_SESSION_AND_CURSOR =
  'WITH ins AS (' +
  'INSERT INTO workout_sessions (clerk_user_id, program_id, program_name, day_name, finished_at) ' +
  'VALUES ($1, $2, $3, $4, $5)' +
  ') ' +
  'INSERT INTO user_state (clerk_user_id, active_program_id, cursor) VALUES ($1, $6, $7) ' +
  'ON CONFLICT (clerk_user_id) DO UPDATE SET cursor = EXCLUDED.cursor, updated_at = now()';

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
