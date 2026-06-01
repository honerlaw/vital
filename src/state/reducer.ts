import {
  finishSession,
  getProgram,
  startSession,
  toggleSet,
} from '@/data/engine';
import { AppState } from '@/data/types';
import { Action } from '@/state/actions';

export const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'HYDRATE_PROGRAMS': {
      const programs = action.programs;
      // An empty catalog is treated as unavailable so the render-gate shows the error view rather
      // than the home tab trying to resolve a now-absent active program.
      if (programs.length === 0) {
        return { ...state, programs, programsStatus: 'error' };
      }
      // Re-point activeProgramId if the persisted id isn't in the hydrated catalog.
      const activeProgramId = programs.some((p) => p.id === state.activeProgramId)
        ? state.activeProgramId
        : programs[0].id;
      return { ...state, programs, programsStatus: 'ready', activeProgramId };
    }
    case 'HYDRATE_PROGRAMS_ERROR':
      return { ...state, programsStatus: 'error' };
    case 'START_WORKOUT': {
      const program = getProgram(state.programs, state.activeProgramId);
      return { ...state, live: startSession(program, action.dayIndex) };
    }
    case 'TOGGLE_SET': {
      if (!state.live) return state;
      return { ...state, live: toggleSet(state.live, action.ei, action.si) };
    }
    case 'FINISH_WORKOUT': {
      if (!state.live) return state;
      const { log, nextCursor } = finishSession(state);
      return {
        ...state,
        history: [log, ...state.history],
        cursor: nextCursor,
        live: null,
      };
    }
    case 'CANCEL_WORKOUT':
      return { ...state, live: null };
    case 'SET_ACTIVE_PROGRAM': {
      // Ignore an id that isn't in the hydrated catalog — upholds the activeProgramId-in-catalog
      // invariant HYDRATE_PROGRAMS establishes, so the trusted `getProgram` lookups can't throw.
      if (!state.programs.some((p) => p.id === action.id)) return state;
      return { ...state, activeProgramId: action.id, cursor: 0 };
    }
  }
};
