import { type IntakeAnswer } from '@/data/routine-types';

/**
 * Guard for one captured intake answer (030). `value` is a string, a finite number, or a string
 * array (multi-select). Used to validate the client-supplied `IntakeSpec` server-side before it
 * is woven into a generation prompt (strict-writer, 028).
 */
export function isIntakeAnswer(value: unknown): value is IntakeAnswer {
  if (typeof value !== 'object' || value === null) return false;
  if (!('questionId' in value) || typeof value.questionId !== 'string') return false;
  if (!('label' in value) || typeof value.label !== 'string') return false;
  if (!('value' in value)) return false;
  const v = value.value;
  return (
    typeof v === 'string' ||
    (typeof v === 'number' && Number.isFinite(v)) ||
    (Array.isArray(v) && v.every((e) => typeof e === 'string'))
  );
}
