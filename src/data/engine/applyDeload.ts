/**
 * Apply an optional deload (030): when consecutive failed attempts reach the trigger, drop the
 * computed target by `dropPct` percent; otherwise return it unchanged. Pure.
 */
import { type DeloadModifier } from '@/data/types';

export const applyDeload = (
  target: number,
  deload: DeloadModifier,
  consecutiveFails: number,
): number => {
  if (consecutiveFails < deload.triggerConsecutiveFails) return target;
  return target * (1 - deload.dropPct / 100);
};
