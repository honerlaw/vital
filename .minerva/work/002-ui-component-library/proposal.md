# 002 — VITAL UI component library + screens

## Status
Shipped (2026-05-31) — merged to `main` via PR #2. Gates green (lint `--max-warnings 0`,
`tsc --noEmit`, `lint:rules-test` 20/20); web export bundles all routes.

## What shipped (reconciliation outcomes)
Built exactly as planned below. Notable concrete outcomes worth recording:
- `theme.ts` → `src/theme.ts`: reflowed ~20 long lines (values byte-identical); the `type` export
  uses `satisfies Record<string, TextStyle>` (not `: Record<…>`) so `AppText`'s `variant` keeps its
  literal-key union. `programs.ts` → `src/data/{types,programs}.ts` + 11 per-helper engine files
  under `src/data/engine/` + barrel; free-function API preserved; `startSession` uses
  `Array.from({length},()=>false)` (avoids `any[]`).
- Rest timer is local (`useRestTimer` + `Animated` API), not in the reducer; `workout` is a
  top-level route outside `(tabs)` so the tab bar is hidden by route placement. (See
  `.minerva/knowledge/005-decision-vital-state-and-nav-boundaries.md`.)
- Hit the React-Compiler react-hooks rules (`react-hooks/refs`, `set-state-in-effect`) and the
  no-floating-promises / import-name-collision rules; techniques captured in knowledge 003 + 004.
- Added an `npm run typecheck` (`tsc --noEmit`) gate. `eslint.config.js` unchanged (guardrails
  intact). Durable knowledge promoted to `.minerva/knowledge/003..005`; deferred scope in
  `followups.md`.

## Goal
Implement VITAL's UI component library and **five** screens (Today, Programs, Program
detail, Workout, History) in the existing Expo SDK 56 / React Native app, wired to the
provided in-memory engine (`programs.ts`) and design tokens (`theme.ts`). **Mock data
only** — no API, auth, persistence, scheduling, or weight-logging (those are documented
follow-ups). Match the visual prototype (`vital-prototype.html`). All code passes the
repo's strict ESLint guardrails (work unit 001) **and** `tsc --noEmit`.

## Why
The repo is scaffolded but otherwise empty (a "Hello World" screen). The handoff defines a
complete, bounded design: 16 presentational components + 5 screens + an in-memory
rotation/cursor engine. Building it natively (not a WebView) produces a working prototype
of the core idea — "every program is an ordered list of day-templates that rotate, and your
next workout is a pointer that advances by one each finish." The engine and tokens are
provided and pure; this unit is the UI + state-wiring layer over them.

## Approach
Single work unit (the layers are dependency-closed: every component imports `theme`, every
screen imports the engine through one store; no independently-shippable sub-deliverable).

**1. Provided files, reconciled to the strict lint (zero semantic change).** The 001
guardrails bind all `.ts/.tsx` and are un-bypassable; the handoff's "drop in as-is" predates
them. So we adapt the files' *form* while preserving their *logic and public API*:
- `theme.ts` → `src/theme.ts`: reflow the ~20 lines over the 100-col cap (whitespace /
  wrapping only; every token value — colors, sizes, the per-weight font-family strings — is
  byte-identical). Verified by reading the diff (only line breaks added) + `tsc`.
- `programs.ts` → split for the one-declaration-per-file rule:
  - `src/data/types.ts` — all `type`/`interface` declarations (lint-exempt).
  - `src/data/programs.ts` — `PROGRAMS` + `DEFAULT_STATE` data consts (lint-exempt).
  - `src/data/engine/` — each of the 11 engine helpers (`getProgram`, `getNextWorkout`,
    `getUpcoming`, `advanceCursor`, `totalSets`, `estimateMinutes`, `startSession`,
    `toggleSet`, `sessionProgress`, `finishSession`, `cadenceDayLabel`) in its own file,
    re-exported through a barrel `src/data/engine/index.ts` (re-exports are exempt). The
    free-function public API is preserved verbatim. Cross-file deps (`finishSession` →
    `getProgram`, `advanceCursor`) import through the barrel or sibling files.
  - Zero-semantic-change is confirmed by `tsc --noEmit` + an import smoke test that all 11
    names resolve and the screens compile against them.

