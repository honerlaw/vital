import { ReactNode, useEffect, useMemo, useReducer } from 'react';
import { fetchPrograms } from '@/data/programs-api';
import { AppContext } from '@/state/app-context';
import { DEFAULT_STATE } from '@/state/default-state';
import { reducer } from '@/state/reducer';

export default function StateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);

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

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
