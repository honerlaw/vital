/// <reference types="node" />
/**
 * Regression test for the 032 USDA-search 400 bug — second diagnosis (038 hotfix).
 *
 * The REAL trigger was never the `%2C` comma (USDA returns 200 for that). It is the space inside
 * `Survey (FNDDS)`: `URLSearchParams.toString()` serializes a space as `+`, producing
 * `dataType=Survey+%28FNDDS%29`, and USDA's nginx gateway rejects the `+%28` sequence with a 400
 * (verified live: `+%28` → 400, `%20%28` → 200). So every search 502'd once a key was present.
 *
 * The fix encodes spaces as `%20` (manual `encodeURIComponent`, never `URLSearchParams`' `+`). This
 * pins the no-`+` contract — a pure URL builder, so no live API needed. The earlier `%2C` assertion
 * is kept as a guard but was a red herring.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildUsdaSearchUrl } from '@/server/build-usda-search-url';

void test('buildUsdaSearchUrl encodes spaces as %20, never + (the nginx-400 trigger)', () => {
  const url = buildUsdaSearchUrl('KEY123', 'chicken breast');
  // The 400-causing form was a `+`-encoded space adjacent to `%28` in `Survey (FNDDS)`.
  assert.equal(url.includes('+'), false);
  assert.equal(url.includes('Survey%20(FNDDS)'), true);
  // The originally-blamed comma form is harmless, but stay clear of it anyway.
  assert.equal(url.includes('%2C'), false);
  const qs = new URL(url).searchParams;
  assert.deepEqual(qs.getAll('dataType'), ['Foundation', 'SR Legacy', 'Survey (FNDDS)']);
  assert.equal(qs.get('api_key'), 'KEY123');
  assert.equal(qs.get('query'), 'chicken breast');
  assert.equal(qs.get('pageSize'), '25');
});
