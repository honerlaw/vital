import { AppState } from '@/data/types';

/**
 * Initial state. The catalog starts empty and `loading`; `StateProvider` fetches it at startup and
 * dispatches `HYDRATE_PROGRAMS`, and the render-gate holds the program screens until it's `ready`.
 *
 * `activeProgramId` starts null — null means "the user has never chosen a program" (014). It only
 * becomes non-null via `SET_ACTIVE_PROGRAM` or hydration of a previously-persisted choice; the
 * Today screen renders the first-run chooser while it's null.
 */
export const DEFAULT_STATE: AppState = {
  programs: [],
  programsStatus: 'loading',
  userStateStatus: 'loading',
  activeProgramId: null,
  cursor: 0,
  history: [],
  live: null,
};
