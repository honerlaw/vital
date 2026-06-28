# Pattern: per-user equipment profile — a shared closed vocabulary + LLM photo pass-through

- Type: pattern
- Date: 2026-06-28
- Work unit: 042-equipment-profile-photo-scan
- Related: [[035-pattern-server-llm-integration]] (the LLM client this widens for vision and whose
  `llm_usage` cap it reuses), [[034-pattern-ai-routine-generation]] (the consumer — equipment now
  pre-fills the intake instead of being asked), [[016-pattern-ssr-safe-startup-hydration-gate]] (the
  boot gate this adds a 4th per-user fetch to), [[017-pattern-per-user-state-persistence]] (the
  single-row-per-user upsert + `requireAuth` shape this mirrors), [[014-pattern-server-pg-access-expo-routes]]
  (the lazy-pool / `UnknownRow` / cast-free row-mapper shape), [[028-pattern-per-set-log-tracking]]
  (strict-writer / tolerant-reader — the asymmetry below is the closed-vocabulary form of it)

How VITAL persists a per-user **closed vocabulary** (workout equipment) and feeds it both to
generation and to an **image-analysis feature that stores no images** (042).

## A closed vocabulary is ONE static module, shared by client + server + prompt

`src/data/equipment-catalog.ts` is the single source of truth: `EQUIPMENT_CATALOG` (grouped
`{id,label}` items), `EQUIPMENT_LABELS` (id→label), `CANONICAL_EQUIPMENT_IDS` (the membership set).
It is pure data (no functions, so it imports cleanly on both client and server) and carries **no DB
seed** — the canon is UI-facing data that evolves in code, not rows. The same module backs the client
picker (`EquipmentPicker`, shared by the Settings screen and the routine intake), the server
write-validator (`isEquipmentUpdate`), and the LLM scan prompt (`equipment-scan-prompt.ts`). One
definition means the three trust boundaries can't drift.

## Strict-write, lenient-read on an enumerated field (domain-agnostic)

For any persisted enumerated/closed-vocabulary field: validate the **write** strictly against the
canon, but read **leniently**. Here `isEquipmentUpdate` (PUT body) rejects any non-canonical id with
a 400 (the strict-writer discipline of 028); `isEquipmentProfile` (GET/scan response) and
`rowToEquipmentProfile` (DB read) validate `string[]` only and do NOT re-check canon membership. The
asymmetry is deliberate: retiring an id from the catalog later must not brick an existing profile's
hydration — the picker simply filters unknown ids out at render. (Open followup: purge retired ids on
read so they don't 400 the *next* Save.)

## LLM photo-scan is pure pass-through — images are never written to DB, disk, or logs

The scan analyzes user photos without ever storing them:

- The client downscales each picked image to ~1024px longest edge as JPEG via
  `expo-image-manipulator` (`downscale-image.ts`) **before** upload — this keeps the request body
  small and cuts the vision model's token cost to a fraction of a full-resolution camera shot. Only
  a transient OS-cache copy is produced (never the media library); the original is untouched.
- `call-llm.ts` was widened from `user: string` to `user: string | LlmContentBlock[]` — ONE function
  preserved (the single-declaration rule) — so the same client carries OpenAI-compatible `image_url`
  blocks (base64 `data:` URLs) to the multimodal model (`claude-sonnet-4.5` via OpenRouter, which
  forwards image blocks unchanged).
- `me-equipment-scan.ts` holds the bytes only in memory for the call, returns canon-filtered ids
  (`parse-scanned-equipment` drops any hallucinated/off-list id), and **never writes the image to the
  DB, to disk, or to logs** (the `console.error` paths log the error object only). The scan **reuses
  the existing `llm_usage` daily cap** (035) and bounds image count + total body size defensively.
- The Settings scan passes an `AbortSignal` and aborts on unmount (the 034 routine-flow discipline),
  so navigating away mid-scan can't keep burning a daily LLM slot.

## The profile REPLACED the intake's equipment question

Equipment used to be a coarse 6-option multi-select question in the intake graph. It was removed from
**both** `fixed-spine.ts` and the planner prompt (`plan-prompt.ts` now explicitly says "do NOT ask
about equipment"). Instead the saved profile **boot-hydrates** (a 4th `StateProvider` fetch +
`equipmentStatus` in `bootStatus`, same gated shape as the other per-user fetches) and pre-fills an
`EquipmentPicker` inside the routine intake. Edits there are **local-only** (no write-back to the
profile — only the Settings Save dispatches `SET_EQUIPMENT`); `buildSpec` injects the selection as
readable canon labels, omitted entirely when empty (matching the old empty-multi-select behavior).
