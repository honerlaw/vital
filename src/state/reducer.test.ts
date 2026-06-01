/// <reference types="node" />
/**
 * Tests the catalog-hydration reducer logic offline (the reducer is a pure `(state, action) =>
 * state` function, so no React/network/DB is needed). These assertions are what evidences the
 * render-gate's contract: a non-empty catalog → `ready` (with a normalized active program), and an
 * empty catalog or a fetch error → `error` (so the gate shows the error view rather than letting a
 * program screen resolve an absent program). See proposal SC#2a.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type AppState } from '@/data/types';
import { DEFAULT_STATE } from '@/state/default-state';
import { reducer } from '@/state/reducer';
import { SAMPLE_PROGRAMS } from '@/test-support/programs';

void test('HYDRATE_PROGRAMS with a non-empty catalog becomes ready, keeps a present id', () => {
  const next = reducer(DEFAULT_STATE, { type: 'HYDRATE_PROGRAMS', programs: SAMPLE_PROGRAMS });
  assert.equal(next.programsStatus, 'ready');
  assert.equal(next.programs.length, SAMPLE_PROGRAMS.length);
  // DEFAULT_STATE.activeProgramId 'bbr' is present in the catalog → unchanged.
  assert.equal(next.activeProgramId, 'bbr');
});

void test('HYDRATE_PROGRAMS normalizes an absent active id to the first program', () => {
  const stale: AppState = { ...DEFAULT_STATE, activeProgramId: 'removed-program' };
  const next = reducer(stale, { type: 'HYDRATE_PROGRAMS', programs: SAMPLE_PROGRAMS });
  assert.equal(next.programsStatus, 'ready');
  assert.equal(next.activeProgramId, SAMPLE_PROGRAMS[0].id);
});

void test('HYDRATE_PROGRAMS with an empty catalog becomes error', () => {
  const next = reducer(DEFAULT_STATE, { type: 'HYDRATE_PROGRAMS', programs: [] });
  assert.equal(next.programsStatus, 'error');
});

void test('HYDRATE_PROGRAMS_ERROR becomes error', () => {
  const next = reducer(DEFAULT_STATE, { type: 'HYDRATE_PROGRAMS_ERROR' });
  assert.equal(next.programsStatus, 'error');
});

void test('SET_ACTIVE_PROGRAM ignores an id absent from the catalog, accepts a present one', () => {
  const ready = reducer(DEFAULT_STATE, { type: 'HYDRATE_PROGRAMS', programs: SAMPLE_PROGRAMS });
  const ignored = reducer(ready, { type: 'SET_ACTIVE_PROGRAM', id: 'nope' });
  assert.equal(ignored.activeProgramId, ready.activeProgramId);
  const set = reducer(ready, { type: 'SET_ACTIVE_PROGRAM', id: 'gzclp' });
  assert.equal(set.activeProgramId, 'gzclp');
});
