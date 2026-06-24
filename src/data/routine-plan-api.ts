/**
 * Client call to `POST /api/me/routine/plan` (030; streamed since 034) — fetch the LLM-designed
 * intake question graph over SSE, forwarding `progress` (questions designed) to the wizard.
 * `isQuestionGraph` is a light transport sanity check (the server already validated). Throws on
 * stream `error`, non-2xx, or a dropped connection so the caller falls back to the fixed spine.
 */
import { type GetSessionToken } from '@/auth/auth-headers';
import { isQuestionGraph } from '@/data/guards';
import { streamRoutine, type RoutineStreamOpts } from '@/data/stream-routine';
import { type QuestionGraph } from '@/data/routine-types';

export async function fetchRoutinePlan(
  getToken: GetSessionToken,
  opts: RoutineStreamOpts,
): Promise<QuestionGraph> {
  return streamRoutine<QuestionGraph>({
    path: '/api/me/routine/plan',
    getToken,
    body: '{}',
    signal: opts.signal,
    isValid: isQuestionGraph,
    onProgress: opts.onProgress,
    onRetry: opts.onRetry,
  });
}
