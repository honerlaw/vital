/**
 * Implementation of `PUT /api/me/state` (012) — single-row parameterized UPSERT of the
 * settings. Re-exported by `src/app/api/me/state+api.ts` (see `me-state-get.ts` for the
 * one-function-per-file rationale). Invalid JSON / body → 400.
 *
 * Tolerant reader for ONE release (015): accepts the map shape `{activeProgramId, cursors}`
 * (full replace of the column) OR the legacy scalar `{activeProgramId, cursor}` from pre-015
 * builds, translated as a MERGE of `cursors[activeProgramId] = cursor` against the existing
 * row — sibling keys are preserved, and the old build's zero-on-switch semantics stay intact
 * without corrupting other programs. Remove the legacy arm next release.
 */
import { isCursorMap } from '@/data/guards';
import { query } from '@/server/db';
import { requireAuth } from '@/server/requireAuth';

const UPSERT_STATE_MAP =
  'INSERT INTO user_state (clerk_user_id, active_program_id, cursors) ' +
  'VALUES ($1, $2, $3::jsonb) ' +
  'ON CONFLICT (clerk_user_id) DO UPDATE SET active_program_id = EXCLUDED.active_program_id, ' +
  'cursors = EXCLUDED.cursors, updated_at = now()';

const UPSERT_STATE_LEGACY =
  'INSERT INTO user_state (clerk_user_id, active_program_id, cursors) ' +
  'VALUES ($1, $2, jsonb_build_object($2::text, $3::integer)) ' +
  'ON CONFLICT (clerk_user_id) DO UPDATE SET active_program_id = EXCLUDED.active_program_id, ' +
  'cursors = user_state.cursors || jsonb_build_object($2::text, $3::integer), ' +
  'updated_at = now()';

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
    typeof body.activeProgramId !== 'string'
  ) {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }
  // Map shape first (new clients), legacy scalar second (pre-015 builds), else 400.
  let statement: string;
  let params: unknown[];
  if ('cursors' in body && isCursorMap(body.cursors)) {
    statement = UPSERT_STATE_MAP;
    params = [auth.userId, body.activeProgramId, JSON.stringify(body.cursors)];
  } else if ('cursor' in body && typeof body.cursor === 'number') {
    statement = UPSERT_STATE_LEGACY;
    params = [auth.userId, body.activeProgramId, body.cursor];
  } else {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }
  try {
    await query(statement, params);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('PUT /api/me/state failed:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
