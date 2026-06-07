/// <reference types="node" />
/**
 * The pure set-update engine is the single coercion choke point (022): the reducer and any
 * mirror call it with identical args, so everything downstream (finishSession's projection,
 * the POST body) sees only normalized values — finite, non-negative, integer reps, null for
 * blank/invalid. These tests pin that contract.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { updateSet } from '@/data/engine';
import { type LiveSession } from '@/data/types';

const base = (): LiveSession => ({
  programId: 'bbr',
  dayIndex: 0,
  sets: [
    [
      { done: false, weight: null, reps: null },
      { done: false, weight: 100, reps: 5 },
    ],
    [{ done: false, weight: null, reps: null }],
  ],
  switchedFrom: null,
});

void test('updateSet patches only the addressed set; pure (input untouched)', () => {
  const s = base();
  const next = updateSet(s, 0, 0, { done: true, weight: 135, reps: 15 });
  assert.deepEqual(next.sets[0][0], { done: true, weight: 135, reps: 15 });
  assert.deepEqual(next.sets[0][1], s.sets[0][1]);
  assert.deepEqual(next.sets[1], s.sets[1]);
  assert.deepEqual(base(), s); // input not mutated
});

void test('updateSet: omitted fields keep current values; null clears', () => {
  const s = base();
  const toggledOnly = updateSet(s, 0, 1, { done: true });
  assert.deepEqual(toggledOnly.sets[0][1], { done: true, weight: 100, reps: 5 });
  const cleared = updateSet(s, 0, 1, { weight: null, reps: null });
  assert.deepEqual(cleared.sets[0][1], { done: false, weight: null, reps: null });
});

void test('updateSet coerces invalid numerics to null (NaN/Infinity/negative/float reps)', () => {
  const s = base();
  assert.equal(updateSet(s, 0, 0, { weight: Number.NaN }).sets[0][0].weight, null);
  assert.equal(updateSet(s, 0, 0, { weight: Number.POSITIVE_INFINITY }).sets[0][0].weight, null);
  assert.equal(updateSet(s, 0, 0, { weight: -5 }).sets[0][0].weight, null);
  // Plates are fractional — float WEIGHT is valid.
  assert.equal(updateSet(s, 0, 0, { weight: 102.5 }).sets[0][0].weight, 102.5);
  assert.equal(updateSet(s, 0, 0, { reps: 7.5 }).sets[0][0].reps, null); // reps are integers
  assert.equal(updateSet(s, 0, 0, { reps: Number.NaN }).sets[0][0].reps, null);
  assert.equal(updateSet(s, 0, 0, { reps: -1 }).sets[0][0].reps, null);
  assert.equal(updateSet(s, 0, 0, { reps: 0 }).sets[0][0].reps, 0);
});

void test('updateSet never clamps a typed value to the scheme (15 over a "5+" stays 15)', () => {
  const s = base();
  assert.equal(updateSet(s, 0, 0, { reps: 15 }).sets[0][0].reps, 15);
});
