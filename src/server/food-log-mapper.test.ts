/// <reference types="node" />
/**
 * Offline tests for the 032 food-log row→domain mapper and its helpers (proposal SC: "unit tests
 * pass"). Imports neither `db.ts`'s pool path nor any route, so no DB/network is needed. The
 * string-valued numeric cases pin the load-bearing pg behavior: `numeric` columns come back as
 * STRINGS, so the mapper must coerce them (the SELECT also casts uuid/date to text).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rowToFoodLogEntry } from '@/server/food-log-mapper';
import { numericColumn } from '@/server/numeric-column';
import { usdaNutrientValue } from '@/server/usda-nutrient-value';

const ROW = {
  id: '7b2c-uuid',
  logged_on: '2026-06-22',
  name: 'Egg, whole, raw',
  quantity: '2',
  serving_label: '2 × 1 large (50 g)',
  calories: '143',
  protein_g: '12.6',
  carbs_g: '0.7',
  fat_g: '9.5',
  source: 'usda',
  source_ref: '748967',
};

void test('rowToFoodLogEntry coerces string numerics and maps snake_case to camelCase', () => {
  const entry = rowToFoodLogEntry(ROW);
  assert.deepEqual(entry, {
    id: '7b2c-uuid',
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
  });
});

void test('rowToFoodLogEntry accepts a null source_ref (manual entry)', () => {
  const entry = rowToFoodLogEntry({ ...ROW, source: 'manual', source_ref: null });
  assert.equal(entry.source, 'manual');
  assert.equal(entry.sourceRef, null);
});

void test('rowToFoodLogEntry throws on a bad source, non-string id, or non-numeric column', () => {
  assert.throws(() => rowToFoodLogEntry({ ...ROW, source: 'barcode' }));
  assert.throws(() => rowToFoodLogEntry({ ...ROW, id: 7 }));
  assert.throws(() => rowToFoodLogEntry({ ...ROW, calories: 'abc' }));
  assert.throws(() => rowToFoodLogEntry({ ...ROW, source_ref: 5 }));
});

void test('numericColumn coerces string or number, throws on non-finite', () => {
  assert.equal(numericColumn('12.5', 'calories'), 12.5);
  assert.equal(numericColumn(0, 'calories'), 0);
  assert.throws(() => numericColumn('not-a-number', 'calories'));
  assert.throws(() => numericColumn(null, 'calories'));
});

void test('usdaNutrientValue extracts a matching nutrient, else 0', () => {
  const nutrients = [
    { nutrientNumber: '208', value: 143 },
    { nutrientNumber: '203', value: 12.6 },
  ];
  assert.equal(usdaNutrientValue(nutrients, '208'), 143);
  assert.equal(usdaNutrientValue(nutrients, '203'), 12.6);
  assert.equal(usdaNutrientValue(nutrients, '205'), 0);
  assert.equal(usdaNutrientValue('not-an-array', '208'), 0);
  assert.equal(usdaNutrientValue([{ nutrientNumber: '208', value: -5 }], '208'), 0);
});
