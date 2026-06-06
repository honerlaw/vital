/**
 * Maps a raw `user_state` table row (every column `unknown`) to the typed settings pair. A row
 * that does not match the expected shape throws, so the route fails the whole request rather
 * than serving malformed state. pg returns the `cursors` jsonb column as a parsed JS value —
 * validated through the shared `isCursorMap` guard (015), never cast. No `pg` import —
 * unit-testable offline (mirrors programs-mapper).
 */
import { isCursorMap } from '@/data/guards';
import { type UnknownRow } from '@/server/db';

export function rowToUserStateMeta(row: UnknownRow): {
  activeProgramId: string;
  cursors: Record<string, number>;
} {
  const activeProgramId = row['active_program_id'];
  const cursors = row['cursors'];

  if (typeof activeProgramId !== 'string') {
    throw new Error('user_state.active_program_id is not a string');
  }
  if (!isCursorMap(cursors)) throw new Error('user_state.cursors is not a cursor map');

  return { activeProgramId, cursors };
}
