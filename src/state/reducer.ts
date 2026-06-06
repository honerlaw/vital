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
      // null = "never chose" and MUST stay null so the Today chooser shows (014). The check sits
      // BEFORE the `.some()` re-point: `.some(p => p.id === null)` is false, so falling through
      // would silently re-point a never-chose user to the first program — the exact bug 014 fixes.
      // A stale NON-null id (program removed from the catalog) still re-points to the first
      // program: that user already chose once, so we converge rather than re-ask.
      const activeProgramId =
        state.activeProgramId === null || programs.some((p) => p.id === state.activeProgramId)
          ? state.activeProgramId
          : programs[0].id;
      return { ...state, programs, programsStatus: 'ready', activeProgramId };
    }
    case 'HYDRATE_PROGRAMS_ERROR':
      return { ...state, programsStatus: 'error' };
    case 'HYDRATE_USER_STATE': {
      const { activeProgramId, cursor, history } = action.payload;
      const catalogReady = state.programsStatus === 'ready';
      // Mirror HYDRATE_PROGRAMS' normalization so the two fetches can land in either order:
      // a STALE server id (absent from a ready catalog) re-points to the first program; with
      // the catalog not yet ready, the raw server id is stored and HYDRATE_PROGRAMS normalizes
      // later. A null id (no row — the user never chose) STAYS null so the Today chooser shows
      // (014). Normalization PRESERVES cursor — only SET_ACTIVE_PROGRAM zeroes it.
      let nextActiveId: string | null;
      if (activeProgramId !== null) {
        nextActiveId =
          !catalogReady || state.programs.some((p) => p.id === activeProgramId)
            ? activeProgramId
            : state.programs[0].id;
      } else {
        nextActiveId = null;
      }
      return {
        ...state,
        userStateStatus: 'ready',
        activeProgramId: nextActiveId,
        cursor,
        history,
      };
    }
    case 'HYDRATE_USER_STATE_ERROR':
      return { ...state, userStateStatus: 'error' };
    case 'RESET_USER_STATE': {
      // Sign-out: clear exactly the per-user fields (incl. a live session — it must not leak
      // to the next account) and re-arm the user-state fetch. Catalog fields are untouched so
      // the gate doesn't re-error. Idempotent: same reference back when nothing to reset
      // (React bails out), so a mount-time dispatch while signed out is a no-op.
      const nothingToReset =
        state.activeProgramId === null &&
        state.cursor === 0 &&
        state.history.length === 0 &&
        state.live === null &&
        state.userStateStatus === 'loading';
      if (nothingToReset) return state;
      return {
        ...state,
        activeProgramId: null,
        cursor: 0,
        history: [],
        live: null,
        userStateStatus: 'loading',
      };
    }
    case 'RETRY_HYDRATE': {
      // Only meaningful from an error view; resets ONLY the statuses currently in 'error' (a
      // healthy catalog is never refetched, and vice versa). The no-op path keeps double-taps
      // idempotent and preserves the invariant that mount and error→loading are the only ways
      // into 'loading' (the status-keyed effects refetch whenever their status is 'loading').
      if (state.programsStatus !== 'error' && state.userStateStatus !== 'error') return state;
      return {
        ...state,
        programsStatus: state.programsStatus === 'error' ? 'loading' : state.programsStatus,
        userStateStatus: state.userStateStatus === 'error' ? 'loading' : state.userStateStatus,
      };
    }
    case 'START_WORKOUT': {
      // Null guard: compulsory for the type system (the trusted `getProgram` takes a string) and
      // unreachable via UI (the chooser replaces every Begin affordance while null). It also
      // transitively keeps finishSession safe: `live` only ever exists after a non-null start.
      if (state.activeProgramId === null) return state;
      const program = getProgram(state.programs, state.activeProgramId);
      return { ...state, live: startSession(program, action.dayIndex) };
    }
    case 'TOGGLE_SET': {
      if (!state.live) return state;
      return { ...state, live: toggleSet(state.live, action.ei, action.si) };
    }
    case 'FINISH_WORKOUT': {
      if (!state.live) return state;
      const { log, nextCursor } = finishSession(state, action.nowISO);
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
