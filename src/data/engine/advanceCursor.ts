import { Program } from '@/data/types';

/** Advance the pointer one step, wrapping around the cycle. */
export const advanceCursor = (program: Program, cursor: number): number =>
  (cursor + 1) % program.days.length;
