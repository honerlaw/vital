import { PROGRAMS } from '@/data/programs';
import { Program } from '@/data/types';

export const getProgram = (id: string): Program => {
  const p = PROGRAMS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown program: ${id}`);
  return p;
};
