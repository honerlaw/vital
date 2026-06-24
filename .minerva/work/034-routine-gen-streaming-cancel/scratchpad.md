# Scratchpad: routine-gen-streaming-cancel

> **Ephemeral working memory.** Most of what lands here is noise — small
> decisions that don't matter, dead ends, momentary confusion. At feature
> completion, run `minerva:promote`: significant items get promoted to
> `.minerva/knowledge/`, `proposal.md` gets updated to match reality, and
> the raw scratchpad is archived.

## Panel decisions 2026-06-23

- [3/3 accept] scope check (revision round): single work unit — three changes share one
  AbortController/SSE backbone, one phase-machine screen, three sibling routes; no shippable
  seam. (Round 1 was 2/3 — Skeptic's revise was proposal-completeness, not decomposition;
  folded the completeness fixes into scope and re-voted to 3/3.)
- [3/3 accept] approach selection (revision round): Approach A (server-computed SSE) over B
  (raw-proxy + client-side parse/validate, rejected — duplicates the mapper, breaks
  server-owns-validation 034/035) and C (buffered/heuristic, excluded by user direction).
  Round 1 was 2/3 (Skeptic revise: scanner rigor / retry-in-stream contract / auth
  sequencing); revised to fold those in (streaming-only-progress retry held under
  "Tightening things up…", unit-tested depth scanner, explicit auth→cap→stream ordering,
  SSE keep-alive) → 3/3.
- [3/3 accept] whole-proposal acceptance (revision round): full Goal/Why/Approach/Success/
  Open-Questions accepted. Round 1 was 1/3 (Skeptic + Arbiter revise) over three load-bearing
  gaps; resolved against knowledge 027 + 004 and re-voted to 3/3:
  - swipe/back lock → in-screen per-phase `<Stack.Screen options={{ gestureEnabled: !inFlight }} />`
    in every branch + single `BackHandler` effect (usePreventRemove unavailable in
    expo-router ~56, per 027); adapted from 027's static workout lock.
  - streaming retry → streaming route calls `callLlm` directly and owns ONE non-streamed
    retry; does NOT reuse `requestJson` (avoids up-to-4 upstream calls); `requestJson` kept
    for the NO-GO buffered fallback.
  - `returnTo` → `useState` (not `useRef`), read only in the cancel handler (004).

## Panel concerns (carry into implementation)

- Scope Skeptic: verify `answers`/`draft`/`spec` persist across phase transitions before
  relying on the no-refactor rewind. (Pre-verified: `new.tsx:43-47` are screen-level
  `useState` untouched by `setPhase`.)
- Approach Skeptic (round 2): make EOF-without-`done` (transport drop) an explicit spike
  GO/NO-GO criterion → client surfaces a recoverable error, not a freeze. Scanner counts a
  single named top-level array per schema; nested-case unit test. `perWeek` chunk-boundary
  unit-test fixture (incl. mid-scalar split).
- Whole-proposal Skeptic (round 2): `authHeaders` extraction must NOT absorb `apiBaseUrl()`
  logic — `streamRoutine` needs the full URL. NO-GO spike outcome is a fully-accepted
  shippable result, not a re-vote trigger. ConfirmDialog SSR-safety needs no special guard
  beyond `Modal visible={false}` initial state.

## Implementation task order (from proposal)

1. GO/NO-GO streaming spike (server timed ticks → native expo/fetch consumer). Record outcome.
2. Server: streaming `callLlm` variant + `authHeaders` extraction + per-route auth→cap→stream
   ordering + the unit-tested progress scanner + SSE event protocol + retry ownership.
3. Client: `streamRoutine()` helper + data-API wrappers + `apiFetch` signal passthrough.
4. Cancel/back UX: `ConfirmDialog`, `inFlight`/`returnTo` state, per-phase rewind, in-screen
   `<Stack.Screen>` gesture lock + `BackHandler`.
5. Keyboard: `Screen` `keyboardAware` prop on the questions phase.
6. Verify success criteria on a native build; lint/typecheck/tests.
