/// <reference types="node" />
/**
 * Regression test for the 032 USDA-search 400 bug. The original code passed `dataType` as a single
 * comma-joined value, which `URLSearchParams` percent-encodes to `%2C` — USDA's gateway rejects
 * that with a 400, so every search 502'd once a key was present. The fix passes `dataType` as
 * REPEATED params. This pins that contract (pure URL builder — no live API needed).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildUsdaSearchUrl } from '@/server/build-usda-search-url';

void test('buildUsdaSearchUrl emits repeated dataType params, never a %2C comma-list', () => {
  const url = buildUsdaSearchUrl('KEY123', 'chicken breast');
  // The 400-causing form was a single comma-joined dataType value → URLSearchParams %2C.
  assert.equal(url.includes('%2C'), false);
  const qs = new URL(url).searchParams;
  assert.deepEqual(qs.getAll('dataType'), ['Foundation', 'SR Legacy', 'Survey (FNDDS)']);
  assert.equal(qs.get('api_key'), 'KEY123');
  assert.equal(qs.get('query'), 'chicken breast');
  assert.equal(qs.get('pageSize'), '25');
});
