/** Reducer actions for the in-memory app store. */
import { SetPatch } from '@/data/engine/updateSet';
import { Program, UserStatePayload } from '@/data/types';

export type Action =
  | { type: 'HYDRATE_PROGRAMS'; programs: Program[] }
  | { type: 'HYDRATE_PROGRAMS_ERROR' }
  | { type: 'HYDRATE_USER_STATE'; payload: UserStatePayload }
  | { type: 'HYDRATE_USER_STATE_ERROR' }
  | { type: 'RESET_USER_STATE' }
  | { type: 'RETRY_HYDRATE' }
  | { type: 'START_WORKOUT'; dayIndex: number }
  | { type: 'UPDATE_SET'; ei: number; si: number; patch: SetPatch }
  | { type: 'FINISH_WORKOUT'; nowISO: string }
  | { type: 'CANCEL_WORKOUT' }
  | { type: 'SET_ACTIVE_PROGRAM'; id: string }
  | { type: 'SWITCH_AND_START_WORKOUT'; id: string };
