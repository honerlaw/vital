# Pattern: streaming LLM responses over SSE (Expo Router → OpenRouter → expo/fetch) with structural progress + cancel

- Type: pattern
- Date: 2026-06-23
- Work unit: 034-routine-gen-streaming-cancel
- Related: [[035-pattern-server-llm-integration]] (the buffered `callLlm`/`requestJson` base this
  streams; server-owns-validation boundary preserved), [[034-pattern-ai-routine-generation]] (the
  wizard + phase machine this makes streamable + cancellable),
  [[027-pattern-native-stack-headers-pushed-screens]] (the static workout exit recipe this adapts to
  a per-phase dynamic lock), [[004-pattern-expo56-react-compiler-hook-rules]] (the hook rules the
  streaming effects + cancel state are written to), [[016-pattern-ssr-safe-startup-hydration-gate]]
  (the web/SSR-safety the Modal dialog follows), [[006-decision-digitalocean-app-platform-hosting]]
  (the ingress whose SSE-buffering behavior is the deployment risk),
  [[012-pattern-src-unit-tests-node-tsx]] (the scanner's test harness)

How VITAL streams structural progress from its LLM routes and makes every in-flight phase
cancellable (034), built on the buffered OpenRouter integration of 035.

## Server streams SSE; auth + cap run BEFORE the stream opens

A streaming sibling of `callLlm` (`stream-llm.ts`) sets `stream: true` on the OpenRouter call and
yields assistant text deltas (OpenAI-compatible `data: {choices:[{delta:{content}}]}` lines,
buffered across chunk boundaries, `[DONE]` terminates). Each route (`plan`/`generate`/`refine`)
runs `requireAuth` → `withinDailyLlmCap` FIRST, then returns a `text/event-stream` `Response`
(`build-routine-stream.ts`). So a 401/429/400 is always a plain JSON `Response` emitted before any
stream byte — the client distinguishes "rejected" (non-2xx) from "streaming" cleanly. The shared
`buildRoutineStream` emits typed frames: `progress` (structural snapshot), `retry` (first attempt
failed to parse, non-streamed retry running), terminal `done` (the fully validated + mapped object),
or terminal `error`. Periodic `:` keep-alive comments hold the connection through the DO ingress
during the long pre-first-token latency.

## The progress scanner reports progress, it NEVER validates

`scan-progress.ts` is a string-literal/escape/unicode-aware depth counter over the accumulating
buffer: it counts COMPLETED elements of one named TOP-LEVEL array per schema (`days[]` for
generate/refine, `questions[]` for plan — nested `exercises[]`/`sets[]` are ignored by tracking
bracket depth) and extracts one early scalar (`perWeek`). It is pure, re-scans the whole (few-KB)
buffer per chunk (chunk-boundary-correct by construction — a partial element/scalar at the tail is
simply not counted yet), and is unit-tested incl. a `perWeek` split mid-scalar across chunks. It
produces progress ONLY; final structural validation stays server-side via the existing
`mapLlmProgram`/`isQuestionGraph` on the complete buffer, so 035's server-owns-validation boundary
is intact and the client stays dumb.

## Streaming retry ownership — directly, not via `requestJson`

The streaming route calls the streaming `callLlm` directly and owns ONE non-streamed `callLlm` retry
on an end-of-stream parse/validation failure. It does NOT reuse `requestJson` (035) — that wrapper's
own internal retry would make the server fire up to FOUR upstream calls while the client believed
two. `progress` events come only from the first (streaming) attempt; during the retry the client
holds the last snapshot under "Tightening things up…"; a second failure emits terminal `error`. No
mid-stream retry, so the client never discards partial progress. `requestJson` is retained only for
any non-streaming path / NO-GO fallback.

## Native streaming needs `expo/fetch`; cancel threads through to the upstream call

RN's global `fetch` cannot read a response body incrementally on native, so the client consumes the
stream with `expo/fetch` + `AbortController` (`stream-routine.ts`): it parses SSE frames (split on
`\n\n`, `event:`/`data:` lines, ignore `:` comments), forwards `onProgress`/`onRetry`, resolves with
the validated `done`, and rejects on `error`, non-2xx, or an EOF before `done` (a dropped
connection → recoverable error, not a freeze). `apiFetch` and `streamRoutine` share an extracted
`authHeaders(getToken)` helper (the base-URL stays each caller's concern). The `AbortController.signal`
threads client → `streamRoutine` → server `request.signal` → the upstream OpenRouter `fetch`, so a
client cancel aborts the BILLED LLM call (and, separately, the save POST via the same signal).

## Cancel/back: a per-phase dynamic gesture lock adapting the static workout recipe

The wizard's in-flight phases are cancellable via a themed `ConfirmDialog` (RN `Modal`,
web/SSR-safe: renders nothing until opened, no `window` at render — the brand alternative to 027's
`Platform`-branched `Alert`). Unlike 027's workout exit (a STATIC `gestureEnabled:false` because the
exit must always run a dispatch), the routine wizard's state is ephemeral (the phase machine of
[[034-pattern-ai-routine-generation]]; `answers`/`draft`/`spec` are screen-level `useState`), so the
lock is PER-PHASE:
an in-screen `<Stack.Screen options={{ gestureEnabled: !inFlight }} />` is rendered in EVERY render
branch (incl. the boot-gate `CatalogStatus` branch, where the plan fetch is already in flight) so an
early return can't desync it, plus a single `BackHandler` effect routes Android back to the same
dialog while in-flight (`usePreventRemove` is still unavailable in expo-router ~56, per 027).
Confirming aborts the `AbortController` and rewinds per phase via a `genOrigin` flag held in
`useState` (NOT a ref — 004 bans reading `.current` in render): generating-initial→questions
(answers kept), refine→preview (draft kept), saving→preview, loading-plan→exit. All progress
setState happens in async stream callbacks / the back listener, never synchronously in an effect body
(004 set-state-in-effect).

## Keyboard-aware forms: decouple the inset from centering

`Screen` gained a `keyboardAware` prop that turns on `automaticallyAdjustKeyboardInsets`
independent of the existing `center` flag (which had bundled the two since work unit 023), so the
long intake form keeps every input + the Generate button reachable with the keyboard open.

## Deployment risk: SSE through the DO ingress is a GO/NO-GO, with a buffered fallback

Whether the DigitalOcean App Platform ingress (006) buffers `text/event-stream` responses, and
whether `expo/fetch` streams incrementally on a real native build under SDK 56, can only be proven on
a native EAS dev-client build (not in the dev sandbox). The unit was built streaming-first; the
documented NO-GO fallback is the pre-034 behavior — buffered JSON + an indeterminate "Working…"
state — with cancel still working via `AbortController` on the buffered request. Run the end-to-end
streaming spike before trusting on-device streaming.
