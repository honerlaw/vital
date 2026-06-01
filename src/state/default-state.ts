import { AppState } from '@/data/types';

/**
 * The program the app lands on before any user selection. It seeds `activeProgramId`; once the
 * catalog hydrates, `HYDRATE_PROGRAMS` re-points it to the first program if this id isn't present.
 */
export const DEFAULT_ACTIVE_PROGRAM_ID = 'bbr';

/**
 * Initial state. The catalog starts empty and `loading`; `StateProvider` fetches it at startup and
 * dispatches `HYDRATE_PROGRAMS`, and the render-gate holds the program screens until it's `ready`.
 */
export const DEFAULT_STATE: AppState = {
  programs: [],
  programsStatus: 'loading',
  activeProgramId: DEFAULT_ACTIVE_PROGRAM_ID,
  cursor: 0,
  history: [],
  live: null,
};
