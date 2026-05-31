import { useContext } from 'react';
import { AppContext, Store } from '@/state/app-context';

export const useAppStore = (): Store => useContext(AppContext);