**2. State: React Context + `useReducer`** (no new dependency, per handoff). Files:
- `src/state/actions.ts` — the action union `type` (exempt).
- `src/state/reducer.ts` — the reducer function (wraps the pure engine helpers).
- `src/state/app-context.ts` — `createContext` holding `{ state, dispatch }`.
- `src/state/StateProvider.tsx` — the provider component (`useReducer` + context).
- `src/state/useAppStore.ts` — the consumer hook.

Actions: `START_WORKOUT(dayIndex)`, `TOGGLE_SET(ei, si)`, `FINISH_WORKOUT`,
`CANCEL_WORKOUT`, `SET_ACTIVE_PROGRAM(id)`. `finishSession(state)` returns
`{ log, nextCursor }` and does not mutate; the `FINISH_WORKOUT` handler prepends `log`,
sets `cursor = nextCursor`, and clears `live`. `dispatch` from `useReducer` is stable, so
callbacks are not re-created per render. (Note: `finishSession`'s non-active-program cursor
branch is unreachable in the current screen flow — "Begin" always starts the active
program — but the engine handles it correctly either way; documented so reviewers don't
flag it.)

**3. Rest timer is LOCAL UI state, not in the global reducer.** A `useRestTimer` hook (own
file) owns `{ visible, seconds }`. The Workout screen calls `restTimer.start(90)` when a set
toggles ON. The countdown uses functional updates (`setSeconds((s) => s - 1)`) so there is
no stale closure; it auto-hides at 0. The interval id and the `Animated` value live in
`useRef` (compiler-safe under `reactCompiler: true`), with cleanup on unmount. `RestTimerBar`
slides up via the **`Animated` API** (JS-driven `translateY`) — deliberately not Reanimated,
avoiding any worklet→JS boundary for the auto-hide.

**4. Sixteen components, one file each** under `src/components/`: `AppText`, `Screen`,
`Button`, `Tag`, `CornerCard`, `StatRow`, `RowItem`, `SetChip`, `ProgressBar`,
`ExerciseBlock`, `RestTimerBar`, `ProgramCard`, `HistoryRow`, `BackLink`, `TabBar`,
`EmptyState`. Presentational; all visual values from `theme`. Pure helpers/hooks
(`useRestTimer`, `formatTime` mm:ss, the corner-bracket style builder, the Today
date-eyebrow formatter, the History date formatter) each get their own file.

**5. One-function/component-per-file discipline (hard lint rule).** No screen or component
may declare a second top-level function. Inline helpers (`renderItem`, `keyExtractor`, a
bracket builder, a `.map` callback) must either live inside the component body, be a
non-function value, or be extracted to their own file. No inline functional sub-components
(`react/no-multi-comp` with `ignoreStateless: false`).

