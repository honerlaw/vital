/**
 * `POST /api/me/programs` (030) — persist a generated draft as an IMMUTABLE user program, together
 * with the intake `spec` that produced it (so a post-commit refine can re-seed). Body
 * `{ program, spec }` is validated (strict-writer, 028 → 400); days are re-projected to canonical
 * known fields before storage. The DB mints the id (gen_random_uuid); the saved row is mapped back
 * and returned so the client adds the authoritative program to state.
 */
import { isIntakeSpec, isProgram } from '@/data/guards';
import { canonicalProgramDays } from '@/server/canonical-program-days';
import { query } from '@/server/db';
import { requireAuth } from '@/server/requireAuth';
import { rowToUserProgram } from '@/server/user-program-mapper';

const INSERT_PROGRAM =
  'INSERT INTO user_programs ' +
  '(clerk_user_id, name, tag, cred, per_week, blurb, days, spec) ' +
  'VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb) ' +
  'RETURNING id, name, tag, cred, per_week, blurb, days, created_at';

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
    !('program' in body) ||
    !isProgram(body.program) ||
    !('spec' in body) ||
    !isIntakeSpec(body.spec)
  ) {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }
  const program = body.program;
  try {
    const rows = await query(INSERT_PROGRAM, [
      auth.userId,
      program.name,
      program.tag,
      program.cred,
      program.perWeek,
      program.blurb,
      JSON.stringify(canonicalProgramDays(program.days)),
      JSON.stringify(body.spec),
    ]);
    if (rows.length === 0) {
      return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    return Response.json(rowToUserProgram(rows[0]));
  } catch (error) {
    console.error('POST /api/me/programs failed:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
