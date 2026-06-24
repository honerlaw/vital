/**
 * `POST /api/me/routine/plan` (030; streamed since 034) — ask Claude to design the adaptive intake
 * question graph, STREAMING structural progress as Server-Sent Events. Auth + the daily cap run
 * FIRST (401/429 = plain JSON before any stream bytes). The stream emits `progress` snapshots
 * (questions designed so far), a terminal `done` carrying the `isQuestionGraph`-validated graph, or
 * a terminal `error` — on which the client falls back to the fixed deterministic spine. POST (not
 * GET) because it triggers a billable LLM call counted toward the per-user daily cap.
 */
import { isQuestionGraph } from '@/data/guards';
import { buildRoutineStream } from '@/server/llm/build-routine-stream';
import { planPrompt } from '@/server/llm/plan-prompt';
import { withinDailyLlmCap } from '@/server/rate-limit';
import { requireAuth } from '@/server/requireAuth';

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  try {
    if (!(await withinDailyLlmCap(auth.userId))) {
      return Response.json({ error: 'Daily limit reached' }, { status: 429 });
    }
  } catch (error) {
    console.error('POST /api/me/routine/plan cap check failed:', error);
    return Response.json({ error: 'Bad Gateway' }, { status: 502 });
  }
  const { system, user } = planPrompt();
  return buildRoutineStream({
    system,
    user,
    signal: request.signal,
    arrayKey: 'questions',
    finalize: (raw) => {
      if (!isQuestionGraph(raw)) throw new Error('Malformed question graph');
      return raw;
    },
  });
}
