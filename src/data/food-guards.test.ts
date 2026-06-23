/// <reference types="node" />
/**
 * Offline tests for the 032 food guards — the strict-writer trust boundary for the
 * `POST /api/me/food-log` body and the client's validation of the food-log / food-search
 * responses. Mirrors `user-state-guards.test.ts`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isFoodLogEntry,
  isFoodSearchResult,
  isLocalDay,
  isMacroNumber,
  isNewFoodLogEntry,
} from '@/data/guards';

const NEW_ENTRY = {
  loggedOn: '2026-06-22',
  name: 'Egg, whole, raw',
  quantity: 2,
  servingLabel: '2 × 1 large (50 g)',
  calories: 143,
  proteinG: 12.6,
  carbsG: 0.7,
  fatG: 9.5,
  source: 'usda',
  sourceRef: '748967',
};

void test('isMacroNumber rejects NaN, Infinity, negatives, and non-numbers', () => {
  assert.equal(isMacroNumber(0), true);
  assert.equal(isMacroNumber(12.6), true);
  assert.equal(isMacroNumber(-1), false);
  assert.equal(isMacroNumber(Number.NaN), false);
  assert.equal(isMacroNumber(Number.POSITIVE_INFINITY), false);
  assert.equal(isMacroNumber('5'), false);
});

void test('isNewFoodLogEntry accepts a valid body and a null sourceRef', () => {
  assert.equal(isNewFoodLogEntry(NEW_ENTRY), true);
  assert.equal(isNewFoodLogEntry({ ...NEW_ENTRY, source: 'manual', sourceRef: null }), true);
});

void test('isNewFoodLogEntry rejects bad date, negative macro, empty name, bad source', () => {
  assert.equal(isNewFoodLogEntry({ ...NEW_ENTRY, loggedOn: '6/22/2026' }), false);
  assert.equal(isNewFoodLogEntry({ ...NEW_ENTRY, calories: -10 }), false);
  assert.equal(isNewFoodLogEntry({ ...NEW_ENTRY, name: '' }), false);
  assert.equal(isNewFoodLogEntry({ ...NEW_ENTRY, source: 'barcode' }), false);
  assert.equal(isNewFoodLogEntry({ ...NEW_ENTRY, sourceRef: 5 }), false);
  assert.equal(isNewFoodLogEntry(null), false);
});

void test('isNewFoodLogEntry rejects quantity 0, impossible date, and over-long name', () => {
  // quantity 0 is a meaningless serving — macros may legitimately be 0, quantity may not.
  assert.equal(isNewFoodLogEntry({ ...NEW_ENTRY, quantity: 0 }), false);
  // Format-valid but impossible calendar date must be rejected here, not 500 at Postgres.
  assert.equal(isNewFoodLogEntry({ ...NEW_ENTRY, loggedOn: '2026-13-45' }), false);
  assert.equal(isNewFoodLogEntry({ ...NEW_ENTRY, name: 'x'.repeat(201) }), false);
});

void test('isLocalDay accepts real days, rejects bad format and impossible dates', () => {
  assert.equal(isLocalDay('2026-06-22'), true);
  assert.equal(isLocalDay('2026-13-45'), false);
  assert.equal(isLocalDay('2026-02-30'), false);
  assert.equal(isLocalDay('6/22/2026'), false);
  assert.equal(isLocalDay(20260622), false);
});

void test('isFoodLogEntry requires a non-empty id on top of the new-entry shape', () => {
  assert.equal(isFoodLogEntry({ ...NEW_ENTRY, id: 'abc' }), true);
  assert.equal(isFoodLogEntry(NEW_ENTRY), false);
  assert.equal(isFoodLogEntry({ ...NEW_ENTRY, id: '' }), false);
});

void test('isFoodSearchResult requires per-100g macros and a non-empty servingOptions', () => {
  const result = {
    fdcId: '748967',
    name: 'Egg, whole, raw',
    caloriesPer100g: 143,
    proteinPer100g: 12.6,
    carbsPer100g: 0.7,
    fatPer100g: 9.5,
    servingOptions: [{ label: '100 g', grams: 100 }],
  };
  assert.equal(isFoodSearchResult(result), true);
  assert.equal(isFoodSearchResult({ ...result, servingOptions: [] }), false);
  assert.equal(isFoodSearchResult({ ...result, caloriesPer100g: 'x' }), false);
  // A zero-gram serving would zero out every logged macro — reject it.
  const zeroGram = { ...result, servingOptions: [{ label: 'x', grams: 0 }] };
  assert.equal(isFoodSearchResult(zeroGram), false);
});
