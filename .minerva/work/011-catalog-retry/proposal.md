# 011 — catalog-retry

## Status

Draft

## Goal

In-app recovery from a failed catalog hydration: the error view gains a Retry control that
re-runs the startup fetch, so a transient `GET /api/programs` failure no longer strands the user
until an app restart. Closes 010's followup T1 — the render-gate pattern's recorded "current
cost" ([[016-pattern-ssr-safe-startup-hydration-gate]]).

## Why

`StateProvider` hydrates the catalog once in a mount effect (`[]` deps); after
`HYDRATE_PROGRAMS_ERROR` nothing can re-trigger the fetch, and `CatalogStatus`'s error copy
literally says "REOPEN THE APP TO RETRY". A transient network blip or a DB restart therefore
requires a full app restart to recover.

This ships first of the two 010-followup units: the follow-on unit (per-user state persistence)
adds a second startup fetch and reuses this unit's retry primitive for both.

## Approach

- **`src/state/actions.ts`** — add `{ type: 'RETRY_HYDRATE' }` to the `Action` union. The
  reducer's `default`-less `switch` under strict TS forces a case to exist (the action cannot be
  silently unhandled).
- **`src/state/reducer.ts`** — `RETRY_HYDRATE` transitions **only** from
  `programsStatus: 'error'` → `{ ...state, programsStatus: 'loading' }`; no-op from `'loading'`
  / `'ready'` (idempotent under double-tap; meaningless elsewhere).
- **`src/state/StateProvider.tsx`** — the hydrate effect becomes **status-keyed**: the body
  opens with `if (state.programsStatus !== 'loading') return;` and the deps are
  `[state.programsStatus]`. It runs on mount (initial state is `'loading'`) and on every
  `error → loading` transition. The existing `cancelled` cleanup flag stays. A comment documents
  the invariant the design leans on: the only transitions **into** `'loading'` are mount and
  `RETRY_HYDRATE` (reducer-restricted to `error → loading`), so a refetch can never race an
  in-flight fetch.

  *Deliberate refinement of the scope-panel artifact's "`hydrateAttempt` counter":* a counter
  dep is never read inside the effect body → `react-hooks/exhaustive-deps` flags an unnecessary
  dependency → fails `--max-warnings 0`. The status guard *uses* its dep (exhaustive-deps-exact
  by construction) and avoids a new `AppState` field. Same action, same UX, smaller surface.
- **`src/components/CatalogStatus.tsx`** — optional `onRetry?: () => void` prop; when
  `status === 'error'` and `onRetry` is provided, render the existing `Button` (label `Retry`)
  below the `EmptyState`, **inline in the same component** (`react/no-multi-comp` with
  `ignoreStateless: false` + `local/single-declaration` forbid an extracted helper). Error copy
  changes from `REOPEN THE APP TO RETRY` to `CHECK YOUR CONNECTION`.
- **Call sites** — all three gate sites pass
  `onRetry={() => dispatch({ type: 'RETRY_HYDRATE' })}`: `src/app/(tabs)/_layout.tsx` (widens
  its destructure to `{ state, dispatch }`), `src/app/program/[id].tsx`, `src/app/workout.tsx`
  (both already destructure `dispatch`).
- **`src/state/reducer.test.ts`** — new offline cases: `RETRY_HYDRATE` from `'error'` →
  `'loading'`; no-op from `'loading'` and `'ready'`.

**SSR:** unchanged — the server render still always observes `'loading'` (effects never run
during SSR; the retry control is only reachable from a client-rendered error view). Gate
placement is untouched; [[016-pattern-ssr-safe-startup-hydration-gate]]'s invariants hold.

## Success criteria

1. `npm test` green offline, including the new `RETRY_HYDRATE` cases (`error → loading`
   transition; no-op from `'ready'` and `'loading'`).
2. Manual, reviewer-attested (the effect-refire behavior has no automated guard — inherent to
   the offline test lane, [[012-pattern-src-unit-tests-node-tsx]]): Postgres down → error view
   with Retry; Postgres up → tap Retry → app loads without a restart.
3. `npm run lint` (`--max-warnings 0`), `npm run typecheck`, `npm test`, `npm run export:web`
   all green.
4. No new `AppState` field; no gate-placement or SSR-behavior change.

## Open questions

None.
