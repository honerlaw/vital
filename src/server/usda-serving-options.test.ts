/// <reference types="node" />
/**
 * Unit tests for `buildServingOptions` (040) — turning USDA `foodMeasures[]` into selectable
 * serving chips so a beverage with `servingSize: null` (e.g. "Iced Coffee, brewed") is no longer
 * stuck at "100 g". The shape mirrors the live USDA FNDDS response inspected during 040: household
 * measures with `disseminationText` / `gramWeight` / `rank`, the catch-all "Quantity not specified"
 * entry, and no top-level gram `servingSize`. Pure mapping, so no live API needed.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildServingOptions } from '@/server/usda-serving-options';

// The real "Iced Coffee, brewed" measures (out of rank order on purpose, with the junk entry).
const ICED_COFFEE = {
  servingSize: null,
  foodMeasures: [
    { disseminationText: '1 medium', gramWeight: 480, rank: 4 },
    { disseminationText: '1 fl oz', gramWeight: 30, rank: 1 },
    { disseminationText: '1 small', gramWeight: 360, rank: 3 },
    { disseminationText: 'Quantity not specified', gramWeight: 360, rank: 6 },
    { disseminationText: '1 large', gramWeight: 600, rank: 5 },
    { disseminationText: '1 cup (8 fl oz)', gramWeight: 240, rank: 2 },
  ],
};

void test('household portions are parsed, rank-ordered, with a trailing 100 g base', () => {
  const options = buildServingOptions(ICED_COFFEE);
  assert.deepEqual(options, [
    { label: '1 fl oz', grams: 30 },
    { label: '1 cup (8 fl oz)', grams: 240 },
    { label: '1 small', grams: 360 },
    { label: '1 medium', grams: 480 },
    { label: '1 large', grams: 600 },
    { label: '100 g', grams: 100 },
  ]);
  // The default selected chip (index 0) is now a real consumer portion, not "100 g".
  assert.equal(options[0]?.label, '1 fl oz');
});

void test('"Quantity not specified" is filtered out', () => {
  const labels = buildServingOptions(ICED_COFFEE).map((o) => o.label);
  assert.equal(labels.includes('Quantity not specified'), false);
});

void test('duplicate labels are deduped (case-insensitive)', () => {
  const options = buildServingOptions({
    foodMeasures: [
      { disseminationText: '1 cup', gramWeight: 240, rank: 1 },
      { disseminationText: '1 Cup', gramWeight: 250, rank: 2 },
    ],
  });
  assert.deepEqual(options, [
    { label: '1 cup', grams: 240 },
    { label: '100 g', grams: 100 },
  ]);
});

void test('no more than 6 household portions are emitted (plus the 100 g base)', () => {
  const foodMeasures = Array.from({ length: 12 }, (_, i) => ({
    disseminationText: `portion ${String(i)}`,
    gramWeight: i + 1,
    rank: i,
  }));
  const options = buildServingOptions({ foodMeasures });
  assert.equal(options.length, 7); // 6 portions + 100 g
  assert.equal(options[6]?.label, '100 g');
});

void test('measures with non-positive or non-finite grams or empty text are skipped', () => {
  const options = buildServingOptions({
    foodMeasures: [
      { disseminationText: '1 cup', gramWeight: 240, rank: 1 },
      { disseminationText: 'zero', gramWeight: 0, rank: 2 },
      { disseminationText: 'neg', gramWeight: -5, rank: 3 },
      { disseminationText: 'nan', gramWeight: Number.NaN, rank: 4 },
      { disseminationText: '', gramWeight: 100, rank: 5 },
    ],
  });
  assert.deepEqual(options, [
    { label: '1 cup', grams: 240 },
    { label: '100 g', grams: 100 },
  ]);
});

void test('unranked measures sink below ranked ones', () => {
  const options = buildServingOptions({
    foodMeasures: [
      { disseminationText: 'no rank', gramWeight: 50 },
      { disseminationText: 'ranked', gramWeight: 60, rank: 1 },
    ],
  });
  assert.deepEqual(options, [
    { label: 'ranked', grams: 60 },
    { label: 'no rank', grams: 50 },
    { label: '100 g', grams: 100 },
  ]);
});

void test('no foodMeasures: falls back to gram servingSize then 100 g base (032)', () => {
  const options = buildServingOptions({ servingSize: 144, servingSizeUnit: 'g' });
  assert.deepEqual(options, [
    { label: '144 g', grams: 144 },
    { label: '100 g', grams: 100 },
  ]);
});

void test('a non-gram servingSize is ignored; only the 100 g base remains', () => {
  const options = buildServingOptions({ servingSize: 8, servingSizeUnit: 'fl oz' });
  assert.deepEqual(options, [{ label: '100 g', grams: 100 }]);
});

void test('a malformed / empty food still yields the 100 g base', () => {
  assert.deepEqual(buildServingOptions(null), [{ label: '100 g', grams: 100 }]);
  assert.deepEqual(buildServingOptions({}), [{ label: '100 g', grams: 100 }]);
  const base = [{ label: '100 g', grams: 100 }];
  assert.deepEqual(buildServingOptions({ foodMeasures: 'nope' }), base);
});
