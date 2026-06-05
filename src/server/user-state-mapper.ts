/**
 * Maps a raw `user_state` table row (every column `unknown`) to the typed settings pair. A row
 * that does not match the expected shape throws, so the route fails the whole request rather
 * than serving malformed state. No `pg` import — unit-testable offline (mirrors programs-mapper).
 */
import { type UnknownRow } from '@/server/db';

export function rowToUserStateMeta(row: UnknownRow): { activeProgramId: string; cursor: number } {
  const activeProgramId = row['active_program_id'];
  const cursor = row['cursor'];

  if (typeof activeProgramId !== 'string') {
    throw new Error('user_state.active_program_id is not a string');
  }
  if (typeof cursor !== 'number') throw new Error('user_state.cursor is not a number');

  return { activeProgramId, cursor };
}
