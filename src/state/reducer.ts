import {
  finishSession,
  getProgram,
  startSession,
  updateSet,
} from '@/data/engine';
import { AppState } from '@/data/types';
import { Action } from '@/state/actions';
import { normalizeActiveId } from '@/state/normalize-active-id';

export const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'HYDRATE_PROGRAMS': {
      const catalog = action.programs;
      // An empty catalog is treated as unavailable so the render-gate shows the error view rather
      // than the home tab trying to resolve a now-absent active program.
      if (catalog.length === 0) {
        return { ...state, programs: catalog, programsStatus: 'error' };
      }
      // Preserve any already-merged generated programs (030) — the catalog fetch replaces only the
      // catalog partition. The active-id re-point is centralized in `normalizeActiveId`, which
      // only fires once ALL hydrations are ready (so a generated active program isn't dropped
      // before its own fetch lands) and keeps a null id null (014).
      const userPortion = state.programs.filter((p) => state.userProgramIds.includes(p.id));
      const next: AppState = {
        ...state,
        programs: [...catalog, ...userPortion],
        programsStatus: 'ready',
      };
      return { ...next, activeProgramId: normalizeActiveId(next) };
    }
    case 'HYDRATE_PROGRAMS_ERROR':
      return { ...state, programsStatus: 'error' };
    case 'HYDRATE_USER_STATE': {
      const { activeProgramId, cursors, history } = action.payload;
      // Store the raw server id, then let `normalizeActiveId` re-point it iff all hydrations are
      // ready and it's stale (absent from the merged set). A null id STAYS null (014).
      const next: AppState = {
        ...state,
        userStateStatus: 'ready',
        activeProgramId,
        cursors,
        history,
      };
      return { ...next, activeProgramId: normalizeActiveId(next) };
    }
    case 'HYDRATE_USER_STATE_ERROR':
      return { ...state, userStateStatus: 'error' };
    case 'HYDRATE_USER_PROGRAMS': {
      // Merge the user's generated programs (030) into the single `programs` array, keeping the
      // current catalog partition. Dedup by id so a reload never produces duplicate cursor slots.
      const catalogPortion = state.programs.filter((p) => !state.userProgramIds.includes(p.id));
      const seen = new Set<string>();
      const userPrograms = action.programs.filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
      const next: AppState = {
        ...state,
        programs: [...catalogPortion, ...userPrograms],
        userProgramIds: userPrograms.map((p) => p.id),
        userProgramsStatus: 'ready',
      };
      return { ...next, activeProgramId: normalizeActiveId(next) };
    }
    case 'HYDRATE_USER_PROGRAMS_ERROR':
      return { ...state, userProgramsStatus: 'error' };
    case 'ADD_USER_PROGRAM': {
      // A just-saved generated program (030). Dedup by id (a double-tap must not duplicate it).
      if (state.programs.some((p) => p.id === action.program.id)) return state;
      return {
        ...state,
        programs: [...state.programs, action.program],
        userProgramIds: [...state.userProgramIds, action.program.id],
      };
    }
    case 'REMOVE_USER_PROGRAM': {
      // Delete a generated program (030). History is self-contained (028), so this is safe; if the
      // deleted program was active, fall back to the null chooser (019).
      if (!state.userProgramIds.includes(action.id)) return state;
      return {
        ...state,
        programs: state.programs.filter((p) => p.id !== action.id),
        userProgramIds: state.userProgramIds.filter((pid) => pid !== action.id),
        activeProgramId: state.activeProgramId === action.id ? null : state.activeProgramId,
      };
    }
    case 'RESET_USER_STATE': {
      // Sign-out: clear exactly the per-user fields (incl. a live session — it must not leak to the
      // next account, and the generated programs which are per-user too) and re-arm both per-user
      // fetches. Catalog fields are untouched so the gate doesn't re-error. Idempotent: same
      // reference back when nothing to reset, so a mount-time dispatch while signed out is a no-op.
      const nothingToReset =
        state.activeProgramId === null &&
        Object.keys(state.cursors).length === 0 &&
        state.history.length === 0 &&
        state.live === null &&
        state.userStateStatus === 'loading' &&
        state.userProgramsStatus === 'loading' &&
        state.userProgramIds.length === 0;
      if (nothingToReset) return state;
      // Drop the generated-program partition but keep the catalog reference stable when there is
      // nothing to drop (so existing reference-equality expectations on the catalog hold).
      const programs =
        state.userProgramIds.length === 0
          ? state.programs
          : state.programs.filter((p) => !state.userProgramIds.includes(p.id));
      return {
        ...state,
        programs,
        userProgramIds: [],
        userProgramsStatus: 'loading',
        activeProgramId: null,
        cursors: {},
        history: [],
        live: null,
        userStateStatus: 'loading',
      };
    }
    case 'RETRY_HYDRATE': {
      // Only meaningful from an error view; resets ONLY the statuses currently in 'error' (a
      // healthy fetch is never refetched). The no-op path keeps double-taps idempotent and
      // preserves the invariant that mount and error→loading are the only ways into 'loading'.
      if (
        state.programsStatus !== 'error' &&
        state.userStateStatus !== 'error' &&
        state.userProgramsStatus !== 'error'
      ) {
        return state;
      }
      return {
        ...state,
        programsStatus: state.programsStatus === 'error' ? 'loading' : state.programsStatus,
        userStateStatus: state.userStateStatus === 'error' ? 'loading' : state.userStateStatus,
        userProgramsStatus:
          state.userProgramsStatus === 'error' ? 'loading' : state.userProgramsStatus,
      };
    }
    case 'START_WORKOUT': {
      // Null guard: compulsory for the type system (the trusted `getProgram` takes a string) and
      // unreachable via UI (the chooser replaces every Begin affordance while null). It also
      // transitively keeps finishSession safe: `live` only ever exists after a non-null start.
      if (state.activeProgramId === null) return state;
      const program = getProgram(state.programs, state.activeProgramId);
      return { ...state, live: startSession(program, action.dayIndex, action.nowISO) };
    }
    case 'UPDATE_SET': {
      if (!state.live) return state;
      // All weight/reps coercion happens inside the pure updateSet (022) — the reducer just
      // forwards the patch, keeping the engine the single normalization choke point.
      return { ...state, live: updateSet(state.live, action.ei, action.si, action.patch) };
    }
    case 'FINISH_WORKOUT': {
      if (!state.live) return state;
      const { log, nextCursor } = finishSession(state, action.nowISO);
      return {
        ...state,
        history: [log, ...state.history],
        cursors: { ...state.cursors, [state.live.programId]: nextCursor },
        live: null,
      };
    }
    case 'CANCEL_WORKOUT': {
      if (!state.live) return state;
      // Revert a switch committed at the Begin tap (015): the session carries the previously
      // active id; restoring it is lossless because a switch never mutates the cursor map.
      const activeProgramId =
        state.live.switchedFrom !== null ? state.live.switchedFrom : state.activeProgramId;
      return { ...state, activeProgramId, live: null };
    }
    case 'SET_ACTIVE_PROGRAM': {
      // Ignore an id that isn't in the merged program set (catalog + generated, 030) — upholds the
      // activeProgramId-resolvable invariant so the trusted `getProgram` lookups can't throw.
      if (!state.programs.some((p) => p.id === action.id)) return state;
      // Only the id changes — each program keeps its place in the cursor map (015).
      return { ...state, activeProgramId: action.id };
    }
    case 'SWITCH_AND_START_WORKOUT': {
      // Switch + start as ONE reducer case (015). Same in-set guard as SET_ACTIVE_PROGRAM (now over
      // the merged set); resumes the target program's own position (missing key = day 0) and
      // records the previous id on the session so CANCEL can revert the committed switch.
      if (action.id === state.activeProgramId) return state;
      if (!state.programs.some((p) => p.id === action.id)) return state;
      const program = getProgram(state.programs, action.id);
      const dayIndex = (state.cursors[action.id] ?? 0) % program.days.length;
      return {
        ...state,
        activeProgramId: action.id,
        live: {
          ...startSession(program, dayIndex, action.nowISO),
          switchedFrom: state.activeProgramId,
        },
      };
    }
  }
};
