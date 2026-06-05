import { advanceCursor } from '@/data/engine/advanceCursor';
import { getProgram } from '@/data/engine/getProgram';
import { AppState, SessionLog } from '@/data/types';

/**
 * Finish a session. Returns the history entry to prepend and the new cursor.
 * Apply both to AppState in your reducer/store, then clear `live`.
 *
 * `nowISO` is injected (stamped once at the dispatch site) so the function is fully
 * deterministic — the reducer and the persistence write-through call it with identical args and
 * provably get identical results (012).
 */
export const finishSession = (
  state: AppState,
  nowISO: string,
): { log: SessionLog; nextCursor: number } => {
  if (!state.live) throw new Error('No live session');
  const program = getProgram(state.programs, state.live.programId);
  const day = program.days[state.live.dayIndex];
  const log: SessionLog = {
    programId: program.id,
    programName: program.name,
    dayName: day.name,
    dateISO: nowISO,
  };
  // Only advance the active program's pointer (you can train a non-active program ad hoc).
  const nextCursor =
    program.id === state.activeProgramId
      ? advanceCursor(getProgram(state.programs, state.activeProgramId), state.cursor)
      : state.cursor;
  return { log, nextCursor };
};
