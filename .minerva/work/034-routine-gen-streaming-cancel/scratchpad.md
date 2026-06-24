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
- [3/3 accept] completion verification (revision round): all 7 success criteria met or honestly
  disclosed device-pending; mechanical gates green (110/110 tests, lint, typecheck). Round 1 was 2/3
  (Skeptic found two MEDIUM code bugs via a 66-tool audit: `onSave` missing retry reset; cancel
  during save didn't abort the POST). Both fixed (commit e9d99ea, + cancellable retry + shared-type
  import); re-voted 3/3 with both panelists confirming the fixes in-file and no new defects.

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

## Review triage 2026-06-23

Inline structured review (no PR yet) across code-quality / spec-fidelity / knowledge-compliance:
5 findings, ALL low (0 high, 0 medium).
- [skipped — small] per-finding triage panel: all findings low-severity (evidence: review returned
  0 high / 0 medium / 5 low) → triage decided directly per the taxonomy skip rule.
- FIX #3: `gestureLock` was missing from the boot-gate (CatalogStatus) early return → iOS swipe was
  briefly unlocked during a cold deep-link while the plan fetch is in flight. Moved `gestureLock`
  above the gate and rendered it in that branch too (027 every-branch discipline). [fixed]
- FIX #4: scratchpad miscounted scanner tests as 8; actual 7. [fixed]
- SUGGEST #1: `reader.cancel()` not called on the abort path in stream-routine.ts / stream-llm.ts —
  resource hygiene only (expo/fetch + node fetch tie stream lifetime to the abort); deferred.
- SUGGEST #2: multi-line `data:` frames would concatenate without a separator — server controls the
  wire format (single-line compact JSON), so inert today; deferred.
- IGNORE #5: a `retry` frame may be enqueued after a client abort — the enqueue try/catch guard
  swallows the closed-controller case.
Knowledge compliance: clean against 001/002/004/005/016/027/034/035 (verified by the reviewer).

## Implementation task order (from proposal)

1. GO/NO-GO streaming spike (server timed ticks → native expo/fetch consumer). Record outcome.
2. Server: streaming `callLlm` variant + `authHeaders` extraction + per-route auth→cap→stream
   ordering + the unit-tested progress scanner + SSE event protocol + retry ownership.
3. Client: `streamRoutine()` helper + data-API wrappers + `apiFetch` signal passthrough.
4. Cancel/back UX: `ConfirmDialog`, `inFlight`/`returnTo` state, per-phase rewind, in-screen
   `<Stack.Screen>` gesture lock + `BackHandler`.
5. Keyboard: `Screen` `keyboardAware` prop on the questions phase.
6. Verify success criteria on a native build; lint/typecheck/tests.

## Implementation outcome 2026-06-23

Files added: `src/server/llm/scan-progress.ts` (+`.test.ts`, 7 tests), `src/server/llm/stream-llm.ts`,
`src/server/llm/build-routine-stream.ts`, `src/auth/auth-headers.ts`, `src/data/stream-routine.ts`,
`src/components/ConfirmDialog.tsx`.
Files changed: the 3 routine routes (→ SSE), the 3 data-API wrappers (→ streamRoutine), `apiFetch`
(authHeaders + optional signal), `Screen` (`keyboardAware` prop), `src/app/routine/new.tsx` (streaming
progress UI, cancel/ConfirmDialog, per-phase rewind, gesture lock + BackHandler, keyboardAware form).

Verification (mechanically run here):
- `npm test` → 110/110 pass (incl. 7 new scanner tests: nested objects, chunk-boundary + mid-scalar
  perWeek, string-embedded braces, escaped quotes, empty/absent array, monotonic prefix scan).
- `npm run typecheck` → clean (incl. expo/fetch streaming response types under SDK 56).
- `npm run lint` → clean (`--max-warnings 0`; conformed to single-declaration by inlining helpers,
  004 hook rules by `genOrigin`-as-state + abort ref touched only in handlers/effects + setState only
  in async/listener callbacks).

NOT verifiable in this environment (require the user's native EAS dev-client build + a live
OPENROUTER_API_KEY + DB; flagged at Phase 2 start):
- Task-1 GO/NO-GO spike: DO-ingress non-buffering + native expo/fetch incremental delivery + EOF
  detection. Code wired for GO; NO-GO fallback is essentially today's behavior (static loading text).
- On-device success criteria: live streaming checklist, keyboard reachability, iOS swipe / Android
  back lock, upstream-abort-on-cancel.
- Local SSE curl was NOT run: the routes are auth-gated (Clerk) + need a live OPENROUTER_API_KEY and
  Postgres; a faithful curl isn't reproducible here without those secrets.

Deliberate divergence (judged NOT load-bearing → no replan panel): the progress checklist shows a
count-based "Day N of N" (N = streamed `perWeek`) rather than each day's *name*. The proposal's
Goal/Approach mentioned day names, but capturing them would change the tested scanner contract + SSE
payload + client type for marginal UX gain; the success criterion is count-based ("Day N of N where
N == perWeek"), which the implementation meets. Logged for the review phase.
