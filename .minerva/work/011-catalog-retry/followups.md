# 011 — followups

## Seed for 012-per-user-state-persistence (transient)

> **Transient handoff buffer:** these constraints were pinned by 011's scope panel for the next
> unit. Once `012-per-user-state-persistence/proposal.md` exists, that proposal is the canonical
> copy and this section reduces to a pointer.

Four binding scope constraints (panel-accepted 2026-06-05):

1. **Persist current semantics only.** One global cursor (resets to 0 on program switch, exactly
   as today); migration = single-row `user_state` keyed by `clerk_user_id`
   (`active_program_id`, `cursor`) + append-only `workout_sessions` history rows. Per-program
   cursor memory is a product-semantics change → its own followup, not smuggled into persistence.
2. **Server-side Postgres is the primary store; AsyncStorage rejected** (recorded rationale:
   history must follow the Clerk identity across devices/web; device-local dies with reinstall;
   web localStorage vs native AsyncStorage forks behavior; the server stack + patterns already
   exist — knowledge 009/010/011/014). AsyncStorage viable later as an offline cache layer.
3. **Single combined render-gate.** The user-state fetch gets its own status in `AppState` but
   feeds the same gate placeholder; the app area waits for catalog AND user state; SSR-safe per
   knowledge 016 (effects don't run during SSR); reuses 011's retry primitive for both fetches.
4. **v1 write-through is best-effort fire-and-forget.** Local reducer state stays authoritative
   for the session; failed writes log and drop; an offline-durable queue is a followup.

Skeptic design notes to honor in 012's proposal:
- Key the user-state fetch on Clerk `isLoaded && isSignedIn` (avoid a spurious 401 burning a
  retry on cold launch).
- Hydrated user-state passes through the same activeProgramId-in-catalog normalization as
  `HYDRATE_PROGRAMS`.
- `active_program_id` is a **soft reference** — no DB FK to `programs` (FK would fight the seed
  migration and cascade-delete user rows).
- Pick the v1 column layout knowing the per-program-cursor followup will need an additive
  migration.
- Decide one shared vs two independent retry statuses (catalog vs user state) at design time.

## Diverted product followups (not 012 scope)

- **Per-program cursor memory** — switching programs and back currently loses your place
  (cursor resets to 0, and 012 will persist that reset). Restoring a per-program cursor is a
  deliberate product change with its own table shape.
- **Offline-durable write queue** — v1 write-through may drop a finished session if the device
  is offline at FINISH_WORKOUT and the app dies before reconnect.
