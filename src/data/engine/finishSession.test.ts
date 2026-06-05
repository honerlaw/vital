/// <reference types="node" />
/**
 * Evidences 012's determinism contract: `finishSession(state, nowISO)` is pure, so the reducer
 * and the persistence write-through — which call it with identical args — provably produce
 * identical results (proposal SC#1).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { finishSession } from '@/data/engine';
import { type AppState } from '@/data/types';
import { DEFAULT_STATE } from '@/state/default-state';
import { SAMPLE_PROGRAMS } from '@/test-support/programs';

const NOW = '2026-06-05T12:00:00.000Z';

const liveState: AppState = {
  ...DEFAULT_STATE,
  programs: SAMPLE_PROGRAMS,
  programsStatus: 'ready',
  activeProgramId: SAMPLE_PROGRAMS[0].id,
  cursor: 4,
  live: { programId: SAMPLE_PROGRAMS[0].id, dayIndex: 0, completed: [[true]] },
};

void test('finishSession is deterministic: same args twice → deep-equal results', () => {
  assert.deepEqual(finishSession(liveState, NOW), finishSession(liveState, NOW));
});

void test('finishSession stamps the injected nowISO and advances the active cursor', () => {
  const { log, nextCursor } = finishSession(liveState, NOW);
  assert.equal(log.dateISO, NOW);
  assert.equal(log.programId, SAMPLE_PROGRAMS[0].id);
  // advanceCursor wraps around the rotation: (4 + 1) % days.length.
  assert.equal(nextCursor, (liveState.cursor + 1) % SAMPLE_PROGRAMS[0].days.length);
});

void test('finishSession leaves the cursor unchanged for an ad-hoc (non-active) program', () => {
  const adHoc: AppState = {
    ...liveState,
    live: { programId: SAMPLE_PROGRAMS[1].id, dayIndex: 0, completed: [[true]] },
  };
  const { nextCursor } = finishSession(adHoc, NOW);
  assert.equal(nextCursor, liveState.cursor);
});
