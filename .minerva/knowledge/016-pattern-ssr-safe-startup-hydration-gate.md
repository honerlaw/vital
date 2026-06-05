# Pattern: SSR-safe hydrate-at-startup render-gate for an async-loaded global

- Type: pattern
- Date: 2026-06-01
- Work unit: 010-async-catalog-cutover
- Related: [[004-pattern-expo56-react-compiler-hook-rules]] (the hook-ordering rule this composes
  with), [[011-pattern-clerk-expo-core3-auth-and-endpoint-enforcement]] (the Clerk splash hold it
  layers under), [[005-decision-vital-state-and-nav-boundaries]] (what belongs in `AppState`),
  [[014-pattern-server-pg-access-expo-routes]] (the route this hydrates from),
  [[015-pattern-generated-seed-drift-guard]] (the dual-source window this cutover closed).

How VITAL moved the program catalog from a synchronous in-memory constant to data fetched from
`GET /api/programs` at startup, **without** an SSR 500 and without making the pure reducer async.
Reusable for any global that must be async-loaded once at startup (catalog, user prefs, flags).

## The shape

- **State carries the data + an explicit status.** `AppState` gained `programs: Program[]` and
  `programsStatus: 'loading' | 'ready' | 'error'` (initial: `[]` + `'loading'`). The status is a
  first-class value, not an `Array.length === 0` inference — an empty payload is ambiguous (see
  empty→error below) and the renderer must branch on a status the server can also see.
- **A provider's client-only mount effect hydrates.** `StateProvider`'s `useEffect(fetch → dispatch
  HYDRATE_PROGRAMS / HYDRATE_PROGRAMS_ERROR, [])` runs once. The reducer stays pure and synchronous —
  no fetch in the reducer; it only folds the already-fetched array into state.
- **A render-gate holds the data-dependent screens until `ready`.** A small presentational
  `CatalogStatus` renders a loading/error placeholder. It is shown by the **segment layout**
  (`(tabs)/_layout.tsx`) for grouped routes, and by an **early-return in each standalone route**
  (`program/[id].tsx`, `workout.tsx`) that lives outside that layout and is reachable by web
  deep-link. The hook (`useAppStore`) sits **above** the early return ([[004-...]]).

## Why it is SSR-safe (the load-bearing part)

Web runs `web.output: "server"` — every route SSR-renders per request, and **`useEffect` does not run
during SSR**. So the server render always observes `programsStatus: 'loading'` → the gate renders the
placeholder → no screen ever calls the throwing `getProgram` on an empty catalog → no 500. The client
then hydrates: the effect fetches, status flips to `ready`, the real screens render. The gate is the
*primary* protection for the **client transient window** (after Clerk loads, before the catalog
hydrates); on the server it's belt-and-suspenders with the Clerk splash hold ([[011-...]]).

## Placement rules (where the gate must and must NOT go)

- **Pin it to the data readers, never above auth.** The gate lives inside the `(tabs)` group + the two
  standalone program routes — it must **not** wrap `RootNavigator` or the `(auth)` group, or it would
  block signed-out login/signup and SSR a loading shell for the login page. A session-less SSR request
  renders `(auth)` (per [[011-...]]), so the protected screens don't server-render anyway.
- A layout returning a non-navigator element (placeholder instead of `<Tabs>`) keeps its child route
  screens from mounting — that's what gates the whole group with one guard.

## Two invariants that keep the trusted lookups total

- **Empty payload → `error`, not `ready`.** `HYDRATE_PROGRAMS` maps `programs.length === 0` to
  `'error'` so the gate shows the error view instead of a `ready` screen resolving an absent active
  item and throwing. (A working server that returns `[]` is a misconfiguration, not a UX state.)
- **Keep the active-selection id in the catalog.** `HYDRATE_PROGRAMS` re-points `activeProgramId` to
  the first item if the persisted id isn't present, and `SET_ACTIVE_PROGRAM` **no-ops** on an id absent
  from the catalog (it rejects, it does not re-point — re-pointing would silently override a valid
  user choice). Together these guarantee the trusted `getProgram(programs, id)` (which throws on miss)
  is never called with an absent id on a `ready` catalog. Untrusted ids (a route param) use a
  non-throwing `programs.find(...)` + a not-found view instead.

## Cost

Web's first paint for the data screens is now a brief loading placeholder (the catalog is no longer
in the bundle). Acceptable here because those screens are auth-gated and never carried meaningful
SSR content. The pattern originally shipped with a second cost: no in-app retry, so a transient
fetch failure stranded the user on the error view until an app reopen.

> ⚠ **Retry closed in 011 (2026-06-05).** Work unit 011-catalog-retry retired the no-retry cost.
> The primitive: a `RETRY_HYDRATE` action the reducer accepts **only** from `'error'`
> (→ `'loading'`), and the hydrate effect became **status-keyed** — the body opens with
> `if (state.programsStatus !== 'loading') return;` and the deps are `[state.programsStatus]`.
> Mount and error→loading are the only edges into `'loading'`, so a refetch can never race an
> in-flight fetch. The status guard *reads* its dep; an unread re-run-key dep (the originally
> drafted `hydrateAttempt` counter) is a hard `react-hooks/exhaustive-deps` error under
> `--max-warnings 0`, which is what forced status-keying over a counter — the generalized rule
> lives in [[004-pattern-expo56-react-compiler-hook-rules]]. Reverting the effect deps to `[]`
> is itself lint-caught (verified by mutation during 011's review), so the retry wiring carries a
> regression guard even though the end-to-end tap-through stays a manual check.
