/// <reference types="node" />
/**
 * Tests the catalog-hydration reducer logic offline (the reducer is a pure `(state, action) =>
 * state` function, so no React/network/DB is needed). These assertions are what evidences the
 * render-gate's contract: a non-empty catalog → `ready` (with a normalized active program), and an
 * empty catalog or a fetch error → `error` (so the gate shows the error view rather than letting a
 * program screen resolve an absent program). Origin: 010-async-catalog-cutover (its proposal
 * SC#2a); the RETRY_HYDRATE cases evidence 011-catalog-retry SC#1.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { type AppState } from '@/data/types';
import { DEFAULT_STATE } from '@/state/default-state';
import { reducer } from '@/state/reducer';
import { SAMPLE_PROGRAMS } from '@/test-support/programs';

void test('HYDRATE_PROGRAMS with a non-empty catalog becomes ready, keeps a present id', () => {
  const chosen: AppState = { ...DEFAULT_STATE, activeProgramId: 'bbr' };
  const next = reducer(chosen, { type: 'HYDRATE_PROGRAMS', programs: SAMPLE_PROGRAMS });
  assert.equal(next.programsStatus, 'ready');
  assert.equal(next.programs.length, SAMPLE_PROGRAMS.length);
  // 'bbr' is present in the catalog → unchanged.
  assert.equal(next.activeProgramId, 'bbr');
});

void test('HYDRATE_PROGRAMS keeps a null active id null (never-chose → chooser)', () => {
  // DEFAULT_STATE.activeProgramId is null. `.some(p => p.id === null)` is false, so without the
  // explicit null special-case the reducer would silently re-point to programs[0] — the exact
  // silent-enrollment bug 014 removes.
  const next = reducer(DEFAULT_STATE, { type: 'HYDRATE_PROGRAMS', programs: SAMPLE_PROGRAMS });
  assert.equal(next.programsStatus, 'ready');
  assert.equal(next.activeProgramId, null);
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

void test('RETRY_HYDRATE returns to loading from error', () => {
  const errored = reducer(DEFAULT_STATE, { type: 'HYDRATE_PROGRAMS_ERROR' });
  const retried = reducer(errored, { type: 'RETRY_HYDRATE' });
  assert.equal(retried.programsStatus, 'loading');
});

void test('RETRY_HYDRATE is a no-op outside error', () => {
  // From the initial 'loading' (e.g. a double-tap racing the first fetch): unchanged.
  assert.equal(reducer(DEFAULT_STATE, { type: 'RETRY_HYDRATE' }), DEFAULT_STATE);
  // From 'ready': unchanged — retry is only reachable from the error view.
  const ready = reducer(DEFAULT_STATE, { type: 'HYDRATE_PROGRAMS', programs: SAMPLE_PROGRAMS });
  assert.equal(reducer(ready, { type: 'RETRY_HYDRATE' }), ready);
});

void test('HYDRATE_USER_STATE after the catalog: keeps a present id, stores the map', () => {
  const ready = reducer(DEFAULT_STATE, { type: 'HYDRATE_PROGRAMS', programs: SAMPLE_PROGRAMS });
  const history = [
    {
      programId: 'bbr',
      programName: 'BBR',
      dayName: 'Workout A',
      dateISO: '2026-06-01T10:00:00.000Z',
    },
  ];
  const next = reducer(ready, {
    type: 'HYDRATE_USER_STATE',
    payload: { activeProgramId: 'gzclp', cursors: { gzclp: 3, bbr: 1 }, history },
  });
  assert.equal(next.userStateStatus, 'ready');
  assert.equal(next.activeProgramId, 'gzclp');
  assert.deepEqual(next.cursors, { gzclp: 3, bbr: 1 });
  assert.equal(next.history.length, 1);
});

void test('HYDRATE_USER_STATE after catalog: normalizes an absent id, PRESERVES the map', () => {
  const ready = reducer(DEFAULT_STATE, { type: 'HYDRATE_PROGRAMS', programs: SAMPLE_PROGRAMS });
  const next = reducer(ready, {
    type: 'HYDRATE_USER_STATE',
    payload: { activeProgramId: 'removed-program', cursors: { 'removed-program': 2 }, history: [] },
  });
  assert.equal(next.activeProgramId, SAMPLE_PROGRAMS[0].id);
  // Normalization never mutates the map — the orphan key lingers by design (015).
  assert.deepEqual(next.cursors, { 'removed-program': 2 });
});

void test('HYDRATE_USER_STATE before the catalog: raw id stored, later HYDRATE normalizes', () => {
  const next = reducer(DEFAULT_STATE, {
    type: 'HYDRATE_USER_STATE',
    payload: { activeProgramId: 'stale-id', cursors: { 'stale-id': 1 }, history: [] },
  });
  assert.equal(next.activeProgramId, 'stale-id'); // catalog not ready yet — stored raw
  const then = reducer(next, { type: 'HYDRATE_PROGRAMS', programs: SAMPLE_PROGRAMS });
  assert.equal(then.activeProgramId, SAMPLE_PROGRAMS[0].id); // normalized by the later hydrate
  assert.deepEqual(then.cursors, { 'stale-id': 1 });
});

void test('HYDRATE_USER_STATE null id stays null in BOTH landing orders (014)', () => {
  // null = the user never chose (server no-row signal); it must survive hydration untouched so
  // the Today chooser shows. Only a STALE non-null id re-points (the user already chose once).
  const ready = reducer(DEFAULT_STATE, { type: 'HYDRATE_PROGRAMS', programs: SAMPLE_PROGRAMS });
  const a = reducer(ready, {
    type: 'HYDRATE_USER_STATE',
    payload: { activeProgramId: null, cursors: {}, history: [] },
  });
  assert.equal(a.activeProgramId, null); // catalog first, user state second
  const b = reducer(DEFAULT_STATE, {
    type: 'HYDRATE_USER_STATE',
    payload: { activeProgramId: null, cursors: {}, history: [] },
  });
  assert.equal(b.activeProgramId, null); // user state first…
  const c = reducer(b, { type: 'HYDRATE_PROGRAMS', programs: SAMPLE_PROGRAMS });
  assert.equal(c.activeProgramId, null); // …catalog second: still null
});

void test('RESET_USER_STATE resets the five per-user fields, leaves the catalog alone', () => {
  const ready = reducer(DEFAULT_STATE, { type: 'HYDRATE_PROGRAMS', programs: SAMPLE_PROGRAMS });
  const hydrated = reducer(ready, {
    type: 'HYDRATE_USER_STATE',
    payload: {
      activeProgramId: 'gzclp',
      cursors: { gzclp: 2 },
      history: [
        { programId: 'bbr', programName: 'B', dayName: 'A', dateISO: '2026-06-01T10:00:00.000Z' },
      ],
    },
  });
  const started = reducer(hydrated, { type: 'START_WORKOUT', dayIndex: 0 });
  const reset = reducer(started, { type: 'RESET_USER_STATE' });
  assert.equal(reset.activeProgramId, null); // back to never-chose — the next account must be asked
  assert.deepEqual(reset.cursors, {});
  assert.equal(reset.history.length, 0);
  assert.equal(reset.live, null);
  assert.equal(reset.userStateStatus, 'loading');
  // Catalog untouched:
  assert.equal(reset.programs, started.programs);
  assert.equal(reset.programsStatus, 'ready');
});

void test('RESET_USER_STATE is a same-reference no-op when nothing to reset', () => {
  assert.equal(reducer(DEFAULT_STATE, { type: 'RESET_USER_STATE' }), DEFAULT_STATE);
});

void test('RETRY_HYDRATE resets ONLY the statuses currently in error', () => {
  // Catalog errored, user state still loading → only programsStatus flips; both end 'loading'.
  const catalogErr = reducer(DEFAULT_STATE, { type: 'HYDRATE_PROGRAMS_ERROR' });
  const retriedA = reducer(catalogErr, { type: 'RETRY_HYDRATE' });
  assert.equal(retriedA.programsStatus, 'loading');
  assert.equal(retriedA.userStateStatus, 'loading');
  // Catalog ready, user state errored → catalog must NOT be refetched.
  const ready = reducer(DEFAULT_STATE, { type: 'HYDRATE_PROGRAMS', programs: SAMPLE_PROGRAMS });
  const userErr = reducer(ready, { type: 'HYDRATE_USER_STATE_ERROR' });
  const retriedB = reducer(userErr, { type: 'RETRY_HYDRATE' });
  assert.equal(retriedB.programsStatus, 'ready');
  assert.equal(retriedB.userStateStatus, 'loading');
});

void test('START_WORKOUT is a no-op while no program is chosen (reducer contract, 014)', () => {
  // Unreachable via UI (the chooser replaces every Begin affordance while null) but load-bearing
  // for the type system and for finishSession's safety: live only exists after a non-null start.
  const ready = reducer(DEFAULT_STATE, { type: 'HYDRATE_PROGRAMS', programs: SAMPLE_PROGRAMS });
  assert.equal(ready.activeProgramId, null);
  assert.equal(reducer(ready, { type: 'START_WORKOUT', dayIndex: 0 }), ready);
});

void test('FINISH_WORKOUT uses the injected nowISO for the history entry', () => {
  const hydrated = reducer(DEFAULT_STATE, { type: 'HYDRATE_PROGRAMS', programs: SAMPLE_PROGRAMS });
  const ready = reducer(hydrated, { type: 'SET_ACTIVE_PROGRAM', id: 'bbr' });
  const started = reducer(ready, { type: 'START_WORKOUT', dayIndex: 0 });
  const finished = reducer(started, {
    type: 'FINISH_WORKOUT',
    nowISO: '2026-06-05T12:00:00.000Z',
  });
  assert.equal(finished.history[0].dateISO, '2026-06-05T12:00:00.000Z');
  assert.equal(finished.live, null);
  assert.deepEqual(finished.cursors, { bbr: 1 }); // the finished program's own pointer advanced
});

void test('SET_ACTIVE_PROGRAM ignores an id absent from the catalog, accepts a present one', () => {
  const ready = reducer(DEFAULT_STATE, { type: 'HYDRATE_PROGRAMS', programs: SAMPLE_PROGRAMS });
  const ignored = reducer(ready, { type: 'SET_ACTIVE_PROGRAM', id: 'nope' });
  assert.equal(ignored.activeProgramId, ready.activeProgramId);
  const set = reducer(ready, { type: 'SET_ACTIVE_PROGRAM', id: 'gzclp' });
  assert.equal(set.activeProgramId, 'gzclp');
});

void test('switching preserves BOTH programs cursors (015)', () => {
  const ready = reducer(DEFAULT_STATE, { type: 'HYDRATE_PROGRAMS', programs: SAMPLE_PROGRAMS });
  const hydrated = reducer(ready, {
    type: 'HYDRATE_USER_STATE',
    payload: { activeProgramId: 'bbr', cursors: { bbr: 1, gzclp: 0 }, history: [] },
  });
  const switched = reducer(hydrated, { type: 'SET_ACTIVE_PROGRAM', id: 'gzclp' });
  assert.deepEqual(switched.cursors, { bbr: 1, gzclp: 0 }); // no zeroing — map untouched
  const back = reducer(switched, { type: 'SET_ACTIVE_PROGRAM', id: 'bbr' });
  assert.deepEqual(back.cursors, { bbr: 1, gzclp: 0 }); // switching back is lossless
});

void test('SWITCH_AND_START_WORKOUT resumes position and records switchedFrom (015)', () => {
  const ready = reducer(DEFAULT_STATE, { type: 'HYDRATE_PROGRAMS', programs: SAMPLE_PROGRAMS });
  const hydrated = reducer(ready, {
    type: 'HYDRATE_USER_STATE',
    payload: { activeProgramId: 'gzclp', cursors: { bbr: 1, gzclp: 0 }, history: [] },
  });
  const switched = reducer(hydrated, { type: 'SWITCH_AND_START_WORKOUT', id: 'bbr' });
  assert.equal(switched.activeProgramId, 'bbr');
  assert.notEqual(switched.live, null);
  assert.equal(switched.live?.programId, 'bbr');
  assert.equal(switched.live?.dayIndex, 1 % SAMPLE_PROGRAMS[0].days.length); // resume, not day 0
  assert.equal(switched.live?.switchedFrom, 'gzclp');
  assert.deepEqual(switched.cursors, { bbr: 1, gzclp: 0 }); // a switch never mutates the map
  // In-catalog guard mirrors SET_ACTIVE_PROGRAM:
  assert.equal(reducer(hydrated, { type: 'SWITCH_AND_START_WORKOUT', id: 'nope' }), hydrated);
});

void test('CANCEL_WORKOUT reverts a committed switch; a plain cancel does not (015)', () => {
  const ready = reducer(DEFAULT_STATE, { type: 'HYDRATE_PROGRAMS', programs: SAMPLE_PROGRAMS });
  const hydrated = reducer(ready, {
    type: 'HYDRATE_USER_STATE',
    payload: { activeProgramId: 'gzclp', cursors: { bbr: 1, gzclp: 2 }, history: [] },
  });
  // Switch-then-cancel: the previous program comes back, with its cursor intact in the map.
  const switched = reducer(hydrated, { type: 'SWITCH_AND_START_WORKOUT', id: 'bbr' });
  const reverted = reducer(switched, { type: 'CANCEL_WORKOUT' });
  assert.equal(reverted.activeProgramId, 'gzclp');
  assert.equal(reverted.live, null);
  assert.deepEqual(reverted.cursors, { bbr: 1, gzclp: 2 });
  // Plain start-then-cancel: the active program stays.
  const started = reducer(hydrated, { type: 'START_WORKOUT', dayIndex: 0 });
  const cancelled = reducer(started, { type: 'CANCEL_WORKOUT' });
  assert.equal(cancelled.activeProgramId, 'gzclp');
  assert.equal(cancelled.live, null);
});
