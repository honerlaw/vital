# 010 — followups

Forward work deliberately deferred out of this unit.

## T1 — In-app retry on the catalog error screen (review F1)

When the startup `GET /api/programs` fetch fails (or returns an empty catalog), the app shows the
`CatalogStatus` error view ("REOPEN THE APP TO RETRY") and `StateProvider`'s empty-deps mount effect
won't re-run — so a **transient** failure strands the user until a full app restart. Add a
`RETRY_HYDRATE` path (reset `programsStatus` to `loading` and re-run `fetchPrograms`) plus a retry
control on the error view. The proposal deferred this as a v1 followup
([[016-pattern-ssr-safe-startup-hydration-gate]] notes it as the pattern's current cost).

## T2 — Persistence of `activeProgramId` / `cursor` / `history` (cross-reference)

Still out of scope; **already tracked** — see `002-ui-component-library/followups.md` (wrap reducer
state in `AsyncStorage`/`expo-sqlite`) and `006-clerk-auth/followups.md` (bind per-user state to the
Clerk `userId`). New wrinkle from 010: the `HYDRATE_PROGRAMS` normalization + the `SET_ACTIVE_PROGRAM`
in-catalog guard already future-proof `activeProgramId` against a persisted id that's absent from a
later catalog, so the persistence work can rely on that invariant rather than re-deriving it.
