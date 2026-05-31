import { LiveSession } from '@/data/types';

export const toggleSet = (s: LiveSession, ei: number, si: number): LiveSession => {
  const completed = s.completed.map((row, r) =>
    r === ei ? row.map((v, c) => (c === si ? !v : v)) : row,
  );
  return { ...s, completed };
};
