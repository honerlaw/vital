/**
 * VITAL — domain model.
 *
 * Core idea: every program is an ordered list of day-templates that ROTATE.
 * "Next workout" is just a pointer (cursor) that advances by one each finish.
 */

export type ProgramTag = 'Strength' | 'Muscle Growth' | 'Full Body';

/**
 * Closed progression vocabulary (030). The LLM generator may only SELECT and parameterize from
 * this fixed discriminated union — it never emits executable logic — so the engine that APPLIES
 * progression is a finite, unit-testable set (`@/data/engine/progressionTarget`). A guard
 * (`isProgressionRule`) rejects any unknown `kind` via an exhaustive never-branch. Weights are
 * lb (the app is lb-only, 028). Each rule is a pure function of `(rule, that exercise's history)`.
 */
export type ProgressionRule =
  | { kind: 'linear'; increment: number; frequency: 'per-session' | 'per-week' }
  | { kind: 'double-progression'; repLow: number; repHigh: number; increment: number }
  | {
      kind: 'amrap-driven';
      baseIncrement: number;
      bonusThresholdReps: number;
      bonusIncrement: number;
    };

/**
 * Optional deload, composable onto any rule (030): after `triggerConsecutiveFails` consecutive
 * failed sessions for an exercise, drop the computed target by `dropPct` percent.
 */
export interface DeloadModifier {
  triggerConsecutiveFails: number;
  dropPct: number;
}

/**
 * Per-exercise progression metadata carried ONLY by generated programs (030). `startWeight` is
 * the session-1 anchor (LLM-prescribed from intake); it is consulted only when the exercise has
 * NO logged history yet, and never overrides a typed value or logged performance — nothing
 * clamps (028/030 invariant). Curated catalog programs omit this field entirely.
 */
export interface ExerciseProgression {
  startWeight: number | null;
  rule: ProgressionRule;
  deload?: DeloadModifier;
}

export interface Exercise {
  name: string;
  sets: number;
  scheme: string; // display string, e.g. "3×5", "5×3+", "3×8-12"
  // Generated programs only (030); absent on catalog exercises (keeps them untouched). When
  // present, the engine computes a history-derived progression target as the prefill placeholder.
  progression?: ExerciseProgression;
}

export interface WorkoutDay {
  name: string;       // e.g. "Workout A", "Pull", "A1"
  exercises: Exercise[];
}

export interface Program {
  id: string;
  name: string;
  tag: ProgramTag;
  cred: string;       // attribution, e.g. "r/Fitness wiki"
  perWeek: number;    // training days per week (used for cadence labels)
  blurb: string;
  days: WorkoutDay[]; // the rotation
}

/**
 * One set's record (022): `done` is the check-off; `weight`/`reps` are the user-entered
 * actuals (null = not entered — entry is never forced). All numeric coercion (finite,
 * non-negative, null-for-invalid) happens in the pure `updateSet` engine function, never in
 * the UI or the persistence wrapper, so the reducer/write-through mirror stays deterministic.
 */
export interface SetEntry {
  done: boolean;
  weight: number | null;
  reps: number | null;
}

/** Per-exercise slice of a finished session's set log (022). `name`/`scheme` are denormalized
 * from the program at finish time so history stays self-contained when programs change. */
export interface SessionExerciseLog {
  name: string;
  scheme: string;
  sets: SetEntry[];
}

/**
 * A completed session, written to history. `exercises`/`unit` (022) are OPTIONAL at every
 * trust boundary: legacy sessions lack them, and a malformed `set_log` degrades to a log
 * without them (never an error) on BOTH the server mapper and the client sanitizer.
 * `unit` is denormalized per session ('lb' only in v1 — no unit picker) so a future kg
 * toggle needs no history backfill.
 */
export interface SessionLog {
  programId: string;
  programName: string;
  dayName: string;
  dateISO: string;
  // Total elapsed wall-clock seconds from session start to finish (041). OPTIONAL at every trust
  // boundary: sessions logged before 041 have no `duration_sec` value (null → omitted), exactly
  // like the 022 `exercises`/`unit` fields. `finishSession` computes it from `live.startedAtISO`;
  // a missing value renders as "no duration", never an error.
  durationSec?: number;
  exercises?: SessionExerciseLog[];
  unit?: 'lb';
}

/**
 * An in-progress workout. sets[exerciseIndex][setIndex] = that set's record (022 — replaced
 * the boolean check-off matrix; in-memory only, never wired/persisted). `startSession` seeds
 * `sets` from the day's exercises and no action resizes it, so `finishSession` can zip it
 * against `program.days[dayIndex].exercises` by index.
 * `switchedFrom` (015): the previously-active program id when this session was started via
 * "Switch & begin" (the switch commits at the Begin tap); null for a plain start. CANCEL
 * restores it as the active program — the revert is lossless because a switch never mutates
 * the cursor map.
 */
export interface LiveSession {
  programId: string;
  dayIndex: number;
  sets: SetEntry[][];
  switchedFrom: string | null;
  // ISO timestamp stamped at the Begin tap (041), the anchor for the in-session elapsed timer and
  // the finish-time duration. Injected at the dispatch site (like `FINISH_WORKOUT`'s `nowISO`) so
  // `startSession` stays pure and the reducer/write-through compute identical durations.
  startedAtISO: string;
}

/** Catalog hydration state: loading until the first fetch resolves, then ready or error. */
export type ProgramsStatus = 'loading' | 'ready' | 'error';

/**
 * The persisted per-user state as served by `GET /api/me/state` (null id = no row yet).
 * `cursors` (015): per-program rotation positions keyed by program id; a missing key reads
 * as 0. (The route also serves a legacy scalar `cursor` for pre-015 builds — one release —
 * which this guard/type deliberately ignores.)
 */
export interface UserStatePayload {
  activeProgramId: string | null;
  cursors: Record<string, number>;
  history: SessionLog[];
}

/** Top-level app state (drive this from Context/reducer or a store). */
export interface AppState {
  // The catalog (GET /api/programs) MERGED with this user's generated programs (030,
  // GET /api/me/programs). A single array so the engine, cursors, and history machinery treat
  // both kinds uniformly; `userProgramIds` records which entries are user-owned (deletable, and
  // the partition each hydration must preserve).
  programs: Program[];
  programsStatus: ProgramsStatus;
  userStateStatus: ProgramsStatus; // per-user state hydration, same loading/ready/error shape
  // Per-user generated programs hydration (030), same loading/ready/error shape. Boot readiness
  // waits on this too so a saved generated program that is the active program resolves before any
  // stale-active re-point fires.
  userProgramsStatus: ProgramsStatus;
  userProgramIds: string[]; // ids in `programs` that are user-generated (030)
  activeProgramId: string | null; // null = the user has never chosen a program (014)
  // Per-program rotation positions (015): cursors[id] = that program's NEXT workout day
  // index; a missing key reads as 0. Switching the active program never mutates this map.
  cursors: Record<string, number>;
  history: SessionLog[];
  live: LiveSession | null;
}
