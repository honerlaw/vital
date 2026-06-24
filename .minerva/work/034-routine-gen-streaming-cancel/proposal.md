# Proposal: routine-gen-streaming-cancel

**Date**: 2026-06-23
**Status**: Shipped (2026-06-23) — streaming path UNVERIFIED on device; the on-device GO/NO-GO
streaming spike is still pending (see `followups.md`). All mechanically-checkable gates pass
(lint, typecheck, 110/110 tests).

## Goal

Make the AI workout-program generation flow feel responsive and escapable, and fix
the intake-form keyboard. Three coordinated changes to the routine-generation wizard
(`src/app/routine/new.tsx` and its three sibling server routes `/plan`, `/generate`,
`/refine`):

1. **Real SSE streaming progress** on the plan / generate / refine waits, shown as a
   structural checklist: generate & refine show a count-based "Day N of N" (N = the streamed
   `perWeek`); plan shows a growing "Designed N questions" count. (Per-day *name* labels were
   deferred — see `followups.md` — as a non-load-bearing trim; the criterion is count-based.)
   Previously these phases rendered a single static line of text.
2. **Cancel / back at any in-flight point**, gated by a reusable themed `ConfirmDialog`,
   with smart per-phase rewind that preserves the user's data and propagates the abort to
   the server's upstream OpenRouter call.
3. **Keyboard-aware intake form** so every input (and the Generate button) stays
   visible / scrollable / tappable while the keyboard is open.

## Why

- The three loading phases currently show one static line for multi-second (often 2–10s+)
  LLM calls — no progress signal, and no way out short of force-quitting
  (`new.tsx:133-143`). Users cannot tell whether the call is working or hung, and cannot
  back out.
- This is the UX-hardening pass on the wizard from [[034-pattern-ai-routine-generation]]
  built over the OpenRouter integration of [[035-pattern-server-llm-integration]].
- The intake keyboard covers the lower inputs: `Screen` enables keyboard insets only when
  `center` is set (`Screen.tsx:70`), and the questions screen is not centered — so on a
  12–18 question form the bottom inputs and the Generate button hide behind the keyboard.

## Approach

**What shipped (server-computed SSE — Approach A).** Chosen over a raw-token-proxy (would
duplicate the mapper client-side, breaking the server-owns-validation boundary of
[[034-pattern-ai-routine-generation]] / [[035-pattern-server-llm-integration]]) and a
buffered/time-based heuristic (excluded by the "real streaming + structural counts"
direction). The full durable design — SSE frame protocol, the progress-only partial-JSON
scanner, streaming retry ownership, `expo/fetch` + `AbortController` consumption with the
signal threaded to the upstream OpenRouter call, the per-phase dynamic gesture lock, and the
DO-ingress GO/NO-GO risk — is captured in
[[038-pattern-llm-sse-streaming-and-cancel]]. Summary of what landed:

- **Server.** A streaming `callLlm` variant (`stream-llm.ts`, `stream:true` + `request.signal`
  threaded upstream); each route (`plan`/`generate`/`refine`) runs `requireAuth` →
  `withinDailyLlmCap` → THEN returns a `text/event-stream` `Response` (`build-routine-stream.ts`),
  so 401/429/400 stay plain JSON. A unit-tested string/escape/unicode-aware depth scanner
  (`scan-progress.ts`) counts completed top-level array elements per schema (`days[]` /
  `questions[]`) + extracts `perWeek` early; it reports progress only — final validation stays
  server-side via `mapLlmProgram` / `isQuestionGraph`. Typed SSE frames: `progress` / `retry` /
  terminal `done` (validated+mapped) / terminal `error`, plus `:` keep-alive heartbeats. The
  streaming route owns its single non-streamed retry directly (NOT via `requestJson`, which would
  4× the upstream calls).
- **Client.** A thin `streamRoutine()` (`stream-routine.ts`) over `expo/fetch` + `AbortController`
  (RN global `fetch` can't stream a native body) parses the frames and forwards
  `onProgress` / `onRetry`; the three data-API functions became wrappers; a shared
  `authHeaders(getToken)` was extracted (used by both `apiFetch` and `streamRoutine`); `apiFetch`
  gained an optional `signal`.
- **Cancel / back.** A themed `ConfirmDialog` (RN `Modal`, web/SSR-safe); a derived `inFlight`
  flag; per-phase rewind via a `genOrigin` `useState` read only in the cancel handler
  (initial→questions, refine→preview, saving→preview, loading-plan→exit) — no phase-machine
  refactor (state already screen-level `useState`). Cancel aborts the `AbortController` (upstream
  OpenRouter call + the save POST). iOS swipe + Android back are locked only while `inFlight` via
  an in-screen `<Stack.Screen options={{ gestureEnabled: !inFlight }} />` rendered in EVERY branch
  (incl. the boot-gate) + a `BackHandler` effect (`usePreventRemove` unavailable in expo-router
  ~56), all written to the 004 hook rules.
- **Keyboard.** `Screen` gained a `keyboardAware` prop decoupling
  `automaticallyAdjustKeyboardInsets` from `center`; applied to the intake (`questions`) phase.
- **Deviation:** the progress checklist is count-based "Day N of N", not per-day *names* (deferred;
  `followups.md`). **Not verified on device:** the Task-1 GO/NO-GO streaming spike (DO buffering +
  native `expo/fetch`) is pending — see Status + `followups.md`; the NO-GO fallback is the
  pre-034 buffered behavior.

## Success criteria

- On a native dev build, generating a routine shows a checklist that advances as days
  stream in, reaching "Day N of N" where N == the streamed `perWeek`; refine shows the same;
  plan shows a growing "Designed N questions" count. (Or, on a NO-GO spike, an indeterminate
  "Working…" state on the buffered path.)
- A Cancel control on every in-flight screen opens the themed `ConfirmDialog`; confirming
  aborts the in-flight request (the upstream OpenRouter fetch receives the abort) and
  rewinds per phase: generating-initial→questions with answers intact; generating-refine→
  preview with the prior draft intact; saving→preview; loading-plan→exit to Programs.
- Android hardware back during an in-flight phase opens the same dialog; iOS swipe-back is
  disabled during in-flight phases; both are re-enabled outside in-flight phases.
- The progress scanner has node/tsx unit tests covering per-schema completed-element
  counting, a nested-object structure, and a `perWeek` value split across a chunk boundary
  (incl. mid-scalar); all green.
- Auth / rate-limit / parse failures degrade correctly: 401 / 429 / 400 arrive as plain
  JSON (not a stream); a plan failure still falls back to the fixed deterministic spine; a
  generate failure / terminal `error` shows the gen-error screen; a dropped connection (EOF
  without `done`) surfaces a recoverable error, not a frozen screen.
- With the keyboard open on the intake form, the last input and the Generate button can be
  scrolled into view and tapped on both iOS and Android.
- Lint + typecheck are clean under the strict guardrails (`--max-warnings 0`, no inline
  disable); existing routine tests still pass; the spike's GO/NO-GO outcome (and the buffered
  fallback if NO-GO) is recorded in the scratchpad.

## Open Questions

- DO App Platform SSE buffering and native `expo/fetch` streaming under SDK 56 — resolved by
  the Task-1 spike before scanner/UI work (NO-GO fallback defined).
- The exact `expo/fetch` streaming API and the per-phase `gestureEnabled` mechanism under
  Expo Router SDK 56 — verify against https://docs.expo.dev/versions/v56.0.0/ during
  implementation.
- Final SSE event field names / payload shapes (`progress` / `done` / `error`) — settle in
  implementation against the scanner + client helper.
