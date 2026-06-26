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
  const live = state.live;
  const program = getProgram(state.programs, live.programId);
  const day = program.days[live.dayIndex];
  // Elapsed wall-clock (041): finish − start, floored at 0 (a clock that went backwards must not
  // log a negative). Both timestamps come from `Date.toISOString()` at their dispatch sites;
  // Date.parse is the inverse. Defensive `Number.isFinite` guards keep a malformed anchor from
  // emitting NaN into history (the server validator would 400 it).
  const startedMs = Date.parse(live.startedAtISO);
  const finishedMs = Date.parse(nowISO);
  const durationSec =
    Number.isFinite(startedMs) && Number.isFinite(finishedMs)
      ? Math.max(0, Math.round((finishedMs - startedMs) / 1000))
      : 0;
  const log: SessionLog = {
    programId: program.id,
    programName: program.name,
    dayName: day.name,
    dateISO: nowISO,
    durationSec,
    // Per-set log (022): zip the day's exercises with `live.sets` BY INDEX — aligned because
    // startSession seeds `sets` from this same exercises array and no action resizes it.
    // ALL set rows are persisted, incl. untouched ones (planned-vs-actual stays visible;
    // consumers filter on `done`). Values are already normalized — coercion lives in
    // `updateSet`, so this is pure projection and the determinism contract holds untouched.
    exercises: day.exercises.map((ex, ei) => ({
      name: ex.name,
      scheme: ex.scheme,
      sets: live.sets[ei] ?? [],
    })),
    // v1 has no unit picker — every new log is pounds, denormalized per session so a future
    // kg toggle needs no history backfill.
    unit: 'lb',
  };
  // Per-program pointers (015): finishing a session advances the FINISHED program's own
  // cursor unconditionally — `nextCursor` is the new value for `cursors[live.programId]`.
  // (The old active-vs-live gate is gone; with a per-program map there is no other pointer
  // a finish could legitimately advance.)
  const nextCursor = advanceCursor(program, state.cursors[live.programId] ?? 0);
  return { log, nextCursor };
};
