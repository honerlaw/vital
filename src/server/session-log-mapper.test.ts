/// <reference types="node" />
/**
 * The mapper's split contract (022): core columns throw (server-fault corruption → the route
 * 500s, unchanged), but `set_log` is BEST-EFFORT — malformed client-supplied set data degrades
 * to a log without `exercises`/`unit` and must never throw, because one bad row would
 * otherwise 500 the whole history list, which gates boot.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rowToSessionLog } from '@/server/session-log-mapper';

const FINISHED = new Date('2026-06-05T12:00:00.000Z');

const coreRow = () => ({
  program_id: 'bbr',
  program_name: 'Basic Beginner Routine',
  day_name: 'Workout A',
  finished_at: FINISHED,
});

const CORE_LOG = {
  programId: 'bbr',
  programName: 'Basic Beginner Routine',
  dayName: 'Workout A',
  dateISO: FINISHED.toISOString(),
};

const VALID_EXERCISES = [
  { name: 'Squat', scheme: '5×3+', sets: [{ done: true, weight: 225, reps: 15 }] },
];

void test('rowToSessionLog attaches a valid set_log (exercises + unit)', () => {
  const row = { ...coreRow(), set_log: { unit: 'lb', exercises: VALID_EXERCISES } };
  assert.deepEqual(rowToSessionLog(row), {
    ...CORE_LOG,
    exercises: VALID_EXERCISES,
    unit: 'lb',
  });
});

void test('rowToSessionLog omits set data for the pre-022 default and empty shapes', () => {
  // '{}' — the column default and every old-client write.
  assert.deepEqual(rowToSessionLog({ ...coreRow(), set_log: {} }), CORE_LOG);
  // Empty exercises = "no per-set data", not "logged an empty workout".
  assert.deepEqual(
    rowToSessionLog({ ...coreRow(), set_log: { unit: 'lb', exercises: [] } }),
    CORE_LOG,
  );
  // Absent column (offline fixtures / pre-migration SELECT) is silent too.
  assert.deepEqual(rowToSessionLog(coreRow()), CORE_LOG);
});

void test('rowToSessionLog DEGRADES on malformed set_log — never throws (boot gate)', () => {
  const malformed: unknown[] = [
    null,
    'not an object',
    ['array', 'shape'],
    { unit: 'kg', exercises: VALID_EXERCISES }, // unknown unit
    { exercises: VALID_EXERCISES }, // missing unit
    { unit: 'lb', exercises: [{ name: 'Squat' }] }, // bad exercise shape
    {
      unit: 'lb',
      exercises: [
        { name: 'Squat', scheme: '3×5', sets: [{ done: true, weight: Number.NaN, reps: 5 }] },
      ],
    }, // non-finite number (the shared guard's Number.isFinite is load-bearing)
    {
      unit: 'lb',
      exercises: [{ name: 'Squat', scheme: '3×5', sets: [{ done: true, weight: -1, reps: 5 }] }],
    }, // negative weight
    {
      unit: 'lb',
      exercises: [{ name: 'Squat', scheme: '3×5', sets: [{ done: true, weight: 100, reps: 5.5 }] }],
    }, // float reps
  ];
  for (const set_log of malformed) {
    assert.deepEqual(rowToSessionLog({ ...coreRow(), set_log }), CORE_LOG);
  }
});

void test('rowToSessionLog still throws on malformed CORE columns (server fault)', () => {
  assert.throws(() => rowToSessionLog({ ...coreRow(), program_id: 42 }));
  assert.throws(() => rowToSessionLog({ ...coreRow(), finished_at: '2026-06-05' }));
});
