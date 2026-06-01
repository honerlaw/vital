/// <reference types="node" />
/**
 * Tests the row -> Program mapping offline (no DB): a well-formed row maps and bridges
 * snake_case -> camelCase, and any malformed column makes the whole map throw (so the route
 * returns 500 rather than serving a partial/invalid list). Uses only `@/server/programs-mapper`,
 * whose `@/server/db` import is type-only, so `pg` is never loaded here.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type UnknownRow } from '@/server/db';
import { rowToProgram } from '@/server/programs-mapper';

const validRow: UnknownRow = {
  id: 'demo',
  name: 'Demo Program',
  tag: 'Strength',
  cred: 'tester',
  per_week: 3,
  blurb: 'A blurb.',
  days: [{ name: 'Day 1', exercises: [{ name: 'Squat', sets: 3, scheme: '3×5' }] }],
};

void test('rowToProgram maps a valid row and bridges per_week -> perWeek', () => {
  const program = rowToProgram(validRow);
  assert.equal(program.id, 'demo');
  assert.equal(program.tag, 'Strength');
  assert.equal(program.perWeek, 3);
  assert.equal(program.days.length, 1);
  assert.equal(program.days[0]?.exercises[0]?.scheme, '3×5');
});

void test('rowToProgram throws on an invalid tag', () => {
  assert.throws(() => rowToProgram({ ...validRow, tag: 'Cardio' }));
});

void test('rowToProgram throws when per_week is not a number', () => {
  assert.throws(() => rowToProgram({ ...validRow, per_week: '3' }));
});

void test('rowToProgram throws when days is not a WorkoutDay[]', () => {
  assert.throws(() => rowToProgram({ ...validRow, days: 'not-an-array' }));
  assert.throws(() => rowToProgram({ ...validRow, days: [{ name: 'D', exercises: [{}] }] }));
});
