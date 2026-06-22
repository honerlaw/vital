import { isQuestionOption } from '@/data/guards/isQuestionOption';
import { isShowCondition } from '@/data/guards/isShowCondition';
import { type Question } from '@/data/routine-types';

/**
 * Guard for one intake question (030), a discriminated union on `kind`. Common fields (`id`,
 * `prompt`, optional `showWhen`) are checked first, then the per-kind fields. An unknown `kind`
 * falls through to `false` (strict-writer, 028) so the renderer never meets a control it can't
 * draw. Select kinds require a non-empty `options` array; `text` requires a positive `maxLength`.
 */
export function isQuestion(value: unknown): value is Question {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value) || typeof value.id !== 'string') return false;
  if (!('prompt' in value) || typeof value.prompt !== 'string') return false;
  if (!('kind' in value)) return false;
  if ('showWhen' in value && !isShowCondition(value.showWhen)) return false;
  const kind = value.kind;
  if (kind === 'single-select' || kind === 'multi-select') {
    return (
      'options' in value &&
      Array.isArray(value.options) &&
      value.options.length > 0 &&
      value.options.every(isQuestionOption)
    );
  }
  if (kind === 'number') {
    const minOk = !('min' in value) || typeof value.min === 'number';
    const maxOk = !('max' in value) || typeof value.max === 'number';
    const unitOk = !('unit' in value) || typeof value.unit === 'string';
    return minOk && maxOk && unitOk;
  }
  if (kind === 'text') {
    return (
      'maxLength' in value &&
      typeof value.maxLength === 'number' &&
      Number.isInteger(value.maxLength) &&
      value.maxLength > 0
    );
  }
  return false;
}
