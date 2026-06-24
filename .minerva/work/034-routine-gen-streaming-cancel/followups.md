# Followups: routine-gen-streaming-cancel

Forward-looking items surfaced during 034. The first two are load-bearing — the streaming path is
unproven on a real device — and gate trusting the streaming behavior in production.

- **[GATING] Run the Task-1 GO/NO-GO streaming spike on a native EAS dev-client build.** The whole
  streaming path is UNVERIFIED on device. Confirm, on a real native build against the deployed
  server: (a) the DigitalOcean App Platform ingress ([[006-decision-digitalocean-app-platform-hosting]])
  does NOT buffer `text/event-stream` responses; (b) `expo/fetch` delivers body chunks incrementally
  on native under SDK 56; (c) `AbortController`/`request.signal` aborts the upstream OpenRouter call;
  (d) an EOF without a terminal `done` frame surfaces a recoverable error (not a freeze). **If any
  fail → switch the routes to the documented NO-GO fallback** (buffered JSON + an indeterminate
  "Working…" state; cancel still works via `AbortController`). Record the outcome.

- **[GATING] On-device verification of the device-pending success criteria.** Once the spike is GO:
  confirm on iOS + Android the live "Day N of N" / "Designed N questions" checklist, the keyboard
  reachability of the last intake input + Generate button, the iOS swipe / Android back lock while
  in-flight, and that confirming Cancel actually aborts the in-flight request.

- **Streaming resource-hygiene nits (review SUGGEST, low).** `stream-routine.ts` / `stream-llm.ts`
  do not call `reader.cancel()` on the abort/throw path (the runtime ties stream lifetime to the
  fetch abort, so inert today). `stream-routine.ts` concatenates multi-line `data:` frames without a
  separator — inert because the server emits single-line compact JSON per frame. Harden if either
  assumption changes.

- **Per-day name labels in the progress checklist (deferred enhancement).** The shipped checklist is
  count-based ("Day N of N"). The original Goal mentioned each day's *name*; capturing names would
  extend the tested `scan-progress` contract (collect each completed element's `name`) + the SSE
  payload + the client type for marginal UX gain. Deferred as non-load-bearing; revisit if desired.
