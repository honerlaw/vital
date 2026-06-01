import { Program } from '@/data/types';

/**
 * Look up a program by id within the hydrated catalog. Throws on a miss — callers pass a TRUSTED id
 * (the normalized `activeProgramId` or a `live.programId`); untrusted lookups (e.g. a route param)
 * should `programs.find(...)` directly and handle the not-found case.
 */
export const getProgram = (programs: Program[], id: string): Program => {
  const p = programs.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown program: ${id}`);
  return p;
};
