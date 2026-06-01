import { advanceCursor } from '@/data/engine/advanceCursor';
import { getProgram } from '@/data/engine/getProgram';
import { AppState, SessionLog } from '@/data/types';

/**
 * Finish a session. Returns the history entry to prepend and the new cursor.
 * Apply both to AppState in your reducer/store, then clear `live`.
 */
export const finishSession = (
  state: AppState,
): { log: SessionLog; nextCursor: number } => {
  if (!state.live) throw new Error('No live session');
  const program = getProgram(state.programs, state.live.programId);
  const day = program.days[state.live.dayIndex];
  const log: SessionLog = {
    programId: program.id,
    programName: program.name,
    dayName: day.name,
    dateISO: new Date().toISOString(),
  };
  // Only advance the active program's pointer (you can train a non-active program ad hoc).
  const nextCursor =
    program.id === state.activeProgramId
      ? advanceCursor(getProgram(state.programs, state.activeProgramId), state.cursor)
      : state.cursor;
  return { log, nextCursor };
};
