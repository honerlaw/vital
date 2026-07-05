# 044 — routine wizard: stop the plan effect from re-subscribing on every render (getToken loop)

## Status
Draft

## Goal
Stop the AI routine wizard's plan-fetch `useEffect` (`src/app/routine/new.tsx:69`) from re-subscribing
to the streaming `POST /api/me/routine/plan` on every render. Today it opens and aborts the plan SSE
stream in a self-sustaining ~1 Hz loop, so the wizard hangs on the `loading-plan` screen and the server
logs a flood of `ERR_STREAM_PREMATURE_CLOSE`. The effect must fire the plan stream exactly once per
entry into `loading-plan`.

## Why
Debugged this session from DigitalOcean runtime logs (`doctl apps logs vital-app --type run`): a
~40-second burst of ~30 `ERR_STREAM_PREMATURE_CLOSE` errors at a regular ~1 Hz on 2026-07-05
(17:31:23–17:32:02 UTC), all raised by Expo Router piping the routine SSE `ReadableStream` to the Node
`ServerResponse` when the client socket drops mid-stream. PostHog error tracking and Sentry both hold
nothing for it — the client errors are caught (`new.tsx` `.catch`) and the server premature-close only
lands in DO logs (consistent with [[025-pattern-sentry-observability-wiring]]).

Root cause, confirmed by code:
- `@clerk/expo` v3's `useAuth()` returns a **new `getToken` function on every render** — no
  `useCallback` (`node_modules/@clerk/expo/dist/hooks/useAuth.js:29`, `const getToken = (opts) => …`).
- The plan effect at `new.tsx:69` lists `getToken` in its dep array (`[phase, getToken]`) and its
  cleanup calls `controller.abort()`.
- While `phase === 'loading-plan'`, the plan stream's `progress` events fire `onProgress: setProgress`
  → a re-render → a fresh `getToken` reference → the effect's deps change → cleanup **aborts the
  in-flight stream** (the server-side premature close) → the effect body re-runs → a new plan stream
  opens. Each cycle is gated by the stream's time-to-first-progress token (~1 s), producing the regular
  ~1 Hz cadence seen in the logs.
- Because every attempt is aborted before its terminal `done` frame, `phase` never advances off
  `loading-plan` (the `.then`/`.catch` are guarded by `!controller.signal.aborted`), so the loop is
  self-sustaining until the user backs out.

This surfaced recently because the unstable-`getToken` wrapper is specific to the `@clerk/expo` v3 auth
path (031), and the sustained progress-event render driver is specific to the streaming plan fetch (034).

### Why the fix is bounded to this one effect
Four other effects key on the same unstable `getToken` — `StateProvider.tsx:57/75/94` and
`useFoodLog.ts:51` — but they are latent-but-benign, for two independent reasons: (a) their cleanup only
sets a local `cancelled` flag and does **not** abort the in-flight fetch, so the first fetch to resolve
flips the status/snapshot that their guard keys on and the effect goes quiet; and (b) none of them has a
sustained ~1 Hz render driver during their pending window (no progress stream), so in practice they fire
about once. `new.tsx:69` is the unique effect that both aborts-on-cleanup and is continuously re-rendered
by its own stream's progress events. Stabilizing `getToken` globally across all call sites is deferred as
a hardening followup (see Open Questions) rather than folded in here — no live second bug justifies the
cross-cutting auth-seam change.

## Approach
In `src/app/routine/new.tsx`, decouple the plan effect's re-run key from the unstable `getToken`
identity using the standard "latest ref" pattern, keeping the code lint-clean under the strict
guardrails ([[001-constraint-strict-eslint-guardrails]], [[004-pattern-expo56-react-compiler-hook-rules]]
— no inline `eslint-disable`, no `.current` access during render):

1. Hold the freshest `getToken` in a ref, synced in its own trivial effect:
   ```tsx
   const getTokenRef = useRef(getToken);
   useEffect(() => {
     getTokenRef.current = getToken; // ref write inside an effect — allowed by react-hooks/refs
   }, [getToken]);
   ```
2. The plan effect reads `getTokenRef.current` inside its body (post-render, so `react-hooks/refs` is
   satisfied) and keys **only on `[phase]`** — `exhaustive-deps`-exact, because `getToken` is no longer
   read directly in the body and refs are exempt:
   ```tsx
   useEffect(() => {
     if (phase !== 'loading-plan') return;
     const controller = new AbortController();
     abortRef.current = controller;
     fetchRoutinePlan(getTokenRef.current, {
       signal: controller.signal,
       onProgress: setProgress,
       onRetry: () => setRetrying(true),
     })
       .then((g) => { if (!controller.signal.aborted) { setGraph(g); setPhase('questions'); } })
       .catch(() => { if (!controller.signal.aborted) { setGraph(FIXED_SPINE); setPhase('questions'); } });
     return () => controller.abort();
   }, [phase]);
   ```

The `runGenerate`/`runRefine` paths (`new.tsx:157/183`) are user-triggered functions, not effects — they
read the current render's `getToken` at the moment of the button press and never loop, so they are left
unchanged. No token staleness results: `getTokenRef.current` always holds the newest wrapper, and Clerk's
`getToken` fetches a live session token internally regardless of wrapper identity.

### Considered, rejected
- **Global stable-`getToken` hook** (wrap `useAuth().getToken` in a `useCallback` once and thread it
  through all 8 call sites). Fixes the whole class and removes the wasteful redundant hydrate/focus
  fetches, but it is a cross-cutting change to the auth seam with materially higher blast radius, and the
  other call sites have no live bug (benign per the analysis above). Out of scope for a small fix;
  deferred as a followup.
- **One-shot `startedRef` guard while keeping `[phase, getToken]` deps.** Does not work: the effect
  cleanup (`controller.abort()`) runs on every dep change *before* the body's guard, so the stream is
  still aborted each render even if the body early-returns. The dep on `getToken` must be removed.

## Success criteria
1. The plan effect at `src/app/routine/new.tsx` no longer lists `getToken` in its dependency array; it
   keys on `[phase]` and reads the token via a ref that always holds the latest `getToken`.
2. Entering the routine wizard opens the plan stream **exactly once** per `loading-plan` entry — no
   repeated abort/reopen. Verified by reasoning about the effect deps and, where feasible, a runtime
   check that the DO logs no longer show the ~1 Hz `ERR_STREAM_PREMATURE_CLOSE` cadence during a plan
   fetch.
3. `runGenerate`/`runRefine` behavior is unchanged; the plan still degrades to `FIXED_SPINE` on failure
   and advances to `questions` on success.
4. `npm run lint` clean (`--max-warnings 0`, incl. `react-hooks/refs` and `react-hooks/exhaustive-deps`);
   `npm test` green; no NEW `tsc` errors vs. the baseline on a clean tree.

## Open Questions
- **Follow-up (hardening, not this unit):** stabilize `getToken` globally — a small `useStableAuth`
  wrapper that `useCallback`-memoizes the `@clerk/expo` `getToken` — so `StateProvider`/`useFoodLog` stop
  issuing redundant fetches during their pending windows and the whole class of "unstable getToken in
  effect deps" is closed. Surfaced for a future work unit; no live bug forces it now.
