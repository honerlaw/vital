/**
 * Runtime type guards for the program catalog and the per-user state. Values cross two trust
 * boundaries typed `unknown` — columns read back from Postgres (server) and the parsed JSON
 * bodies of `GET /api/programs` / `GET /api/me/state` (client) — and narrow through these
 * predicates rather than asserting a shape, keeping the code cast-free under the strict
 * guardrails. Type-only domain imports, so the guards run on both client and server with no
 * runtime dependency.
 */
export { isProgramTag } from '@/data/guards/isProgramTag';
export { isExercise } from '@/data/guards/isExercise';
export { isWorkoutDay } from '@/data/guards/isWorkoutDay';
export { isWorkoutDayArray } from '@/data/guards/isWorkoutDayArray';
export { isProgram } from '@/data/guards/isProgram';
export { isProgramArray } from '@/data/guards/isProgramArray';
export { isSetEntry } from '@/data/guards/isSetEntry';
export { isSessionExerciseLog } from '@/data/guards/isSessionExerciseLog';
export { isSessionExerciseLogArray } from '@/data/guards/isSessionExerciseLogArray';
export { isSessionLog } from '@/data/guards/isSessionLog';
export { isSessionLogArray } from '@/data/guards/isSessionLogArray';
export { isCursorMap } from '@/data/guards/isCursorMap';
export { isUserStatePayload } from '@/data/guards/isUserStatePayload';
