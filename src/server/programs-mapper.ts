/**
 * Maps a raw `programs` table row (every column `unknown`) to the typed `Program` domain object,
 * bridging the snake_case columns (`per_week`) to the camelCase model (`perWeek`). Each field is
 * validated at runtime; a row that does not match the expected shape throws, so the route fails
 * the whole request rather than serving a partial or malformed list. No `pg` import here, so the
 * mapping is unit-testable offline.
 */
import { isProgramTag, isWorkoutDayArray } from '@/data/guards';
import { type UnknownRow } from '@/server/db';
import { type Program } from '@/data/types';

export function rowToProgram(row: UnknownRow): Program {
  const id = row['id'];
  const name = row['name'];
  const tag = row['tag'];
  const cred = row['cred'];
  const perWeek = row['per_week'];
  const blurb = row['blurb'];
  const days = row['days'];

  if (typeof id !== 'string') throw new Error('programs.id is not a string');
  if (typeof name !== 'string') throw new Error('programs.name is not a string');
  if (!isProgramTag(tag)) throw new Error('programs.tag is not a valid ProgramTag');
  if (typeof cred !== 'string') throw new Error('programs.cred is not a string');
  if (typeof perWeek !== 'number') throw new Error('programs.per_week is not a number');
  if (typeof blurb !== 'string') throw new Error('programs.blurb is not a string');
  if (!isWorkoutDayArray(days)) throw new Error('programs.days is not a WorkoutDay[]');

  return { id, name, tag, cred, perWeek, blurb, days };
}
