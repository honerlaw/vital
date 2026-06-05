/** Reducer actions for the in-memory app store. */
import { Program } from '@/data/types';

export type Action =
  | { type: 'HYDRATE_PROGRAMS'; programs: Program[] }
  | { type: 'HYDRATE_PROGRAMS_ERROR' }
  | { type: 'RETRY_HYDRATE' }
  | { type: 'START_WORKOUT'; dayIndex: number }
  | { type: 'TOGGLE_SET'; ei: number; si: number }
  | { type: 'FINISH_WORKOUT' }
  | { type: 'CANCEL_WORKOUT' }
  | { type: 'SET_ACTIVE_PROGRAM'; id: string };
