/// <reference types="node" />
/**
 * Tests the `user_programs` row -> Program mapping offline (no DB). Mirrors `programs-mapper.test`,
 * plus coverage for the `created_at` normalization added in 046: pg returns timestamptz as a JS
 * `Date`, which must become an ISO string on `createdAt`; a string passes through; anything else
 * (or a missing column) leaves `createdAt` unset so the field stays a generated-only marker.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type UnknownRow } from '@/server/db';
import { rowToUserProgram } from '@/server/user-program-mapper';

const validRow: UnknownRow = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Upper/Lower Hypertrophy',
  tag: 'Muscle Growth',
  cred: 'Generated for you',
  per_week: 4,
  blurb: 'A blurb.',
  days: [{ name: 'Upper', exercises: [{ name: 'Bench', sets: 3, scheme: '3×8' }] }],
  created_at: new Date('2026-07-09T14:34:00.000Z'),
};

void test('rowToUserProgram maps a valid row and normalizes a Date created_at to ISO', () => {
  const program = rowToUserProgram(validRow);
  assert.equal(program.perWeek, 4);
  assert.equal(program.createdAt, '2026-07-09T14:34:00.000Z');
});

void test('rowToUserProgram passes a string created_at through unchanged', () => {
  const program = rowToUserProgram({ ...validRow, created_at: '2026-07-09T14:34:00.000Z' });
  assert.equal(program.createdAt, '2026-07-09T14:34:00.000Z');
});

void test('rowToUserProgram omits createdAt when the column is absent or non-date', () => {
  const { created_at: _omit, ...noStamp } = validRow;
  void _omit;
  assert.equal(rowToUserProgram(noStamp).createdAt, undefined);
  assert.equal(rowToUserProgram({ ...validRow, created_at: 42 }).createdAt, undefined);
});

void test('rowToUserProgram throws on structurally invalid columns', () => {
  assert.throws(() => rowToUserProgram({ ...validRow, tag: 'Cardio' }));
  assert.throws(() => rowToUserProgram({ ...validRow, per_week: '4' }));
  assert.throws(() => rowToUserProgram({ ...validRow, days: 'not-an-array' }));
});
