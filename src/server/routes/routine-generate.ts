/**
 * `POST /api/me/routine/generate` (030) — turn the answered `IntakeSpec` into a draft program.
 * Auth-enforced and rate-capped. Body `{ spec }` is validated by `isIntakeSpec` (strict-writer,
 * 028 → 400). The LLM output is validated + normalized by `mapLlmProgram`; a server-minted uuid is
 * the draft id (the draft is unpersisted until POST /api/me/programs). Any LLM/parse failure → 502
 * so the client shows Retry and can fall back to the curated catalog.
 */
import { isIntakeSpec } from '@/data/guards';
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
  if (typeof body !== 'object' || body === null || !('spec' in body) || !isIntakeSpec(body.spec)) {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }
  try {
    if (!(await withinDailyLlmCap(auth.userId))) {
      return Response.json({ error: 'Daily limit reached' }, { status: 429 });
    }
    const { system, user } = generatePrompt(body.spec, []);
    const raw = await requestJson(system, user);
    return Response.json(mapLlmProgram(raw, globalThis.crypto.randomUUID()));
  } catch (error) {
    console.error('POST /api/me/routine/generate failed:', error);
    return Response.json({ error: 'Bad Gateway' }, { status: 502 });
  }
}
