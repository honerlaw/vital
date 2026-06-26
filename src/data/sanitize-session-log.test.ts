/// <reference types="node" />
/**
 * Client-side mirror of the server's best-effort read (022): the sanitizer attaches
 * `exercises`/`unit` only when they re-validate through the shared guard, so a corrupt
 * optional blob degrades that one entry instead of failing the whole hydration payload
 * (the brick-boot vector the symmetric-degrade decision closed). Malformed fixtures are
 * narrowed through `isSessionLog` exactly as production wire data is — the core guard
 * deliberately doesn't inspect optional fields, which is why the sanitizer exists.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isSessionLog } from '@/data/guards';
import { sanitizeSessionLog } from '@/data/sanitize-session-log';
import { type SessionLog } from '@/data/types';

const CORE: SessionLog = {
  programId: 'bbr',
  programName: 'Basic Beginner Routine',
  dayName: 'Workout A',
  dateISO: '2026-06-05T12:00:00.000Z',
};

const VALID_EXERCISES = [
  { name: 'Squat', scheme: '5×3+', sets: [{ done: true, weight: 225, reps: 15 }] },
];

void test('sanitizeSessionLog keeps a valid per-set log', () => {
  const log: SessionLog = { ...CORE, exercises: VALID_EXERCISES, unit: 'lb' };
  assert.deepEqual(sanitizeSessionLog(log), log);
});

void test('sanitizeSessionLog passes legacy entries through untouched', () => {
  assert.deepEqual(sanitizeSessionLog(CORE), CORE);
});

void test('sanitizeSessionLog keeps a valid durationSec, drops a malformed one (041)', () => {
  assert.deepEqual(sanitizeSessionLog({ ...CORE, durationSec: 1470 }), {
    ...CORE,
    durationSec: 1470,
  });
  // A negative / non-finite duration degrades to no-duration (mirrors the server mapper).
  assert.deepEqual(sanitizeSessionLog({ ...CORE, durationSec: -1 }), CORE);
  assert.deepEqual(sanitizeSessionLog({ ...CORE, durationSec: Number.POSITIVE_INFINITY }), CORE);
});

void test('sanitizeSessionLog drops malformed optional fields, keeps the core entry', () => {
  const wireEntries: unknown[] = [
    { ...CORE, exercises: 'junk', unit: 'lb' },
    { ...CORE, exercises: [{ name: 'Squat' }], unit: 'lb' },
    { ...CORE, exercises: VALID_EXERCISES }, // missing unit
    { ...CORE, exercises: VALID_EXERCISES, unit: 'kg' }, // unknown unit
    { ...CORE, exercises: [], unit: 'lb' }, // empty = no data
    {
      ...CORE,
      exercises: [{ name: 'Squat', scheme: '3×5', sets: [{ done: true, weight: -1, reps: 5 }] }],
      unit: 'lb',
    },
  ];
  for (const entry of wireEntries) {
    // Same narrowing path as production: the core guard admits the entry, junk extras and all.
    if (!isSessionLog(entry)) {
      assert.fail('fixture lost its core shape');
    }
    assert.deepEqual(sanitizeSessionLog(entry), CORE);
  }
});
