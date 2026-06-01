/**
 * Runtime type guards for the program catalog. Values cross two trust boundaries typed `unknown`
 * — the `jsonb` `days` column read back from Postgres (server) and the parsed JSON body of
 * `GET /api/programs` (client) — and narrow through these predicates rather than asserting a
 * shape, keeping the code cast-free under the strict guardrails. Type-only domain imports, so the
 * guards run on both client and server with no runtime dependency.
 */
export { isProgramTag } from '@/data/guards/isProgramTag';
export { isExercise } from '@/data/guards/isExercise';
export { isWorkoutDay } from '@/data/guards/isWorkoutDay';
export { isWorkoutDayArray } from '@/data/guards/isWorkoutDayArray';
export { isProgram } from '@/data/guards/isProgram';
export { isProgramArray } from '@/data/guards/isProgramArray';
