/**
 * Runtime type guards for the program catalog and the per-user state. Values cross two trust
 * boundaries typed `unknown` — columns read back from Postgres (server) and the parsed JSON
 * bodies of `GET /api/programs` / `GET /api/me/state` (client) — and narrow through these
 * predicates rather than asserting a shape, keeping the code cast-free under the strict
 * guardrails. Type-only domain imports, so the guards run on both client and server with no
 * runtime dependency.
 */
export { isProgramTag } from '@/data/guards/isProgramTag';
export { isProgressionRule } from '@/data/guards/isProgressionRule';
export { isDeloadModifier } from '@/data/guards/isDeloadModifier';
export { isExerciseProgression } from '@/data/guards/isExerciseProgression';
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
export { isQuestionOption } from '@/data/guards/isQuestionOption';
export { isShowCondition } from '@/data/guards/isShowCondition';
export { isQuestion } from '@/data/guards/isQuestion';
export { isQuestionGraph } from '@/data/guards/isQuestionGraph';
export { isIntakeAnswer } from '@/data/guards/isIntakeAnswer';
export { isIntakeSpec } from '@/data/guards/isIntakeSpec';
export { isRoutineKnob } from '@/data/guards/isRoutineKnob';
export { isMacroNumber } from '@/data/guards/isMacroNumber';
export { isLocalDay } from '@/data/guards/isLocalDay';
export { isFoodSource } from '@/data/guards/isFoodSource';
export { isNewFoodLogEntry } from '@/data/guards/isNewFoodLogEntry';
export { isFoodLogEntry } from '@/data/guards/isFoodLogEntry';
export { isFoodLogEntryArray } from '@/data/guards/isFoodLogEntryArray';
export { isFoodServingOption } from '@/data/guards/isFoodServingOption';
export { isFoodSearchResult } from '@/data/guards/isFoodSearchResult';
export { isFoodSearchResultArray } from '@/data/guards/isFoodSearchResultArray';
export { isCanonicalEquipmentId } from '@/data/guards/isCanonicalEquipmentId';
export { isEquipmentProfile } from '@/data/guards/isEquipmentProfile';
export { isEquipmentUpdate } from '@/data/guards/isEquipmentUpdate';
export { isEquipmentScanRequest } from '@/data/guards/isEquipmentScanRequest';
