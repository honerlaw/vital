/**
 * `POST /api/me/routine/refine` (030) — regenerate a draft program from the SAME spec plus the
 * structured re-prompt knobs. Stateless: the client owns the draft and re-sends the full spec on
 * every call. Body `{ spec, knobs }` is validated (strict-writer, 028 → 400). Auth-enforced and
 * rate-capped; LLM/parse failure → 502.
 */
import { isIntakeSpec, isRoutineKnob } from '@/data/guards';
import { generatePrompt } from '@/server/llm/generate-prompt';
import { requestJson } from '@/server/llm/request-json';
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
    const { system, user } = generatePrompt(body.spec, body.knobs);
    const raw = await requestJson(system, user);
    return Response.json(mapLlmProgram(raw, globalThis.crypto.randomUUID()));
  } catch (error) {
    console.error('POST /api/me/routine/refine failed:', error);
    return Response.json({ error: 'Bad Gateway' }, { status: 502 });
  }
}
