/**
 * Implementation of `GET /api/me/state` (012). Lives here (one function per file) and is
 * re-exported by `src/app/api/me/state+api.ts` — re-exports are exempt from the
 * single-declaration rule, which is how a multi-method Expo API route stays rule-conformant.
 *
 * Returns the defaults shape (`activeProgramId: null`, `cursor: 0`, empty history) for a user
 * with no settings row yet — no 404 special-case.
 */
import { query } from '@/server/db';
import { requireAuth } from '@/server/requireAuth';
import { rowToSessionLog } from '@/server/session-log-mapper';
import { rowToUserStateMeta } from '@/server/user-state-mapper';

const SELECT_STATE =
  'SELECT active_program_id, cursor FROM user_state WHERE clerk_user_id = $1';
const SELECT_SESSIONS =
  'SELECT program_id, program_name, day_name, finished_at FROM workout_sessions ' +
  'WHERE clerk_user_id = $1 ORDER BY finished_at DESC, id DESC';

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  try {
    const stateRows = await query(SELECT_STATE, [auth.userId]);
    const sessionRows = await query(SELECT_SESSIONS, [auth.userId]);
    const meta = stateRows.length > 0 ? rowToUserStateMeta(stateRows[0]) : null;
    return Response.json({
      activeProgramId: meta === null ? null : meta.activeProgramId,
      cursor: meta === null ? 0 : meta.cursor,
      history: sessionRows.map(rowToSessionLog),
    });
  } catch (error) {
    console.error('GET /api/me/state failed:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
