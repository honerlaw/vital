/// <reference types="node" />
/**
 * successfulCompletions (030) — newest-first scan; a session is a successful completion when it has
 * a done set AND every done set meets the scheme's parsed rep target. Non-attempts (no per-set
 * data / no done set) are skipped; an unparseable scheme treats a logged attempt as success.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { successfulCompletions } from '@/data/engine';
import { type SessionLog } from '@/data/types';

type Tup = [boolean, number | null, number | null];

const session = (
  dateISO: string,
  scheme: string,
  name: string,
  sets: Tup[] | null,
): SessionLog => ({
  programId: 'p',
  programName: 'P',
  dayName: 'A',
  dateISO,
  ...(sets
    ? {
        exercises: [
          { name, scheme, sets: sets.map(([done, weight, reps]) => ({ done, weight, reps })) },
        ],
        unit: 'lb' as const,
      }
    : {}),
});

void test('counts only sessions where every done set meets the target reps', () => {
  const history = [
    session('2026-06-10', '3×5', 'Squat', [[true, 100, 5], [true, 100, 6]]), // success
    session('2026-06-08', '3×5', 'Squat', [[true, 100, 5], [true, 100, 3]]), // fail (one short)
    session('2026-06-06', '3×5', 'Squat', [[true, 100, 5]]), //                  success
  ];
  assert.equal(successfulCompletions(history, 'Squat').length, 2);
});

void test('skips non-attempts: legacy rows and sessions with no done set', () => {
  const history = [
    session('2026-06-10', '3×5', 'Squat', null), // legacy, no per-set data
    session('2026-06-08', '3×5', 'Squat', [[false, 100, 5]]), // logged but not done
    session('2026-06-06', '3×5', 'Squat', [[true, 100, 5]]), // success
  ];
  const out = successfulCompletions(history, 'Squat');
  assert.equal(out.length, 1);
  assert.equal(out[0].dateISO, '2026-06-06');
});

void test('an unparseable scheme treats a logged attempt as a success', () => {
  const history = [session('2026-06-10', '5/3/1', 'Squat', [[true, 200, 3]])];
  assert.equal(successfulCompletions(history, 'Squat').length, 1);
});

void test('matches the exercise name exactly', () => {
  const history = [session('2026-06-10', '3×5', 'Squat (T1)', [[true, 225, 5]])];
  assert.equal(successfulCompletions(history, 'Squat').length, 0);
  assert.equal(successfulCompletions(history, 'Squat (T1)').length, 1);
});
