# Bug: `@clerk/expo` useAuth returns an unstable `getToken` → routine plan effect stream abort/reopen loop

- Type: bug
- Date: 2026-07-05
- Work unit: 044-routine-plan-gettoken-loop
- Related: [[004-pattern-expo56-react-compiler-hook-rules]] (the exhaustive-deps / refs rules the fix
  is written to — an effect must not read a value it excludes from deps, and `.current` is
  render-forbidden), [[034-pattern-ai-routine-generation]] and
  [[038-pattern-llm-sse-streaming-and-cancel]] (the streaming plan/generate/refine path whose
  progress events are the sustained render driver), [[011-pattern-clerk-expo-core3-auth-and-endpoint-enforcement]]
  and [[035-pattern-server-llm-integration]] (the Clerk `getToken` threaded into every LLM call),
  [[027-pattern-native-stack-headers-pushed-screens]] (the BENIGN re-subscription counterpart — this
  is the pathological version), [[025-pattern-sentry-observability-wiring]] (why this was invisible to
  Sentry/PostHog and only showed in DO logs)

## Symptom

A ~40-second burst of ~30 `ERR_STREAM_PREMATURE_CLOSE` errors at a regular ~1 Hz appeared in the
DigitalOcean runtime logs (`doctl apps logs vital-app --type run`), all raised by Expo Router piping
the routine SSE `ReadableStream` to the Node `ServerResponse` when the client socket dropped
mid-stream (no application stack frames — the throw is at `node:internal/streams/pipeline`). The
routine wizard hung on its `loading-plan` screen. Invisible to Sentry and PostHog: the client errors
are caught and the server premature-close only lands in DO logs (025).

## Root cause

`@clerk/expo` v3's `useAuth()` builds a **new `getToken` function on every render** — no `useCallback`
(`node_modules/@clerk/expo/dist/hooks/useAuth.js`: `const getToken = (opts) => getTokenBase(opts).then(…)`).
The routine wizard's plan-fetch `useEffect` (`src/app/routine/new.tsx`) listed `getToken` in its dep
array (`[phase, getToken]`) and its cleanup called `controller.abort()`. While `phase === 'loading-plan'`,
each plan-stream `progress` event fired `setProgress` → a re-render → a fresh `getToken` reference →
the effect's deps changed → cleanup aborted the in-flight stream (the server-side premature close) →
the effect body re-ran and opened a new stream. Because every attempt was aborted before its terminal
`done` frame, `phase` never advanced (the `.then`/`.catch` are guarded by `!signal.aborted`), so the
loop was self-sustaining at ~1 Hz (gated by time-to-first-progress-token) until the user backed out.

**Two conditions are both required**, which is why only this one effect looped: (1) the cleanup aborts
the in-flight async work that would otherwise flip the effect's guard variable, and (2) a sustained
render driver keeps producing fresh `getToken` refs. The other `getToken`-keyed effects
(`StateProvider` ×3, `useFoodLog`) satisfy neither — their cleanup only sets a local `cancelled` flag
(no abort) and they have no progress-stream render driver — so they are latent-but-benign, firing about
once.

## Fix

Latest-ref pattern, lint-clean under the strict guardrails (001/004): hold the newest `getToken` in a
ref synced by its own `[getToken]` effect (ref writes belong in effects, not render), and have the plan
effect read `getTokenRef.current` inside its body while keying **only on `[phase]`** — so it fires once
per entry and no longer re-subscribes on render. No token staleness results: the ref always holds the
newest wrapper and Clerk fetches a live token internally regardless of wrapper identity.

## Generalization

Any `useEffect` that (a) keys on an unstable-every-render function from a hook and (b) aborts in-flight
work on cleanup is a latent abort/reopen loop the moment a sustained render driver appears. Prefer a
latest-ref (or a stably-memoized callback) over putting such a function in an effect's deps. A global
`useStableAuth` wrapper that `useCallback`-memoizes `@clerk/expo`'s `getToken` would close the whole
class (deferred followup — see the work unit's `followups.md`).
