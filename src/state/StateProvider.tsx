import { ReactNode, useMemo, useReducer } from 'react';
import { DEFAULT_STATE } from '@/data/programs';
import { AppContext } from '@/state/app-context';
import { reducer } from '@/state/reducer';

export default function StateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
