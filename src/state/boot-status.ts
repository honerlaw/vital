import { AppState, ProgramsStatus } from '@/data/types';

/**
 * Combined readiness for the render-gate (012): the signed-in app waits for the catalog, the
 * per-user state, AND the user's generated programs (030 — an active program may be a generated
 * one, so it must be merged before screens read `programs`). Error wins over loading so a failed
 * fetch surfaces the Retry view immediately instead of spinning forever behind another fetch.
 */
export const bootStatus = (state: AppState): ProgramsStatus => {
  if (
    state.programsStatus === 'error' ||
    state.userStateStatus === 'error' ||
    state.userProgramsStatus === 'error'
  ) {
    return 'error';
  }
  if (
    state.programsStatus === 'ready' &&
    state.userStateStatus === 'ready' &&
    state.userProgramsStatus === 'ready'
  ) {
    return 'ready';
  }
  return 'loading';
};
