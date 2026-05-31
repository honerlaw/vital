import { createContext, Dispatch } from 'react';
import { DEFAULT_STATE } from '@/data/programs';
import { AppState } from '@/data/types';
import { Action } from '@/state/actions';

export interface Store {
  state: AppState;
  dispatch: Dispatch<Action>;
}

export const AppContext = createContext<Store>({
  state: DEFAULT_STATE,
  dispatch: () => undefined,
});
