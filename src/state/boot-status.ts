import { AppState, ProgramsStatus } from '@/data/types';

/**
 * Combined readiness for the render-gate (012): the signed-in app waits for BOTH startup
 * fetches — the catalog and the per-user state. Error wins over loading so a failed fetch
 * surfaces the Retry view immediately instead of spinning forever behind the other fetch.
 */
export const bootStatus = (state: AppState): ProgramsStatus => {
  if (state.programsStatus === 'error' || state.userStateStatus === 'error') return 'error';
  if (state.programsStatus === 'ready' && state.userStateStatus === 'ready') return 'ready';
  return 'loading';
};
