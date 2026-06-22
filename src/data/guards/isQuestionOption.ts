import { type QuestionOption } from '@/data/routine-types';

/** Guard for a select question's option (030): `{ value, label }`, both strings. */
export function isQuestionOption(value: unknown): value is QuestionOption {
  return (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    typeof value.value === 'string' &&
    'label' in value &&
    typeof value.label === 'string'
  );
}
