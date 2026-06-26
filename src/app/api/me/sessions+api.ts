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
 *
 * `exercises` + `unit` (022) are OPTIONAL — an old client that sends neither is accepted
 * (tolerant of pre-022 builds), but a body that CARRIES either must carry BOTH valid (shared
 * guard; explicit 400, never a silent fall-through — the 015 validator rule). The server never
 * trusts client coercion: NaN/Infinity/negative/float-reps are rejected here, the only stop
 * before bad data reaches the append-only history. Deliberate asymmetry with the read path:
 * strict writer (400 at the door), tolerant reader (degrade on corrupt rows).
 */
import { isSessionExerciseLogArray } from '@/data/guards';
import { query } from '@/server/db';
import { requireAuth } from '@/server/requireAuth';

const INSERT_SESSION_AND_CURSOR =
  'WITH ins AS (' +
  'INSERT INTO workout_sessions ' +
  '(clerk_user_id, program_id, program_name, day_name, finished_at, set_log, duration_sec) ' +
  'VALUES ($1, $2, $3, $4, $5, $8::jsonb, $9::integer)' +
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
  // Optional elapsed seconds (041): absent → null (pre-041 clients). Present must be a
  // non-negative, finite integer — the strict writer rejects NaN/Infinity/negative/float before
  // bad data reaches append-only history (same posture as the set_log validation below).
  let durationSec: number | null = null;
  if ('durationSec' in body) {
    if (
      typeof body.durationSec !== 'number' ||
      !Number.isInteger(body.durationSec) ||
      body.durationSec < 0
    ) {
      return Response.json({ error: 'Invalid body' }, { status: 400 });
    }
    durationSec = body.durationSec;
  }
  // Optional per-set log (022): absent → accept ('{}', no per-set data — old clients).
  // Present-but-malformed → explicit 400; a body carrying set data never silently degrades
  // to a logless session. Both fields travel together: a lone `exercises` or lone `unit` is
  // malformed too.
  let setLogJson = '{}';
  if ('exercises' in body || 'unit' in body) {
    if (
      !('exercises' in body) ||
      !isSessionExerciseLogArray(body.exercises) ||
      !('unit' in body) ||
      body.unit !== 'lb'
    ) {
      return Response.json({ error: 'Invalid body' }, { status: 400 });
    }
    // Re-project to the known shape before persisting (review finding #3): the guards
    // validate required fields but don't strip extras, and set_log is append-only — without
    // this, arbitrary client-attached keys would land in history verbatim. Mirrors the
    // read-side sanitizer's rebuild-from-known-fields discipline.
    setLogJson = JSON.stringify({
      unit: body.unit,
      exercises: body.exercises.map((ex) => ({
        name: ex.name,
        scheme: ex.scheme,
        sets: ex.sets.map((s) => ({ done: s.done, weight: s.weight, reps: s.reps })),
      })),
    });
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
      setLogJson,
      durationSec,
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('POST /api/me/sessions failed:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
