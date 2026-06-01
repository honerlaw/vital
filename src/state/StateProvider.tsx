import { ReactNode, useEffect, useMemo, useReducer } from 'react';
import { fetchPrograms } from '@/data/programs-api';
import { AppContext } from '@/state/app-context';
import { DEFAULT_STATE } from '@/state/default-state';
import { reducer } from '@/state/reducer';

export default function StateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);

  // Hydrate the catalog once at startup. The render-gate holds the program screens until this
  // resolves, so the reducer/screens only ever read `state.programs` once it's `ready`.
  useEffect(() => {
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
  }, []);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
