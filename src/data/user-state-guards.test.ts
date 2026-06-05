/// <reference types="node" />
/**
 * Offline tests for the per-user-state guards (012, proposal SC#1) — the trust boundary for the
 * parsed JSON body of `GET /api/me/state`, mirroring `program-guards.test.ts` for the catalog.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isSessionLog, isSessionLogArray, isUserStatePayload } from '@/data/guards';

const LOG = {
  programId: 'bbr',
  programName: 'Basic Beginner Routine',
  dayName: 'Workout A',
  dateISO: '2026-06-05T12:00:00.000Z',
};

void test('isSessionLog accepts a valid log and rejects invalid shapes', () => {
  assert.equal(isSessionLog(LOG), true);
  assert.equal(isSessionLog({ ...LOG, dateISO: 5 }), false);
  assert.equal(isSessionLog({ programId: 'bbr' }), false);
  assert.equal(isSessionLog(null), false);
});

void test('isSessionLogArray accepts [] and valid arrays, rejects one bad element', () => {
  assert.equal(isSessionLogArray([]), true);
  assert.equal(isSessionLogArray([LOG, LOG]), true);
  assert.equal(isSessionLogArray([LOG, { nope: true }]), false);
  assert.equal(isSessionLogArray('not-an-array'), false);
});

void test('isUserStatePayload accepts both id shapes and a JSON round-trip', () => {
  const withId = { activeProgramId: 'bbr', cursor: 3, history: [LOG] };
  const noRow = { activeProgramId: null, cursor: 0, history: [] };
  assert.equal(isUserStatePayload(withId), true);
  assert.equal(isUserStatePayload(noRow), true);
  // What the client actually receives: parsed JSON of the server response.
  const roundTrip: unknown = JSON.parse(JSON.stringify(withId));
  assert.equal(isUserStatePayload(roundTrip), true);
});

void test('isUserStatePayload rejects invalid shapes', () => {
  assert.equal(isUserStatePayload({ activeProgramId: 7, cursor: 0, history: [] }), false);
  assert.equal(isUserStatePayload({ activeProgramId: 'bbr', cursor: 'x', history: [] }), false);
  assert.equal(isUserStatePayload({ activeProgramId: 'bbr', cursor: 0 }), false);
  assert.equal(isUserStatePayload(null), false);
});
