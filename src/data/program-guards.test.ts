/// <reference types="node" />
/**
 * Tests the shared catalog guards offline. A representative catalog (and a JSON round-trip of it,
 * which is what the client receives from `GET /api/programs`) must pass `isProgramArray`, and
 * malformed values must be rejected — this is the validation both the client fetch and the server
 * mapper rely on to stay cast-free.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isProgram, isProgramArray, isProgramTag } from '@/data/guards';
import { SAMPLE_PROGRAMS } from '@/test-support/programs';

void test('a representative catalog passes the guard', () => {
  assert.ok(isProgramArray(SAMPLE_PROGRAMS));
});

void test('a JSON round-trip of the catalog (what the client receives) still validates', () => {
  const roundTripped: unknown = JSON.parse(JSON.stringify(SAMPLE_PROGRAMS));
  assert.ok(isProgramArray(roundTripped));
});

void test('isProgramTag rejects an unknown tag', () => {
  assert.ok(isProgramTag('Strength'));
  assert.ok(!isProgramTag('Cardio'));
  assert.ok(!isProgramTag(42));
});

void test('isProgram rejects structurally invalid values', () => {
  assert.ok(!isProgram({ id: 'x' }));
  assert.ok(!isProgram(null));
  assert.ok(!isProgram({ id: 'x', name: 'X', tag: 'Strength', cred: 'c', perWeek: 3, blurb: 'b' }));
});
