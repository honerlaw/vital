import { useAuth } from '@clerk/expo';
import { ReactNode, useEffect, useMemo, useReducer } from 'react';
import { finishSession } from '@/data/engine';
import { fetchEquipment } from '@/data/fetch-equipment';
import { fetchPrograms } from '@/data/programs-api';
import { fetchUserPrograms } from '@/data/fetch-user-programs';
import { fetchUserState } from '@/data/fetch-user-state';
import { postSession } from '@/data/post-session';
import { putUserState } from '@/data/put-user-state';
import { recordBootMilestone } from '@/observability/record-boot-milestone';
import { AppContext } from '@/state/app-context';
import { Action } from '@/state/actions';
import { DEFAULT_STATE } from '@/state/default-state';
import { reducer } from '@/state/reducer';

export default function StateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);
  const { isLoaded, isSignedIn, getToken } = useAuth();

  // Hydrate the catalog whenever the status is (or returns to) 'loading': on mount, and again
  // after RETRY_HYDRATE flips error→loading. Those are the only two ways into 'loading' (the
  // reducer no-ops RETRY_HYDRATE outside 'error'), so a refetch can never race an in-flight
  // fetch. The render-gate holds the program screens until this resolves, so the reducer/screens
  // only ever read `state.programs` once it's `ready`.
  useEffect(() => {
    if (state.programsStatus !== 'loading') return;
    let cancelled = false;
    fetchPrograms()
      .then((programs) => {
        if (!cancelled) dispatch({ type: 'HYDRATE_PROGRAMS', programs });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'HYDRATE_PROGRAMS_ERROR' });
      });
    return () => {
      cancelled = true;
    };
  }, [state.programsStatus]);

  // Hydrate the per-user state once Clerk is loaded AND signed in (the route is requireAuth —
  // fetching earlier would burn the retry on a guaranteed 401). Same status-keyed shape as the
  // catalog effect; a 401 (e.g. token expiry) lands in the ordinary 'error' path, and retry is
  // user-initiated only, so no auto retry-loop is possible.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || state.userStateStatus !== 'loading') return;
    let cancelled = false;
    fetchUserState(getToken)
      .then((payload) => {
        if (!cancelled) dispatch({ type: 'HYDRATE_USER_STATE', payload });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'HYDRATE_USER_STATE_ERROR' });
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, state.userStateStatus]);

  // Hydrate the user's generated programs (030) once Clerk is loaded AND signed in — same
  // status-keyed shape as the per-user-state effect (the route is requireAuth). A failure lands in
  // the ordinary 'error' path; retry is user-initiated only.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || state.userProgramsStatus !== 'loading') return;
    let cancelled = false;
    fetchUserPrograms(getToken)
      .then((programs) => {
        if (!cancelled) dispatch({ type: 'HYDRATE_USER_PROGRAMS', programs });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'HYDRATE_USER_PROGRAMS_ERROR' });
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, state.userProgramsStatus]);

  // Hydrate the user's equipment profile (042) once Clerk is loaded AND signed in — same
  // status-keyed shape as the other per-user fetches (the route is requireAuth). A failure lands in
  // the ordinary 'error' path; retry is user-initiated only. A user with no row gets an empty list
  // (→ ready), so the intake simply pre-fills empty.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || state.equipmentStatus !== 'loading') return;
    let cancelled = false;
    fetchEquipment(getToken)
      .then((profile) => {
        if (!cancelled) dispatch({ type: 'HYDRATE_EQUIPMENT', items: profile.items });
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'HYDRATE_EQUIPMENT_ERROR' });
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, state.equipmentStatus]);

  // Watchdog milestone: boot-ready when ALL startup fetches have landed — recorded here from a
  // transition-observing effect because bootStatus() is a pure selector re-evaluated every render
  // and must stay side-effect-free.
  useEffect(() => {
    if (
      state.programsStatus === 'ready' &&
      state.userStateStatus === 'ready' &&
      state.userProgramsStatus === 'ready' &&
      state.equipmentStatus === 'ready'
    ) {
      recordBootMilestone('boot-ready');
    }
  }, [
    state.programsStatus,
    state.userStateStatus,
    state.userProgramsStatus,
    state.equipmentStatus,
  ]);

  // Sign-out: clear the per-user fields so they can't leak into the next account's session.
  // Transition-keyed (effects fire on dep change, not every render); the dispatch is deferred
  // into an async callback per the set-state-in-effect rule, and the reducer case is a
  // same-reference no-op when there's nothing to reset.
  useEffect(() => {
    if (!isLoaded || isSignedIn) return;
    const id = setTimeout(() => {
      dispatch({ type: 'RESET_USER_STATE' });
    }, 0);
    return () => {
      clearTimeout(id);
    };
  }, [isLoaded, isSignedIn]);

  // The context exposes a WRAPPED dispatch: forward to the reducer, then best-effort persist
  // (fire-and-forget — local reducer state stays authoritative; failures warn and drop).
  const value = useMemo(() => {
    const dispatchAndPersist = (action: Action): void => {
      dispatch(action);
      const warn = (err: unknown) => {
        console.warn('persist failed:', err);
      };
      if (action.type === 'SET_ACTIVE_PROGRAM' || action.type === 'SWITCH_AND_START_WORKOUT') {
        // Mirror the reducer's in-catalog guard so a no-op dispatch doesn't PUT. Both actions
        // change ONLY the active id — the pre-reduce cursor map is forwarded verbatim (015:
        // switching never mutates it; SWITCH's session start doesn't advance anything).
        if (state.programs.some((p) => p.id === action.id)) {
          void putUserState(getToken, action.id, state.cursors).catch(warn);
        }
      } else if (action.type === 'CANCEL_WORKOUT') {
        // Revert-a-switch persist (015). MUST read the PRE-reduce snapshot: post-reduce `live`
        // is null, so `switchedFrom` would be unrecoverable. Guard mirrors the reducer — only a
        // session that committed a switch at Begin reverts; a plain cancel persists nothing.
        if (state.live !== null && state.live.switchedFrom !== null) {
          void putUserState(getToken, state.live.switchedFrom, state.cursors).catch(warn);
        }
      } else if (action.type === 'FINISH_WORKOUT') {
        // Mirror the reducer's live!==null guard (a double-tap must not POST a spurious
        // session while the reducer no-ops). finishSession is pure and gets the same args the
        // reducer sees, so the POSTed log/cursor are provably identical to what the reducer
        // stores. (Holds because FINISH_WORKOUT is a single user tap — no concurrent dispatch.)
        if (state.live !== null) {
          const { log, nextCursor } = finishSession(state, action.nowISO);
          // `cursor` is the NEW value for cursors[log.programId] (015) — the server merges it
          // into the map. `live.programId` (not the nullable `activeProgramId`): inside the live
          // guard it's a guaranteed string, and live only exists after a non-null start.
          void postSession(getToken, {
            ...log,
            cursor: nextCursor,
            activeProgramId: state.live.programId,
          }).catch(warn);
        }
      } else if (action.type === 'HYDRATE_USER_STATE') {
        // Persist-after-normalize: the server returned an id the ready catalog no longer has —
        // the reducer re-points to the first program; converge the server too. Forwards
        // `action.payload.cursors` (the just-arrived server map) — pre-reduce `state.cursors`
        // is the stale boot seed `{}` here and would wipe the user's rotation map (015).
        // Only persist a re-point once ALL hydrations are ready, so a generated active program
        // (merged once `userProgramsStatus === 'ready'`) is matched against the full set, never
        // wrongly converged to the first catalog program during the load window (030).
        const serverId = action.payload.activeProgramId;
        if (
          state.programsStatus === 'ready' &&
          state.userProgramsStatus === 'ready' &&
          serverId !== null &&
          !state.programs.some((p) => p.id === serverId)
        ) {
          void putUserState(getToken, state.programs[0].id, action.payload.cursors).catch(warn);
        }
      } else if (action.type === 'HYDRATE_PROGRAMS') {
        // Symmetric persist-after-normalize for the other landing order. Here pre-reduce
        // `state.cursors` IS the hydrated map: the `userStateStatus === 'ready'` guard can only
        // be true after the user-state reduction stored it (015). Null-guarded (014): a
        // never-chose user must NOT be auto-PUT to the first program — `.some(p => p.id ===
        // null)` is false, so without the guard this branch would fire.
        // Mirror the reducer: only converge once all hydrations are ready, and NEVER re-point an
        // active id that is a known generated program (030) — it isn't in the catalog by design,
        // so the catalog-membership check alone would wrongly converge it.
        if (
          state.userStateStatus === 'ready' &&
          state.userProgramsStatus === 'ready' &&
          state.activeProgramId !== null &&
          !state.userProgramIds.includes(state.activeProgramId) &&
          action.programs.length > 0 &&
          !action.programs.some((p) => p.id === state.activeProgramId)
        ) {
          void putUserState(getToken, action.programs[0].id, state.cursors).catch(warn);
        }
      }
    };
    return { state, dispatch: dispatchAndPersist };
  }, [state, getToken]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
