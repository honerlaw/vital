/** Reducer actions for the in-memory app store. */
import { SetPatch } from '@/data/engine/updateSet';
import { Program, UserStatePayload } from '@/data/types';

export type Action =
  | { type: 'HYDRATE_PROGRAMS'; programs: Program[] }
  | { type: 'HYDRATE_PROGRAMS_ERROR' }
  | { type: 'HYDRATE_USER_STATE'; payload: UserStatePayload }
  | { type: 'HYDRATE_USER_STATE_ERROR' }
  // Generated programs hydration (030): the user's saved AI routines, merged into `programs`.
  | { type: 'HYDRATE_USER_PROGRAMS'; programs: Program[] }
  | { type: 'HYDRATE_USER_PROGRAMS_ERROR' }
  // Add a just-saved generated program (030); remove a deleted one.
  | { type: 'ADD_USER_PROGRAM'; program: Program }
  | { type: 'REMOVE_USER_PROGRAM'; id: string }
  | { type: 'RESET_USER_STATE' }
  | { type: 'RETRY_HYDRATE' }
  | { type: 'START_WORKOUT'; dayIndex: number }
  | { type: 'UPDATE_SET'; ei: number; si: number; patch: SetPatch }
  | { type: 'FINISH_WORKOUT'; nowISO: string }
  | { type: 'CANCEL_WORKOUT' }
  | { type: 'SET_ACTIVE_PROGRAM'; id: string }
  | { type: 'SWITCH_AND_START_WORKOUT'; id: string };
