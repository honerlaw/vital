/**
 * Client call to `POST /api/me/routine/plan` (030) — fetch the LLM-designed intake question graph.
 * Validated through `isQuestionGraph`; throws on any failure so the caller can fall back to the
 * fixed deterministic spine.
 */
import { apiFetch } from '@/auth/api-fetch';
import { isQuestionGraph } from '@/data/guards';
import { type QuestionGraph } from '@/data/routine-types';

type GetSessionToken = () => Promise<string | null>;

export async function fetchRoutinePlan(getToken: GetSessionToken): Promise<QuestionGraph> {
  const res = await apiFetch('/api/me/routine/plan', getToken, { method: 'POST', body: '{}' });
  if (!res.ok) {
    throw new Error(`Request failed (${String(res.status)})`);
  }
  const body: unknown = await res.json();
  if (!isQuestionGraph(body)) {
    throw new Error('Malformed /api/me/routine/plan response');
  }
  return body;
}
