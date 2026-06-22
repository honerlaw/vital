/// <reference types="node" />
/**
 * progressionTarget (030) — history-derived working-weight target for the closed progression
 * vocabulary, plus the optional deload modifier and the null-anchor / empty-history fallbacks.
 * History fixtures are newest-first (the GET /api/me/state ordering). Sets are [done, weight, reps]
 * tuples; the scheme drives the per-set rep target via parseSchemeReps.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { progressionTarget } from '@/data/engine';
import { type ExerciseProgression, type SessionLog } from '@/data/types';

type Tup = [boolean, number | null, number | null];

const session = (dateISO: string, scheme: string, name: string, sets: Tup[]): SessionLog => ({
  programId: 'p',
  programName: 'P',
  dayName: 'A',
  dateISO,
  exercises: [{ name, scheme, sets: sets.map(([done, weight, reps]) => ({ done, weight, reps })) }],
  unit: 'lb',
});

void test('linear per-session adds increment for each successful completion', () => {
  const prog: ExerciseProgression = {
    startWeight: 100,
    rule: { kind: 'linear', increment: 5, frequency: 'per-session' },
  };
  const history = [
    session('2026-06-10', '3×5', 'Squat', [[true, 110, 5]]),
    session('2026-06-08', '3×5', 'Squat', [[true, 105, 5]]),
    session('2026-06-06', '3×5', 'Squat', [[true, 100, 5]]),
  ];
  assert.equal(progressionTarget(prog, history, 'Squat'), 115);
});

void test('linear per-week counts distinct ISO weeks, not raw sessions', () => {
  const prog: ExerciseProgression = {
    startWeight: 100,
    rule: { kind: 'linear', increment: 5, frequency: 'per-week' },
  };
  // Two successes on the same day (same week) + one nine days earlier (a different week) → 2 weeks.
  const history = [
    session('2026-06-10', '3×5', 'Squat', [[true, 110, 5]]),
    session('2026-06-10', '3×5', 'Squat', [[true, 108, 5]]),
    session('2026-06-01', '3×5', 'Squat', [[true, 100, 5]]),
  ];
  assert.equal(progressionTarget(prog, history, 'Squat'), 110);
});

void test('double-progression advances weight only when every set reaches repHigh', () => {
  const prog: ExerciseProgression = {
    startWeight: 100,
    rule: { kind: 'double-progression', repLow: 8, repHigh: 12, increment: 5 },
  };
  const history = [
    session('2026-06-10', '3×8-12', 'Curl', [[true, 100, 12]]), // advance
    session('2026-06-08', '3×8-12', 'Curl', [[true, 100, 10]]), // success, no advance
    session('2026-06-06', '3×8-12', 'Curl', [[true, 100, 12]]), // advance
    session('2026-06-04', '3×8-12', 'Curl', [[true, 100, 6]]), //  failure (< floor)
  ];
  assert.equal(progressionTarget(prog, history, 'Curl'), 110);
});

void test('amrap-driven adds base per success plus a bonus over the threshold', () => {
  const prog: ExerciseProgression = {
    startWeight: 100,
    rule: { kind: 'amrap-driven', baseIncrement: 5, bonusThresholdReps: 8, bonusIncrement: 5 },
  };
  const history = [
    session('2026-06-10', '5×5+', 'Bench', [[true, 100, 10]]),
    session('2026-06-08', '5×5+', 'Bench', [[true, 100, 5]]),
    session('2026-06-06', '5×5+', 'Bench', [[true, 100, 9]]),
  ];
  // base 100 + 5*3 = 115; bonus 5*2 (two AMRAP sets >= 8) = 10 → 125.
  assert.equal(progressionTarget(prog, history, 'Bench'), 125);
});

void test('deload drops the target after the trigger of consecutive failures', () => {
  const prog: ExerciseProgression = {
    startWeight: 100,
    rule: { kind: 'linear', increment: 5, frequency: 'per-session' },
    deload: { triggerConsecutiveFails: 2, dropPct: 10 },
  };
  const history = [
    session('2026-06-10', '3×5', 'OHP', [[true, 110, 3]]), // fail (newest)
    session('2026-06-08', '3×5', 'OHP', [[true, 110, 3]]), // fail
    session('2026-06-06', '3×5', 'OHP', [[true, 105, 5]]), // success
    session('2026-06-04', '3×5', 'OHP', [[true, 100, 5]]), // success
  ];
  // 2 successes → base 110; 2 leading fails ≥ trigger → 110 * 0.9 = 99.
  assert.equal(progressionTarget(prog, history, 'OHP'), 99);
});

void test('a null startWeight yields null (blank placeholder, no anchor)', () => {
  const prog: ExerciseProgression = {
    startWeight: null,
    rule: { kind: 'linear', increment: 5, frequency: 'per-session' },
  };
  assert.equal(progressionTarget(prog, [], 'Squat'), null);
});

void test('empty history returns the bare startWeight (session-1 anchor)', () => {
  const prog: ExerciseProgression = {
    startWeight: 135,
    rule: { kind: 'linear', increment: 5, frequency: 'per-session' },
  };
  assert.equal(progressionTarget(prog, [], 'Deadlift'), 135);
});
