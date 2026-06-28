# Proposal: equipment-profile-photo-scan

**Date**: 2026-06-28
**Status**: Shipped (2026-06-28)

## Goal

Add a **durable, per-user workout equipment profile** built on a **strict controlled vocabulary** (~25-40 canonical items, no free text). Users manage it from a **dedicated Settings sub-screen** (grouped picker, editable anytime) and can populate it via an **always-available photo-scan**: the client downscales and sends image(s) to a server route that passes them through the OpenRouter multimodal model (`claude-sonnet-4.5`), which returns **only canonical equipment ids** — **images are never stored** (pure pass-through). The saved profile **replaces** the routine generator's old coarse equipment question: it is injected into generation and pre-fills an inline intake editor that is **overridable per-generation without write-back**.

## Why

- **Re-entry friction**: equipment is re-typed in every routine intake today, with no persistence.
- **Too coarse**: the current 6-option equipment question (`barbell/dumbbells/machines/cables/kettlebell/bodyweight`) gives the LLM weak signal; a precise canon yields better routines and enables future exercise substitution.
- **Onboarding friction**: typing an inventory is tedious; snapping photos of a gym/home setup is far faster.
- **Durable reuse**: a first-class equipment profile is reusable across features (routine generation now; programs, substitutions, coaching later) rather than trapped in one-off intake answers.

## Approach

Approach 1 — static canon constant + dedicated `user_equipment` table.

**Canonical vocabulary**
- `src/data/equipment-catalog.ts` — static constant: ordered categories (free weights, racks/benches, machines, cables, cardio, bodyweight/accessories), each item `{ id, label }`, ~25-40 items. Plus a `CANONICAL_EQUIPMENT_IDS` set + `isCanonicalEquipmentId(x)` guard. Imported by client picker, server validator, and the scan prompt — single source of truth, evolvable in code (no DB seed).

**Data layer**
- Migration `user_equipment(clerk_user_id text PRIMARY KEY, items jsonb NOT NULL DEFAULT '[]', updated_at timestamptz NOT NULL DEFAULT now())` — additive, follows the food-log migration pattern.
- Types + cast-free guards: `EquipmentProfile { items: string[] }`; `isEquipmentProfile`; an update-payload guard that rejects any non-canonical id and bounds array length. Row mapper validates the JSONB column cast-free.

**Server routes** (one function per file, `requireAuth`, `query`)
- `GET /api/me/equipment` → `{ items }` (empty array when no row).
- `PUT /api/me/equipment` → upsert; rejects 400 if any id ∉ canon.
- `POST /api/me/equipment/scan` → body `{ images: string[] }` (base64 data URLs); enforces a defensive body-size ceiling; checks/increments the existing `llm_usage` daily limiter; builds a multimodal message embedding the canon list, calls the vision model, parses the returned ids, **filters to canon** (drops unknowns), returns `{ items }`. **No persistence of images or results.**
- `call-llm.ts` extended to accept multimodal `content` blocks (`string | ContentBlock[]`) while preserving the existing string path; `model.ts` / env untouched (`OPENROUTER_API_KEY`, `claude-sonnet-4.5`).

**Client**
- `fetch-equipment.ts`, `update-equipment.ts`, `scan-equipment.ts` (mirror food-log api fns, validate responses via guards).
- `useEquipmentProfile` hook (reads boot-hydrated slice + `reload`).
- **Boot hydration**: 4th parallel fetch in `StateProvider`, new `HYDRATE_EQUIPMENT` action + state slice; boot readiness waits on it.
- **Settings sub-screen** `src/app/settings/equipment.tsx`: grouped checklist picker over the canon; **"Scan photos"** → `expo-image-picker` (camera + library, multi-select) → client downscale (~1024px longest edge, JPEG) → POST scan → **confirm/edit checklist** of suggested ids → merge (set-union) into selection → **Save** (PUT). Settings tab gets a "Manage equipment" row → `router.push`.

**Routine intake integration**
- Remove the `equipment` question from `fixed-spine.ts` and from the planner instruction in `plan-prompt.ts`.
- In `src/app/routine/new.tsx`: render a pre-filled rich-canon equipment editor (seeded from the hydrated profile), edits **local-only**; `buildSpec` appends an `equipment` `IntakeAnswer` (rich canon labels) from the current selection. `generate-prompt.ts` unchanged (renders the answer generically). Empty selection → equipment omitted (today's behavior).

**Native / config**
- Add `expo-image-picker` via `npx expo install` (SDK-56-compatible pin; respects the lockfile-heal discipline). Configure camera + photo-library permission strings and the picker plugin in app config. Requires a **dev-client rebuild** before the feature runs on device.

**Shipped as (delta from design):**
- Implemented exactly as designed, with two additive refinements surfaced during work:
  - Added **`expo-image-manipulator`** (alongside `expo-image-picker`) to perform the named client-side downscale (~1024px JPEG) before upload — the concrete mechanism for the proposal's "client downscale" line.
  - The Settings scan passes an **`AbortSignal`** and aborts on unmount, so leaving mid-scan can't keep consuming a daily LLM slot (matches the 034 routine-flow cancel discipline).
- Durable patterns captured in `.minerva/knowledge/042-pattern-equipment-profile-and-vision-passthrough.md`. Non-blocking follow-ups recorded in `followups.md`.

## Success criteria

- A user with no saved equipment can open the Settings equipment screen, **scan photos**, review the suggested canonical items, edit, and **Save** — the profile persists across app restarts.
- The scan endpoint returns **only canonical ids** (non-mappable items dropped); manual picker selections are likewise constrained to the canon.
- **No image bytes** are ever written to disk, DB, or logs; the scan route holds them only in memory for the pass-through call.
- Scans are **counted against the `llm_usage` daily limiter**; exceeding it returns the same limit response `/generate` uses.
- The routine intake **no longer shows the coarse 6-option question**; it shows an equipment editor **pre-filled from the saved profile**. Editing it for one generation **does not** mutate the saved profile.
- The generated routine's prompt reflects the (possibly-overridden) equipment selection; an empty selection omits equipment without blocking generation.
- `npm run lint` and `npm run typecheck` (or the project's strict equivalents) pass — cast-free guards/mappers, one-function-per-file, no `any`/casts.
- `npm ci` + `expo export -p web` succeed (lockfile integrity preserved after adding `expo-image-picker`).

## Open Questions

- **Exact canon contents** — the precise ~25-40 item list and category grouping finalized during work (seeded from common home + commercial gym gear).
- **OpenRouter multimodal request shape** — confirm `claude-sonnet-4.5` accepts `image_url` content blocks with base64 **data URLs** via OpenRouter, and the practical per-image size / count ceiling. (High confidence it is supported; verify empirically when wiring `call-llm.ts`.)
- **Downscale parameters** — final longest-edge px / JPEG quality tuned against extraction accuracy vs. token cost.
- **Scan prompt robustness** — exact instruction + output format (e.g. strict JSON id array) to maximize canon-mapping accuracy and resist non-equipment photos.
- **Defensive body-size ceiling** — concrete byte limit for the scan request (safety guard, since a tight product cap was intentionally not adopted).
