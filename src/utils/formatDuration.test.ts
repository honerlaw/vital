/// <reference types="node" />
/**
 * formatDuration (041): a compact stopwatch string — "m:ss" under an hour, "h:mm:ss" at/over an
 * hour (where formatTime's plain "m:ss" would read "65:30"). Clamped at zero.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDuration } from '@/utils/formatDuration';

void test('formatDuration renders m:ss under an hour', () => {
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(9), '0:09');
  assert.equal(formatDuration(70), '1:10');
  assert.equal(formatDuration(1470), '24:30');
  assert.equal(formatDuration(3599), '59:59');
});

void test('formatDuration renders h:mm:ss at or over an hour', () => {
  assert.equal(formatDuration(3600), '1:00:00');
  assert.equal(formatDuration(3661), '1:01:01');
  assert.equal(formatDuration(7325), '2:02:05');
});

void test('formatDuration clamps negatives and floors fractional seconds', () => {
  assert.equal(formatDuration(-5), '0:00');
  assert.equal(formatDuration(70.9), '1:10');
});
