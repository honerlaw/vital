/**
 * `POST /api/me/routine/refine` (030; streamed since 034) — regenerate a draft program from the
 * SAME spec plus the structured re-prompt knobs, STREAMING structural progress as Server-Sent
 * Events. Stateless: the client owns the draft and re-sends the full spec every call. Auth + the
 * daily cap run FIRST (401/429/400 = plain JSON before any stream bytes). Body `{ spec, knobs }` is
 * validated (strict-writer, 028 → 400). The stream emits `progress` (days + `perWeek`), a terminal
 * `done` carrying the `mapLlmProgram`-validated draft, or a terminal `error`.
 */
import { isIntakeSpec, isRoutineKnob } from '@/data/guards';
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
  if (
    typeof body !== 'object' ||
    body === null ||
    !('spec' in body) ||
    !isIntakeSpec(body.spec) ||
    !('knobs' in body) ||
    !Array.isArray(body.knobs) ||
    !body.knobs.every(isRoutineKnob)
  ) {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }
  try {
    if (!(await withinDailyLlmCap(auth.userId))) {
      return Response.json({ error: 'Daily limit reached' }, { status: 429 });
    }
  } catch (error) {
    console.error('POST /api/me/routine/refine cap check failed:', error);
    return Response.json({ error: 'Bad Gateway' }, { status: 502 });
  }
  const { system, user } = generatePrompt(body.spec, body.knobs);
  return buildRoutineStream({
    system,
    user,
    signal: request.signal,
    arrayKey: 'days',
    scalarKey: 'perWeek',
    finalize: (raw) => mapLlmProgram(raw, globalThis.crypto.randomUUID()),
  });
}
