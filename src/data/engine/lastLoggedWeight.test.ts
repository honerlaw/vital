/// <reference types="node" />
/**
 * lastLoggedWeight (024) — newest-first scan, exact-name match, done && weight !== null
 * qualification, LAST qualifying set wins, continue past sessions without qualifying data.
 * History fixtures are newest-first, matching the GET /api/me/state ordering the helper
 * documents (finished_at DESC). Sets are [done, weight] tuples (reps fixed — irrelevant here).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lastLoggedWeight } from '@/data/engine';
import { type SessionLog } from '@/data/types';

const session = (
  dateISO: string,
  exercises?: { name: string; sets: [boolean, number | null][] }[],
): SessionLog => ({
  programId: 'p',
  programName: 'P',
  dayName: 'A',
  dateISO,
  ...(exercises
    ? {
        exercises: exercises.map((e) => ({
          name: e.name,
          scheme: '3×5',
          sets: e.sets.map(([done, weight]) => ({ done, weight, reps: 5 })),
        })),
        unit: 'lb' as const,
      }
    : {}),
});

void test('lastLoggedWeight finds the newest session and returns its LAST qualifying set', () => {
  const history = [
    session('2026-06-06', [{ name: 'Squat', sets: [[true, 135], [true, 145], [true, 140]] }]),
    session('2026-06-01', [{ name: 'Squat', sets: [[true, 125]] }]),
  ];
  // Newest session wins; within it, the LAST qualifying set (140), not the max (145).
  assert.equal(lastLoggedWeight(history, 'Squat'), 140);
});

void test('lastLoggedWeight requires done && weight — typed-but-not-done does not qualify', () => {
  const history = [
    session('2026-06-06', [{ name: 'Squat', sets: [[false, 155], [true, null]] }]),
    session('2026-06-01', [{ name: 'Squat', sets: [[true, 135]] }]),
  ];
  // Newer session has the exercise but no qualifying set → scan continues to the older one.
  assert.equal(lastLoggedWeight(history, 'Squat'), 135);
});

void test('lastLoggedWeight matches names exactly — suffixed variants do not share history', () => {
  const history = [session('2026-06-06', [{ name: 'Squat (T1)', sets: [[true, 225]] }])];
  assert.equal(lastLoggedWeight(history, 'Squat'), null);
  assert.equal(lastLoggedWeight(history, 'Squat (T1)'), 225);
});

void test('lastLoggedWeight skips legacy sessions without per-set data', () => {
  const history = [
    session('2026-06-06'), // pre-022 row — no exercises field
    session('2026-06-01', [{ name: 'Bench Press', sets: [[true, 95]] }]),
  ];
  assert.equal(lastLoggedWeight(history, 'Bench Press'), 95);
});

void test('lastLoggedWeight returns null on empty history and never-weighted exercises', () => {
  assert.equal(lastLoggedWeight([], 'Squat'), null);
  // Bodyweight-style: done sets logged with null weight → no fallback, placeholder stays 'lb'.
  const bw = [session('2026-06-06', [{ name: 'Pull-Up', sets: [[true, null], [true, null]] }])];
  assert.equal(lastLoggedWeight(bw, 'Pull-Up'), null);
});

void test('lastLoggedWeight treats a logged 0 as a real weight, not an absent one', () => {
  const history = [session('2026-06-06', [{ name: 'Sled Push', sets: [[true, 0]] }])];
  assert.equal(lastLoggedWeight(history, 'Sled Push'), 0);
});
