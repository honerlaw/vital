/// <reference types="node" />
/**
 * sessionVolume (041): total training volume = Σ weight×reps over COMPLETED sets only. Skipped
 * sets and sets missing a weight or reps contribute nothing (mirrors the history display, which
 * dims non-done sets), and a session without per-set data yields 0 — callers gate the display on
 * `> 0`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sessionVolume } from '@/data/engine';
import { type SessionLog } from '@/data/types';

const CORE: SessionLog = {
  programId: 'bbr',
  programName: 'Basic Beginner Routine',
  dayName: 'Workout A',
  dateISO: '2026-06-05T12:00:00.000Z',
};

void test('sessionVolume is 0 when the log carries no per-set data', () => {
  assert.equal(sessionVolume(CORE), 0);
});

void test('sessionVolume sums weight×reps over done sets only', () => {
  const log: SessionLog = {
    ...CORE,
    unit: 'lb',
    exercises: [
      {
        name: 'Squat',
        scheme: '3×5',
        sets: [
          { done: true, weight: 100, reps: 5 }, // 500
          { done: true, weight: 100, reps: 5 }, // 500
          { done: false, weight: 100, reps: 5 }, // skipped → 0
        ],
      },
      {
        name: 'Bench Press',
        scheme: '3×5',
        sets: [
          { done: true, weight: 50, reps: 8 }, // 400
          { done: true, weight: null, reps: 8 }, // no weight → 0
          { done: true, weight: 50, reps: null }, // no reps → 0
        ],
      },
    ],
  };
  assert.equal(sessionVolume(log), 1400);
});

void test('sessionVolume is 0 for a bodyweight-only session (no weighted sets)', () => {
  const log: SessionLog = {
    ...CORE,
    unit: 'lb',
    exercises: [
      { name: 'Pull-up', scheme: '3×8', sets: [{ done: true, weight: null, reps: 8 }] },
    ],
  };
  assert.equal(sessionVolume(log), 0);
});
