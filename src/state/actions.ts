/** Reducer actions for the in-memory app store. */
import { Program, UserStatePayload } from '@/data/types';

export type Action =
  | { type: 'HYDRATE_PROGRAMS'; programs: Program[] }
  | { type: 'HYDRATE_PROGRAMS_ERROR' }
  | { type: 'HYDRATE_USER_STATE'; payload: UserStatePayload }
  | { type: 'HYDRATE_USER_STATE_ERROR' }
  | { type: 'RESET_USER_STATE' }
  | { type: 'RETRY_HYDRATE' }
  | { type: 'START_WORKOUT'; dayIndex: number }
  | { type: 'TOGGLE_SET'; ei: number; si: number }
  | { type: 'FINISH_WORKOUT'; nowISO: string }
  | { type: 'CANCEL_WORKOUT' }
  | { type: 'SET_ACTIVE_PROGRAM'; id: string }
  | { type: 'SWITCH_AND_START_WORKOUT'; id: string };
