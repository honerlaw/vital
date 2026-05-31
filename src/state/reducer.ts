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
    case 'START_WORKOUT': {
      const program = getProgram(state.activeProgramId);
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
    case 'SET_ACTIVE_PROGRAM':
      return { ...state, activeProgramId: action.id, cursor: 0 };
  }
};
