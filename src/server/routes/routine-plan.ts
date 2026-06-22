/**
 * `POST /api/me/routine/plan` (030) — ask Claude to design the adaptive intake question graph.
 * Auth-enforced and rate-capped. The LLM output is validated by `isQuestionGraph` (strict-writer,
 * 028); a malformed graph or any LLM error returns 502 so the client falls back to the fixed
 * deterministic spine. POST (not GET) because it triggers a billable LLM call and counts toward
 * the per-user daily cap.
 */
import { isQuestionGraph } from '@/data/guards';
import { planPrompt } from '@/server/llm/plan-prompt';
import { requestJson } from '@/server/llm/request-json';
import { withinDailyLlmCap } from '@/server/rate-limit';
import { requireAuth } from '@/server/requireAuth';

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  try {
    if (!(await withinDailyLlmCap(auth.userId))) {
      return Response.json({ error: 'Daily limit reached' }, { status: 429 });
    }
    const { system, user } = planPrompt();
    const raw = await requestJson(system, user);
    if (!isQuestionGraph(raw)) {
      return Response.json({ error: 'Bad Gateway' }, { status: 502 });
    }
    return Response.json(raw);
  } catch (error) {
    console.error('POST /api/me/routine/plan failed:', error);
    return Response.json({ error: 'Bad Gateway' }, { status: 502 });
  }
}
