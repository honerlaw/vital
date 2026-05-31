/** Reducer actions for the in-memory app store. */
export type Action =
  | { type: 'START_WORKOUT'; dayIndex: number }
  | { type: 'TOGGLE_SET'; ei: number; si: number }
  | { type: 'FINISH_WORKOUT' }
  | { type: 'CANCEL_WORKOUT' }
  | { type: 'SET_ACTIVE_PROGRAM'; id: string };
