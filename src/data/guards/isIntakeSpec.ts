import { isIntakeAnswer } from '@/data/guards/isIntakeAnswer';
import { type IntakeSpec } from '@/data/routine-types';

/**
 * Guard for an `IntakeSpec` (030): `{ answers: IntakeAnswer[] }`. Validates the request body of
 * `/generate` and `/refine` before any LLM call. An empty answers array is permitted (the LLM
 * falls back to sensible defaults), but every entry present must be well-formed.
 */
export function isIntakeSpec(value: unknown): value is IntakeSpec {
  return (
    typeof value === 'object' &&
    value !== null &&
    'answers' in value &&
    Array.isArray(value.answers) &&
    value.answers.every(isIntakeAnswer)
  );
}
