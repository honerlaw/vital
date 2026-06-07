import { LiveSession } from '@/data/types';

export const sessionProgress = (
  s: LiveSession,
): { done: number; total: number; pct: number } => {
  const flat = s.sets.flat();
  const total = flat.length;
  const done = flat.filter((e) => e.done).length;
  return { done, total, pct: total ? done / total : 0 };
};
