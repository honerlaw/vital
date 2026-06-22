import { type ShowCondition } from '@/data/routine-types';

/**
 * Guard for a branch condition (030): the single-equality grammar `{ questionId, equals }`, both
 * strings. Deliberately NOT an arbitrary expression — the client evaluator only ever checks one
 * prior answer for equality, so a malformed/cleverer condition is rejected here.
 */
export function isShowCondition(value: unknown): value is ShowCondition {
  return (
    typeof value === 'object' &&
    value !== null &&
    'questionId' in value &&
    typeof value.questionId === 'string' &&
    'equals' in value &&
    typeof value.equals === 'string'
  );
}
