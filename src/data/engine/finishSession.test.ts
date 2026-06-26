/// <reference types="node" />
/**
 * Evidences 012's determinism contract: `finishSession(state, nowISO)` is pure, so the reducer
 * and the persistence write-through — which call it with identical args — provably produce
 * identical results (proposal SC#1). Rewritten in 022 for the per-set shape (`live.sets`
 * replaced the boolean matrix); the deepEqual-on-identical-args property is unchanged.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { finishSession } from '@/data/engine';
import { type AppState, type SetEntry } from '@/data/types';
import { DEFAULT_STATE } from '@/state/default-state';
import { SAMPLE_PROGRAMS } from '@/test-support/programs';

const NOW = '2026-06-05T12:00:00.000Z';
// Session start (041): 24m30s before NOW → durationSec 1470. Determinism holds because both
// timestamps are injected, not read from the wall clock.
const START = '2026-06-05T11:35:30.000Z';

const doneSet = (weight: number | null, reps: number | null): SetEntry => ({
  done: true,
  weight,
  reps,
});
const plannedSet: SetEntry = { done: false, weight: null, reps: null };

// Matches SAMPLE_PROGRAMS[0] Workout A: Squat 3×5, Bench Press 3×5 (the seed invariant —
// startSession shapes `sets` from the same exercises array finishSession zips against).
const liveState: AppState = {
  ...DEFAULT_STATE,
  programs: SAMPLE_PROGRAMS,
  programsStatus: 'ready',
  activeProgramId: SAMPLE_PROGRAMS[0].id,
  cursors: { [SAMPLE_PROGRAMS[0].id]: 4 },
  live: {
    programId: SAMPLE_PROGRAMS[0].id,
    dayIndex: 0,
    sets: [
      [doneSet(135, 5), doneSet(135, 5), doneSet(135, 15)],
      [doneSet(95, 5), plannedSet, plannedSet],
    ],
    switchedFrom: null,
    startedAtISO: START,
  },
};

void test('finishSession is deterministic: same args twice → deep-equal results', () => {
  assert.deepEqual(finishSession(liveState, NOW), finishSession(liveState, NOW));
});

void test('finishSession stamps the injected nowISO and advances the live program cursor', () => {
  const { log, nextCursor } = finishSession(liveState, NOW);
  assert.equal(log.dateISO, NOW);
  assert.equal(log.programId, SAMPLE_PROGRAMS[0].id);
  // advanceCursor wraps around the rotation: (4 + 1) % days.length.
  assert.equal(nextCursor, (4 + 1) % SAMPLE_PROGRAMS[0].days.length);
});

void test('finishSession computes durationSec from startedAtISO → nowISO (041)', () => {
  const { log } = finishSession(liveState, NOW);
  assert.equal(log.durationSec, 1470); // 24m30s between START and NOW
  // Floored at zero: a finish stamped BEFORE start (clock skew) never logs a negative.
  const backwards = finishSession(liveState, '2026-06-05T11:00:00.000Z');
  assert.equal(backwards.log.durationSec, 0);
});

void test('finishSession projects the per-set log: zipped by index, unit lb (022)', () => {
  const { log } = finishSession(liveState, NOW);
  assert.equal(log.unit, 'lb');
  assert.deepEqual(log.exercises, [
    {
      name: 'Squat',
      scheme: '3×5',
      sets: [doneSet(135, 5), doneSet(135, 5), doneSet(135, 15)],
    },
    {
      // ALL set rows persist, incl. untouched planned ones — the planned-vs-actual signal.
      name: 'Bench Press',
      scheme: '3×5',
      sets: [doneSet(95, 5), plannedSet, plannedSet],
    },
  ]);
});

void test('finishSession advances the FINISHED program own pointer only (015)', () => {
  // The new contract's load-bearing case: a non-active live session advances its own
  // per-program cursor (from a missing key = 0 here), independent of the active program.
  const adHoc: AppState = {
    ...liveState,
    live: {
      programId: SAMPLE_PROGRAMS[1].id,
      dayIndex: 0,
      sets: [[doneSet(225, 3)]],
      switchedFrom: null,
      startedAtISO: START,
    },
  };
  const { nextCursor } = finishSession(adHoc, NOW);
  assert.equal(nextCursor, 1 % SAMPLE_PROGRAMS[1].days.length);
  // The active program's stored position is untouched by computing another program's next.
  assert.equal(adHoc.cursors[SAMPLE_PROGRAMS[0].id], 4);
});
