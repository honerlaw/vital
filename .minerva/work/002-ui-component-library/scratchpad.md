# Scratchpad — 002-ui-component-library

## Panel decisions 2026-05-31
- [2/3 accept, arbiter revise → corrected] scope check: single unit confirmed by all 3;
  corrected "4 screens" → FIVE (History tab + EmptyState + HistoryRow on the finish-workout
  critical path); named lint-reconciliation as a task; review-focus = reducer/workout/RestTimerBar.
- [revise → folded] approach selection: Approach A (reconcile drop-ins to strict lint;
  Context+useReducer; one-concern-per-file) chosen over B (Zustand — unneeded dep) and C
  (eslint exemption — guts the 001 un-bypassable guardrail). Folded in: rest timer is LOCAL
  state (useRestTimer hook, not reducer) with functional-update countdown + Animated API (no
  Reanimated worklet boundary); add `tsc --noEmit` ship gate; font-weight cross-check;
  zero-semantic-change verification of the programs.ts split. Non-blocking note: an
  `export const engine = {...}` object-of-arrows is also lint-legal (fallback if the 11-file
  split proves excessive).
- [1/3 accept → revised → folded] whole-proposal acceptance: Proponent accept; Skeptic +
  Arbiter revise (design sound, fold in verified gaps). All revise conditions met before
  proceeding (treated as conditional-accept):
    - HIGH: `@expo/vector-icons` is ABSENT from this scaffold (verified require.resolve throws)
      → added to the install step. Handoff's "ships with expo" was false here.
    - HIGH: pin the `src/`-rooted layout + `@/*` alias (overrides handoff §7 root-level paths).
    - MEDIUM: typed-routes — generate `.expo/types` before `tsc` or router.push falls back to string.
    - MEDIUM: one-function-per-file discipline for screen-local helpers (no top-level helper
      arrows; no inline sub-components).
    - MEDIUM: reactCompiler-safe timer (useRef for Animated value + interval id, cleanup).
    - LOW (cleared): engine API fully covers screens; reducer applies {log,nextCursor}+live:null;
      History date formatted from dateISO in its own formatter file.

Run total so far: 9 panel agents (3 panels × P/S/A), 0 user escalations.

## Implementation log
- Installed `@expo/vector-icons` (was absent), `expo-font`, `@expo-google-fonts/archivo`,
  `@expo-google-fonts/jetbrains-mono`. Verified font exports `Archivo_{400,500,600,700}` +
  `JetBrainsMono_{400,500,700}` match `theme.ts` `font.*` strings exactly.
- `theme.ts` → `src/theme.ts`: reflowed ~20 long lines (whitespace only); switched the
  `type` annotation from `: Record<string, TextStyle>` to `satisfies Record<string, TextStyle>`
  so `AppText` gets literal `variant` keys (runtime values unchanged).
- `programs.ts` split: `src/data/types.ts`, `src/data/programs.ts` (PROGRAMS + DEFAULT_STATE),
  11 engine helpers each own file under `src/data/engine/` + barrel `index.ts`. Public
  free-function API preserved. tsc confirms all names resolve.
- State: `src/state/{actions,reducer,app-context,StateProvider,useAppStore}`.
- 16 components in `src/components/`, hooks/utils in `src/hooks` + `src/utils`.
- Screens: `src/app/_layout.tsx` (fonts+splash+providers+Stack), `(tabs)/_layout.tsx`
  (custom TabBar), `(tabs)/{index,programs,history}.tsx`, `program/[id].tsx`, `workout.tsx`
  (top-level route → tab bar hidden while live).

### Lint/compiler fixes during work (no replan — routine)
- `startSession`: `Array(n).fill(false)` inferred `any[]` → `Array.from({length}, () => false)`.
- `RestTimerBar`: `useRef(new Animated.Value()).current` tripped `react-hooks/refs`
  (RC rule) → lazy `useState(() => new Animated.Value())`.
- `useRestTimer`: synchronous `setState` in effect body tripped `react-hooks/set-state-in-effect`
  → moved decrement + auto-hide into the deferred `setTimeout` callback (seconds in deps,
  no stale closure).
- `AppText`: default `theme` import collided with named `theme`/`type` exports
  (`import/no-named-as-default*`) → `import * as theme`.
- `TabBar`: `@react-navigation/bottom-tabs` is vendored inside expo-router, not re-exported by
  name → derived props type via `Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0]`.

### Verification evidence (pre-completion-panel)
- `npm run lint` (`--max-warnings 0`): PASS (exit 0).
- `npm run typecheck` (`tsc --noEmit`): PASS (clean).
- `npm run lint:rules-test`: PASS (20/20).
- `npx expo export --platform web`: PASS — 935 modules bundled, React Compiler on, all 10
  routes statically rendered (`/`, `/workout`, `/program/[id]`, `(tabs)/*`) with no
  render-time crash.
