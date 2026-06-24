/**
 * `POST /api/me/routine/generate` (030; streamed since 034) — turn the answered `IntakeSpec` into a
 * draft program, STREAMING structural progress as Server-Sent Events. Auth + the daily cap run
 * FIRST, so a 401/429/400 is a plain JSON Response before any stream bytes. Body `{ spec }` is
 * validated by `isIntakeSpec` (strict-writer, 028 → 400). The stream emits `progress` snapshots
 * (days completed + `perWeek`), a terminal `done` carrying the `mapLlmProgram`-validated draft
 * (server-minted uuid id; unpersisted until POST /api/me/programs), or a terminal `error`.
 */
import { isIntakeSpec } from '@/data/guards';
import { buildRoutineStream } from '@/server/llm/build-routine-stream';
import { generatePrompt } from '@/server/llm/generate-prompt';
import { mapLlmProgram } from '@/server/llm-program-mapper';
import { withinDailyLlmCap } from '@/server/rate-limit';
import { requireAuth } from '@/server/requireAuth';

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null || !('spec' in body) || !isIntakeSpec(body.spec)) {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }
  try {
    if (!(await withinDailyLlmCap(auth.userId))) {
      return Response.json({ error: 'Daily limit reached' }, { status: 429 });
    }
  } catch (error) {
    console.error('POST /api/me/routine/generate cap check failed:', error);
    return Response.json({ error: 'Bad Gateway' }, { status: 502 });
  }
  const { system, user } = generatePrompt(body.spec, []);
  return buildRoutineStream({
    system,
    user,
    signal: request.signal,
    arrayKey: 'days',
    scalarKey: 'perWeek',
    finalize: (raw) => mapLlmProgram(raw, globalThis.crypto.randomUUID()),
  });
}
