/**
 * Maps a raw `user_programs` row (every column `unknown`) to the typed `Program` (030), mirroring
 * `programs-mapper` (snake_case `per_week` → `perWeek`). Each field is validated at runtime; a row
 * that doesn't match throws so the route fails rather than serving malformed data. `days` jsonb
 * arrives as a JS array from pg and is validated through `isWorkoutDayArray`, which transitively
 * validates each exercise's optional `progression`. No `pg` import, so it is unit-testable offline.
 */
import { isProgramTag, isWorkoutDayArray } from '@/data/guards';
import { type UnknownRow } from '@/server/db';
import { type Program } from '@/data/types';

export function rowToUserProgram(row: UnknownRow): Program {
  const id = row['id'];
  const name = row['name'];
  const tag = row['tag'];
  const cred = row['cred'];
  const perWeek = row['per_week'];
  const blurb = row['blurb'];
  const days = row['days'];

  if (typeof id !== 'string') throw new Error('user_programs.id is not a string');
  if (typeof name !== 'string') throw new Error('user_programs.name is not a string');
  if (!isProgramTag(tag)) throw new Error('user_programs.tag is not a valid ProgramTag');
  if (typeof cred !== 'string') throw new Error('user_programs.cred is not a string');
  if (typeof perWeek !== 'number') throw new Error('user_programs.per_week is not a number');
  if (typeof blurb !== 'string') throw new Error('user_programs.blurb is not a string');
  if (!isWorkoutDayArray(days)) throw new Error('user_programs.days is not a WorkoutDay[]');

  return { id, name, tag, cred, perWeek, blurb, days };
}
