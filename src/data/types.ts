/**
 * VITAL — domain model.
 *
 * Core idea: every program is an ordered list of day-templates that ROTATE.
 * "Next workout" is just a pointer (cursor) that advances by one each finish.
 */

export type ProgramTag = 'Strength' | 'Muscle Growth' | 'Full Body';

export interface Exercise {
  name: string;
  sets: number;
  scheme: string; // display string, e.g. "3×5", "5×3+", "3×8-12"
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

/** A completed session, written to history. */
export interface SessionLog {
  programId: string;
  programName: string;
  dayName: string;
  dateISO: string;
}

/** An in-progress workout. completed[exerciseIndex][setIndex] = logged?. */
export interface LiveSession {
  programId: string;
  dayIndex: number;
  completed: boolean[][];
}

/** Catalog hydration state: loading until the first fetch resolves, then ready or error. */
export type ProgramsStatus = 'loading' | 'ready' | 'error';

/** The persisted per-user state as served by `GET /api/me/state` (null id = no row yet). */
export interface UserStatePayload {
  activeProgramId: string | null;
  cursor: number;
  history: SessionLog[];
}

/** Top-level app state (drive this from Context/reducer or a store). */
export interface AppState {
  programs: Program[];       // the catalog, hydrated from GET /api/programs at startup
  programsStatus: ProgramsStatus;
  userStateStatus: ProgramsStatus; // per-user state hydration, same loading/ready/error shape
  activeProgramId: string;
  cursor: number;            // index into active program's days = NEXT workout
  history: SessionLog[];
  live: LiveSession | null;
}
