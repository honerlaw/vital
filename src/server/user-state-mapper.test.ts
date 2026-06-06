/// <reference types="node" />
/**
 * Offline tests for the 012 row→domain mappers (proposal SC#1). Imports neither `db.ts`'s pool
 * path nor any route, so no DB/network is needed. The `finished_at` cases pin the load-bearing
 * pg behavior: `timestamptz` columns come back as JS `Date` instances, not strings.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rowToSessionLog } from '@/server/session-log-mapper';
import { rowToUserStateMeta } from '@/server/user-state-mapper';

void test('rowToUserStateMeta maps a valid row (jsonb cursors arrives as a JS object)', () => {
  const meta = rowToUserStateMeta({ active_program_id: 'bbr', cursors: { bbr: 3, gzclp: 1 } });
  assert.deepEqual(meta, { activeProgramId: 'bbr', cursors: { bbr: 3, gzclp: 1 } });
});

void test('rowToUserStateMeta throws on an invalid row', () => {
  assert.throws(() => rowToUserStateMeta({ active_program_id: 7, cursors: {} }));
  // Non-number map values must throw, not flow into day arithmetic as NaN (015).
  assert.throws(() => rowToUserStateMeta({ active_program_id: 'bbr', cursors: { bbr: 'x' } }));
  assert.throws(() => rowToUserStateMeta({ active_program_id: 'bbr', cursors: 3 }));
});

void test('rowToSessionLog maps a Date finished_at to an ISO string', () => {
  const log = rowToSessionLog({
    program_id: 'bbr',
    program_name: 'Basic Beginner Routine',
    day_name: 'Workout A',
    finished_at: new Date('2026-06-05T12:00:00.000Z'),
  });
  assert.deepEqual(log, {
    programId: 'bbr',
    programName: 'Basic Beginner Routine',
    dayName: 'Workout A',
    dateISO: '2026-06-05T12:00:00.000Z',
  });
});

void test('rowToSessionLog throws on string finished_at (pg returns Date) or missing field', () => {
  assert.throws(() =>
    rowToSessionLog({
      program_id: 'bbr',
      program_name: 'B',
      day_name: 'A',
      finished_at: '2026-06-05T12:00:00.000Z',
    }),
  );
  assert.throws(() => rowToSessionLog({ program_id: 'bbr' }));
});
