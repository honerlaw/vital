import { useAuth } from '@clerk/expo';
import { ReactNode, useEffect, useMemo, useReducer } from 'react';
import { finishSession } from '@/data/engine';
import { fetchPrograms } from '@/data/programs-api';
import { fetchUserState } from '@/data/fetch-user-state';
import { postSession } from '@/data/post-session';
import { putUserState } from '@/data/put-user-state';
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
      if (action.type === 'SET_ACTIVE_PROGRAM') {
        // Mirror the reducer's in-catalog guard so a no-op dispatch doesn't PUT.
        if (state.programs.some((p) => p.id === action.id)) {
          void putUserState(getToken, action.id, 0).catch(warn);
        }
      } else if (action.type === 'FINISH_WORKOUT') {
        // Mirror the reducer's live!==null guard (a double-tap must not POST a spurious
        // session while the reducer no-ops). finishSession is pure and gets the same args the
        // reducer sees, so the POSTed log/cursor are provably identical to what the reducer
        // stores. (Holds because FINISH_WORKOUT is a single user tap — no concurrent dispatch.)
        if (state.live !== null) {
          const { log, nextCursor } = finishSession(state, action.nowISO);
          void postSession(getToken, {
            ...log,
            cursor: nextCursor,
            activeProgramId: state.activeProgramId,
          }).catch(warn);
        }
      } else if (action.type === 'HYDRATE_USER_STATE') {
        // Persist-after-normalize: the server returned an id the ready catalog no longer has —
        // the reducer re-points to the first program; converge the server too (preserving the
        // server-sent cursor — normalization never zeroes it).
        const serverId = action.payload.activeProgramId;
        if (
          state.programsStatus === 'ready' &&
          serverId !== null &&
          !state.programs.some((p) => p.id === serverId)
        ) {
          void putUserState(getToken, state.programs[0].id, action.payload.cursor).catch(warn);
        }
      } else if (action.type === 'HYDRATE_PROGRAMS') {
        // Symmetric persist-after-normalize for the other landing order (preserved cursor).
        if (
          state.userStateStatus === 'ready' &&
          action.programs.length > 0 &&
          !action.programs.some((p) => p.id === state.activeProgramId)
        ) {
          void putUserState(getToken, action.programs[0].id, state.cursor).catch(warn);
        }
      }
    };
    return { state, dispatch: dispatchAndPersist };
  }, [state, getToken]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
