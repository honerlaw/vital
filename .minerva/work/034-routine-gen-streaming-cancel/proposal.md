# Proposal: routine-gen-streaming-cancel

**Date**: 2026-06-23
**Status**: Draft

## Goal

Make the AI workout-program generation flow feel responsive and escapable, and fix
the intake-form keyboard. Three coordinated changes to the routine-generation wizard
(`src/app/routine/new.tsx` and its three sibling server routes `/plan`, `/generate`,
`/refine`):

1. **Real SSE streaming progress** on the plan / generate / refine waits, shown as a
   structural checklist: generate & refine show "Day N of perWeek" plus each day's name as
   it streams in; plan shows a growing "Designed N questions" count. Today these phases
   render a single static line of text (`new.tsx:133-143`).
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

**Approach A — server-computed SSE.** Chosen (approach panel, 3/3) over a raw-token-proxy
variant that would duplicate the server mapper on the client and break the
server-owns-validation boundary of [[034-pattern-ai-routine-generation]] /
[[035-pattern-server-llm-integration]]; and over a buffered/time-based heuristic, excluded
by the user's explicit "real streaming + structural counts" direction.

### Sequencing — Task 1 is a GO/NO-GO streaming spike

A thin end-to-end SSE proof: a route emits timed `:`-heartbeat + tick frames; a **native
EAS dev-client build** ([[018-decision-eas-ios-release-workflow]]) consumes them via
`expo/fetch` and logs each as it lands. **GO/NO-GO criteria:** (a) frames arrive
incrementally on a native build (the DigitalOcean App Platform ingress,
[[006-decision-digitalocean-app-platform-hosting]], does not buffer the response); (b)
`request.signal` / `AbortController` aborts the upstream fetch; (c) an EOF without a
terminal frame is detectable by the client, so a dropped connection surfaces a recoverable
error rather than a frozen screen. **NO-GO fallback** (a fully accepted, shippable
outcome — not a re-vote trigger): keep the routes buffered JSON and show an indeterminate
"Working…" progress state; cancel still works via `AbortController` on the buffered
request, and the keyboard + cancel value still ship. The spike outcome is recorded in the
scratchpad.

### Server

- A **streaming `callLlm` variant** (`stream: true` on the OpenRouter Chat Completions
  call, yielding token deltas) with `request.signal` threaded into the upstream `fetch`.
- Each route handler order is **explicit**: `await requireAuth`
  ([[011-pattern-clerk-expo-core3-auth-and-endpoint-enforcement]]) → `await
  withinDailyLlmCap` → **then** construct and return the `text/event-stream` `Response`. A
  401 / 429 / 400 is a plain JSON `Response` emitted **before any stream bytes**.
- **Retry ownership.** The streaming route calls the streaming `callLlm` **directly** and
  owns a single non-streamed `callLlm` retry on end-of-stream parse/validation failure. It
  does **not** reuse `requestJson` (whose opaque internal retry would make the server fire
  up to 4 upstream calls while the client believes 2). `requestJson` is retained **only**
  for the NO-GO buffered fallback. `progress` events come only from the first streaming
  attempt; during the retry the client holds the last progress snapshot under "Tightening
  things up…"; a second failure emits a terminal `error`. (No mid-stream retry — the client
  never discards partial progress.)
- A **dedicated, unit-tested progress scanner** (string-literal / escape / unicode aware)
  that tracks brace/bracket **depth** to count completed elements of a single named
  **top-level** array per schema (`days[]` for generate/refine, `questions[]` for plan —
  correctly ignoring the nested `exercises[]` / `sets[]` / `progression` objects), and
  extracts the scalar `perWeek` early. It computes progress snapshots **only**, never
  validation. Node/tsx unit tests ([[012-pattern-src-unit-tests-node-tsx]]) cover the
  nested-object case, a `perWeek` value split across a chunk boundary (including mid-scalar,
  e.g. `"perWeek": ` / `3` — the scanner holds the incomplete token), and per-schema
  element counting.
- **SSE event protocol:** `progress` (structural snapshot) emitted as elements complete; a
  terminal `done` carrying the **fully validated + mapped** `Program` / `QuestionGraph`
  (reusing the existing server `mapLlmProgram` / `isQuestionGraph`); or a terminal `error`
  with a typed reason. Periodic `:` keep-alive heartbeats hold the connection through the DO
  ingress during long calls.

### Client