**6. Navigation: expo-router**, everything under `src/` and imported via the `@/*` alias
(tsconfig maps `@/* → ./src/*`; this is the actual scaffold layout — it overrides the
handoff §7's root-level paths).
- `src/app/_layout.tsx` — loads the exact font weights `theme.ts` references via
  `@expo-google-fonts` behind an `expo-splash-screen` gate; wraps `SafeAreaProvider` +
  `StateProvider` + a root `Stack` registering `(tabs)`, `program/[id]`, and `workout`.
- `src/app/(tabs)/_layout.tsx` — `Tabs` with the custom `TabBar`.
- `src/app/(tabs)/index.tsx` (Today), `programs.tsx`, `history.tsx`.
- `src/app/program/[id].tsx` (detail), `src/app/workout.tsx` as a **top-level stack route
  outside `(tabs)`** so the tab bar is naturally hidden during a live workout.

**7. Install:** `npx expo install @expo/vector-icons expo-font @expo-google-fonts/archivo
@expo-google-fonts/jetbrains-mono`. (`@expo/vector-icons` is **absent** from this scaffold —
verified `require.resolve` throws — so it must be installed explicitly; `expo-splash-screen`
and `react-native-safe-area-context` are already deps.) Use Feather icons.

**8. Ship gates.** Add an `npm run typecheck` script (`tsc --noEmit`). Because
`typedRoutes: true` generates `.expo/types` (included by tsconfig), generate router types
before the typecheck (run the expo type-gen / a brief `expo` invocation) so typed
`router.push` targets resolve; otherwise they fall back to `string`, which still
typechecks. Cross-check the `useFonts` weight map against the `font.*` strings in
`theme.ts` (load all seven: Archivo 400/500/600/700 + JetBrainsMono 400/500/700) — a missing
weight is a silent fallback font caught by no other gate. The full gate before ship is
`npm run lint` (`--max-warnings 0`) + `npm run typecheck` + `npm run lint:rules-test`.

## Success criteria
1. App launches (web + iOS simulator) with fonts loaded behind the splash gate; no crash.
   The `useFonts` weights exactly match `theme.ts`'s `font.*` family strings.
2. All 16 components exist as individual presentational files reading `theme` tokens; visual
   parity with the prototype (Archivo + JetBrains Mono type, hairline dividers, single green
   `#0D8348` accent used only for action/active/done/live, corner brackets via four
   absolutely-positioned bordered `View`s).
3. **Today**: date eyebrow (`label` style); `CornerCard` with program label, next day name,
   a `StatRow` (exercise count / total sets / est-minutes), and a "Begin" `Button` →
   Workout; an "Up next" section with 3 `RowItem`s from `getUpcoming(program, cursor, 3)`
   each showing a `cadenceDayLabel`.
4. **Programs**: a `ProgramCard` for all 5 `PROGRAMS`; the active one is accent-styled; tap
   → Program detail.
5. **Program detail**: `BackLink`, tag, title, blurb, meta, and one cycle block per
   `WorkoutDay`; "Set as my program" sets `activeProgramId`, resets `cursor` to 0, returns
   to Today; "Currently active" is disabled when it is already active.
6. **Workout**: `ProgressBar` from `sessionProgress`; an `ExerciseBlock` per exercise;
   tapping a `SetChip` calls `toggleSet` and (on turn-ON) shows the `RestTimerBar` counting
   down from 90s; "Finish & log" is disabled until ≥1 set is done, then `finishSession`
   prepends the history log, advances the cursor, clears `live`, and returns to Today; the
   tab bar is hidden while live; "Cancel" discards the live session.
7. **History**: a `HistoryRow` per `SessionLog` newest-first (date formatted from `dateISO`),
   or an `EmptyState` when none.
8. `npm run lint` (`--max-warnings 0`) **and** `npm run typecheck` (`tsc --noEmit`) **and**
   `npm run lint:rules-test` all pass. No `any`, no casts (except `as const`), no inline
   disables, ≤100-col lines, one function/component per file.

## Review focus
- `src/state/reducer.ts` — immutability + the finish/cursor transition.
- `src/app/workout.tsx` — the toggle → rest → finish loop.
- `src/components/RestTimerBar.tsx` + `src/hooks/useRestTimer.ts` — the only timer/animation.

## Open questions
- `new Date()` in mock logs (`finishSession`, `cadenceDayLabel`) is non-deterministic —
  acceptable for a mock pass.
- `cadenceDayLabel` is an acknowledged placeholder for the real scheduling model — rendered
  as-is.
- Visual/animation fidelity (corner brackets, rest-bar slide, splash timing, tab-hiding) is
  eyeball-verified against `vital-prototype.html`; lint + tsc prove conformance and
  compilation, not appearance.
