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

/**
 * An in-progress workout. completed[exerciseIndex][setIndex] = logged?.
 * `switchedFrom` (015): the previously-active program id when this session was started via
 * "Switch & begin" (the switch commits at the Begin tap); null for a plain start. CANCEL
 * restores it as the active program — the revert is lossless because a switch never mutates
 * the cursor map.
 */
export interface LiveSession {
  programId: string;
  dayIndex: number;
  completed: boolean[][];
  switchedFrom: string | null;
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
  programs: Program[];       // the catalog, hydrated from GET /api/programs at startup
  programsStatus: ProgramsStatus;
  userStateStatus: ProgramsStatus; // per-user state hydration, same loading/ready/error shape
  activeProgramId: string | null; // null = the user has never chosen a program (014)
  // Per-program rotation positions (015): cursors[id] = that program's NEXT workout day
  // index; a missing key reads as 0. Switching the active program never mutates this map.
  cursors: Record<string, number>;
  history: SessionLog[];
  live: LiveSession | null;
}