- A thin **`streamRoutine()` helper** using `expo/fetch` + `AbortController` (not
  `apiFetch`, which wraps the global `fetch` that cannot stream a native response body). To
  avoid duplicating auth, a small shared `authHeaders(getToken)` helper is factored out of
  `apiFetch` and used by **both** `apiFetch` and `streamRoutine`; `streamRoutine` composes
  the full URL via `apiBaseUrl()` independently (the extraction must not absorb the base-URL
  logic). It parses typed SSE frames (split on `\n\n`, read `data:` lines, ignore `:`
  keep-alive comments), yields progress snapshots, resolves with the final validated object,
  and surfaces a recoverable error on `error` or a non-terminal EOF.
- The three data-API functions (`fetchRoutinePlan` / `generateRoutine` / `refineRoutine`)
  become thin wrappers over `streamRoutine`; the client stays dumb (no validation/mapping).
- `apiFetch`'s `ApiFetchInit` is extended with an optional `signal?: AbortSignal` (used only
  by the NO-GO buffered fallback path).
- Per-chunk `setProgress` happens inside `streamRoutine`'s **async** stream-reading loop
  (awaited reads), never synchronously in a `useEffect` body — satisfying
  `react-hooks/set-state-in-effect` ([[004-pattern-expo56-react-compiler-hook-rules]]).

### Cancel / back UX

Modeled on the workout **guaranteed-exit recipe**
([[027-pattern-native-stack-headers-pushed-screens]]), adapted from a **static** lock to a
**per-phase dynamic** lock (legitimate here because `routine/new`'s `answers` / `draft` /
`spec` are ephemeral screen state, not reducer side-effects like the live workout).

- A reusable themed **`ConfirmDialog`** component (RN `Modal` + theme, its own file in
  `src/components/`). State-driven visibility; web/SSR-safe ([[016-pattern-ssr-safe-startup-hydration-gate]])
  because it renders nothing until opened and never touches `window` at render. This is the
  user's chosen themed alternative to the workout screen's `Platform`-branched
  `Alert` / `window.confirm`.
- A single derived **`inFlight`** boolean (true for `loading-plan` / `generating` /
  `saving`). A **Cancel** affordance on every in-flight loading screen opens the dialog.
- Smart per-phase rewind via a **`returnTo`** value held in **`useState`** (not `useRef` —
  [[004-pattern-expo56-react-compiler-hook-rules]] bans reading `.current` in the render
  body), set when a generation/save starts and read **only in the cancel handler**:
  `generating(initial)→questions` (answers kept), `generating(refine)→preview` (prior draft
  kept), `saving→preview`, `loading-plan→exit` wizard. `answers` / `draft` / `spec` already
  live in screen-level `useState` (`new.tsx:43-47`) and survive phase transitions — **no
  phase-machine refactor**.
- Confirming cancel aborts the in-flight `AbortController` (which aborts the upstream
  OpenRouter call) and applies the rewind.
- **iOS swipe-back + Android back are locked only while `inFlight`:** an in-screen
  `<Stack.Screen options={{ gestureEnabled: !inFlight }} />` element is rendered in **every**
  render branch (the "every branch" discipline of
  [[027-pattern-native-stack-headers-pushed-screens]], so an early return can't desync the
  option), and a single `BackHandler` effect (`react-native`; `usePreventRemove` is **not**
  exported by expo-router ~56 and `@react-navigation/native` is not installed — 027) returns
  `true` and routes to the same cancel-confirm flow while `inFlight`, written to the 004 hook
  rules. The `gestureEnabled` option name is v56-fragile → pin it against the v56 docs
  (AGENTS.md mandate).

### Keyboard

Add a **`keyboardAware`** prop to `Screen` that enables `automaticallyAdjustKeyboardInsets`
— the mechanism the centered auth forms already use (introduced in work unit 023, see the
`Screen.tsx:68-70` comment) — independent of `center`; apply it to the questions phase (the
`Screen` ScrollView already sets `keyboardShouldPersistTaps="handled"`). Decoupling the
existing combined `center` condition at `Screen.tsx:70` is a one-line change.

### File decomposition (strict single-declaration — [[001-constraint-strict-eslint-guardrails]] / [[002-pattern-eslint-strict-config-gotchas]])

`streamRoutine`, `authHeaders`, the progress scanner (+ its test), the streaming `callLlm`
variant, and `ConfirmDialog` each get their own file. SSE event types live with the other
routine types (type/data declarations are single-declaration-exempt, per 027).

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
