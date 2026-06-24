/// <reference types="node" />
/**
 * Tests the streaming structural-progress scanner (034). The load-bearing properties the panels
 * called out: it counts only COMPLETED top-level array elements (never the nested exercises[]/
 * sets[]), it is string-literal aware (braces/brackets inside a `blurb` don't miscount), it holds a
 * `perWeek` scalar split across a chunk boundary (incl. mid-scalar) until it fully arrives, and it
 * never over-counts as the buffer grows monotonically chunk by chunk.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scanProgress } from '@/server/llm/scan-progress';

const exercise = {
  name: 'Bench',
  sets: 3,
  scheme: '3×8-12',
  progression: { startWeight: 135, rule: { kind: 'linear', increment: 5, frequency: 'per-week' } },
};

// A representative generate response: 3 days, nested exercises with their own arrays, and a blurb
// whose text contains JSON-significant characters that must NOT affect depth counting.
const PROGRAM = JSON.stringify({
  name: 'Hypertrophy 3-Day',
  tag: 'Muscle Growth',
  perWeek: 3,
  blurb: 'Tough but fair {not a brace} [not a bracket] "quote" day',
  days: [
    { name: 'Push', exercises: [exercise, exercise] },
    { name: 'Pull', exercises: [exercise] },
    { name: 'Legs', exercises: [exercise] },
  ],
});

const QUESTION_GRAPH = JSON.stringify({
  questions: [
    { id: 'primary_goal', kind: 'single-select', prompt: 'Goal?', options: [] },
    { id: 'days_per_week', kind: 'single-select', prompt: 'Days?', options: [] },
    { id: 'injuries', kind: 'text', prompt: 'Injuries?', maxLength: 200 },
  ],
});

void test('full program: counts all 3 days and reads perWeek, ignoring nested exercises[]', () => {
  const scan = scanProgress(PROGRAM, 'days', 'perWeek');
  assert.equal(scan.count, 3);
  assert.equal(scan.scalar, 3);
});

void test('full question graph: counts all 3 questions, no scalar requested', () => {
  const scan = scanProgress(QUESTION_GRAPH, 'questions');
  assert.equal(scan.count, 3);
  assert.equal(scan.scalar, undefined);
});

void test('monotonic prefix scan never over-counts and only counts closed days', () => {
  let prev = 0;
  let sawTwo = false;
  for (let i = 1; i <= PROGRAM.length; i++) {
    const scan = scanProgress(PROGRAM.slice(0, i), 'days', 'perWeek');
    assert.ok(scan.count >= prev, `count went backwards at prefix ${String(i)}`);
    assert.ok(scan.count <= 3, `count exceeded total at prefix ${String(i)}`);
    prev = scan.count;
    if (scan.count === 2) sawTwo = true;
  }
  assert.ok(sawTwo, 'should pass through an intermediate count of 2 as days stream in');
  assert.equal(prev, 3);
});

void test('perWeek split mid-scalar across chunks: held until complete', () => {
  assert.equal(scanProgress('{"perWeek":', 'days', 'perWeek').scalar, undefined);
  assert.equal(scanProgress('{"perWeek": ', 'days', 'perWeek').scalar, undefined);
  assert.equal(scanProgress('{"perWeek": 1', 'days', 'perWeek').scalar, undefined);
  assert.equal(scanProgress('{"perWeek": 12', 'days', 'perWeek').scalar, undefined);
  assert.equal(scanProgress('{"perWeek": 12,', 'days', 'perWeek').scalar, 12);
  assert.equal(scanProgress('{"perWeek":4}', 'days', 'perWeek').scalar, 4);
});

void test('string values containing braces/brackets/array-key do not miscount', () => {
  const tricky = JSON.stringify({
    perWeek: 2,
    note: 'days: [ { } ] "days" still in a string',
    days: [{ name: 'A' }, { name: 'B' }],
  });
  const scan = scanProgress(tricky, 'days', 'perWeek');
  assert.equal(scan.count, 2);
  assert.equal(scan.scalar, 2);
});

void test('escaped quote inside a string keeps the parser in-string', () => {
  const tricky = '{"days":[{"name":"a \\" } ] b"},{"name":"c"}]}';
  assert.equal(scanProgress(tricky, 'days').count, 2);
});

void test('empty target array and absent array both report zero', () => {
  assert.equal(scanProgress('{"days":[]}', 'days', 'perWeek').count, 0);
  assert.equal(scanProgress('{"name":"x"', 'days', 'perWeek').count, 0);
});
