/// <reference types="node" />
/**
 * groupThousands (041): deterministic thousands-comma grouping, used for the history volume stat
 * instead of the engine-inconsistent Intl.NumberFormat.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupThousands } from '@/utils/groupThousands';

void test('groupThousands inserts commas every three digits', () => {
  assert.equal(groupThousands(0), '0');
  assert.equal(groupThousands(42), '42');
  assert.equal(groupThousands(999), '999');
  assert.equal(groupThousands(1000), '1,000');
  assert.equal(groupThousands(12500), '12,500');
  assert.equal(groupThousands(1234567), '1,234,567');
});

void test('groupThousands rounds and handles a sign', () => {
  assert.equal(groupThousands(1500.6), '1,501');
  assert.equal(groupThousands(-2500), '-2,500');
});
