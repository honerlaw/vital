import { isQuestion } from '@/data/guards/isQuestion';
import { type QuestionGraph } from '@/data/routine-types';

/**
 * Guard for the `/plan` response (030): `{ questions: Question[] }`, non-empty. Validates the LLM
 * output before the client trusts it to drive the wizard — a malformed graph 400s server-side
 * (strict-writer, 028) and the client falls back to the fixed deterministic spine.
 */
export function isQuestionGraph(value: unknown): value is QuestionGraph {
  return (
    typeof value === 'object' &&
    value !== null &&
    'questions' in value &&
    Array.isArray(value.questions) &&
    value.questions.length > 0 &&
    value.questions.every(isQuestion)
  );
}
