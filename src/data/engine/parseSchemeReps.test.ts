/// <reference types="node" />
/**
 * parseSchemeReps over the FULL live scheme vocabulary (every distinct `scheme` string in the
 * catalog migration seed, 022). The separator is U+00D7 '×' — an ASCII-'x' pattern would
 * silently no-op the entire prefill feature, which is exactly what these literals pin.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSchemeReps } from '@/data/engine';

const CASES: [string, number | null][] = [
  ['1×5', 5],
  ['3×5', 5],
  ['4×5', 5],
  ['5×5', 5],
  ['3×10', 10],
  ['3×15', 15],
  ['5×15', 15],
  ['1×5+', 5], // AMRAP floor
  ['3×5+', 5],
  ['5×3+', 3],
  ['3×8-12', 8], // range floor
  ['4×8-12', 8],
  ['5×8-12', 8],
  ['5/3/1', null], // no per-set target — blank
  ['8 sets', null],
  ['9 sets', null],
];

void test('parseSchemeReps maps every live scheme to its prefill target (U+00D7 separator)', () => {
  for (const [scheme, expected] of CASES) {
    assert.equal(parseSchemeReps(scheme), expected, `scheme ${scheme}`);
  }
});

void test('parseSchemeReps rejects the ASCII-x lookalike and junk', () => {
  assert.equal(parseSchemeReps('3x5'), null); // ASCII 'x' is NOT the catalog separator
  assert.equal(parseSchemeReps(''), null);
  assert.equal(parseSchemeReps('×5'), null);
  assert.equal(parseSchemeReps('3×'), null);
});
