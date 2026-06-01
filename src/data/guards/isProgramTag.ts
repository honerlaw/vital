import { type ProgramTag } from '@/data/types';

const PROGRAM_TAGS: readonly ProgramTag[] = ['Strength', 'Muscle Growth', 'Full Body'];

export function isProgramTag(value: unknown): value is ProgramTag {
  return typeof value === 'string' && PROGRAM_TAGS.some((tag) => tag === value);
}
