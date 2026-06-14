# Knowledge overview

<!-- synthesis-watermark: 033 -->

Synthesized 2026-06-05 (work 011, refreshed in works 012–016, 020, 022, 024 and 029).
Theme-grouped navigation over the corpus; the entries remain the source of truth.

## Strict lint guardrails — the constraint everything is written under

All TypeScript is bound by an un-bypassable `eslint . --max-warnings 0` gate: no `any`, no casts,
100-column lines, one function per file, no inline suppression
([[001-constraint-strict-eslint-guardrails]]). Standing up that config has its own gotchas
([[002-pattern-eslint-strict-config-gotchas]]), and a body of technique exists for writing code
that conforms from the start — since work 020 including hook-derived resource types and the
cast-free exhaustive-switch idiom ([[003-pattern-conforming-code-under-strict-guardrails]]) —
for the React-Compiler-era hook rules — refs in render, setState-in-effect, and re-run-key deps
that must be read inside the effect ([[004-pattern-expo56-react-compiler-hook-rules]]) — and for
keeping a dynamic `app.config.ts` lint-clean ([[008-pattern-dynamic-app-config-strict-lint]];
revised by work 013 — the guarded `config.extra` spread is now load-bearing, not forbidden).

## App architecture — state, navigation, and startup hydration

`AppState` is the serializable user domain (active program / per-program cursors / history / live session);
ephemeral UI like the rest timer stays out of the reducer, and full-screen flows are top-level
routes rather than tabs ([[005-decision-vital-state-and-nav-boundaries]]). The program catalog
and the per-user state are hydrated from the API at startup behind an SSR-safe render-gate with
explicit loading/ready/error statuses (combined readiness since work 012) and, since work 011,
an in-app retry primitive ([[016-pattern-ssr-safe-startup-hydration-gate]]). Per-user state —
active program, per-program cursors, workout history — persists in Postgres bound to the Clerk
userId, with a fire-and-forget write-through over the authoritative local reducer
([[017-pattern-per-user-state-persistence]]). Since work 015 each program keeps its own rotation
position in a `cursors` jsonb map (switching never zeroes progress, and cancelling a workout that
committed a switch reverts it losslessly), shipped as an additive-then-cutover migration with a
one-release tolerant-reader wire contract ([[020-pattern-per-program-cursors]]); 017's
scalar-cursor schema/contract passages and 019's adjacent-dispatch switch mechanism were
rewritten accordingly. Since work 014, a null active program is a
first-class "never chose" signal that survives hydration — the Today screen renders a first-run
chooser, switching programs is gated on starting a workout, and null must short-circuit BEFORE
every catalog-membership check ([[019-pattern-null-active-program-first-run]]); the re-point /
null-fallback claims in [[016-pattern-ssr-safe-startup-hydration-gate]] and
[[017-pattern-per-user-state-persistence]] are narrowed accordingly (scoped ⚠ markers). Since
work 021 the pushed screens carry chrome-only native stack headers, and a screen whose every
exit must dispatch (the live workout) follows a four-piece guaranteed-exit recipe — static
gesture/back locks at the navigator, header chrome in every render branch, an inline
`headerLeft` arrow, and `BackHandler` routed through the same cancel path
([[027-pattern-native-stack-headers-pushed-screens]]); work 029 then moved the workout's day-name
title INTO that native bar (the eyebrow that blocked a native title was removed app-wide) and
swapped the bare "Cancel" text for a chevron + a cross-platform, SSR-safe confirm dialog
(`Platform.OS === 'web' ? window.confirm : Alert.alert`, reached only inside the event/BackHandler
callback) — the four-piece recipe itself unchanged. On iOS the tab bar is the native `UITabBar`
with Liquid Glass, confined there behind a Metro platform fork (`AppTabs.ios` via NativeTabs vs the
custom bar everywhere else, since web NativeTabs is SSR-unstable and Android would lose the brand
bar) — glass is a property of the UIKit control, not a backdrop veneer
([[031-pattern-ios-native-tabs-liquid-glass]]). That native overlay bar reshaped the shared
`Screen`'s bottom padding: a `flushBottom` opt-in pins content one design margin above the
relative-flow Android/web bar, but is gated OFF on iOS where the overlay needs its inset restored
([[032-pattern-screen-flushbottom-tabbar-inset]]). Since work 022 a workout records
per-set weight and actual reps end to end: all numeric coercion lives in the pure `updateSet`
engine (preserving 017's reducer/wrapper mirror), the catalog's `×` scheme separator is
U+00D7 (an ASCII-x parser silently no-ops prefill), and prefill is placeholder +
commit-on-toggle, never clamping a typed value ([[028-pattern-per-set-log-tracking]]).
Since work 024 the weight placeholder resolves through a three-rung fallback chain — typed
in-session prior set, then the user's last logged weight from history, then blank — with
deliberately asymmetric qualification (in-session inherits any typed weight; history trusts
only done sets) coalescing in `ExerciseBlock` so `SetRow` stays fallback-source-agnostic,
and the derivation is a plain const after the render gates because a `useMemo` there would
violate hook ordering ([[030-pattern-cross-session-weight-prefill]]). Since work 023 the
Settings tab's generated avatar derives a WCAG-AA-safe background color deterministically
from the user's email ([[029-pattern-wcag-safe-generated-avatar-colors]]). Work 029's green
hero card surfaced the sibling contrast trap on the inverse surface: text ON an accent fill
must be OPAQUE white (a translucent label blends toward the fill and fails AA), so dim
secondary text with size/weight and reserve translucency for non-text dividers
([[033-pattern-inverted-on-accent-surface]]).

## Data layer — Postgres as the single source of truth

Postgres with plain-SQL `node-pg-migrate` migrations is the durable store
([[009-decision-postgres-node-pg-migrate]]), applied in production by a pre-deploy job
([[010-pattern-do-app-platform-migrations]]). Server-side access from Expo API routes uses a lazy
pool, `unknown` rows, and cast-free mappers ([[014-pattern-server-pg-access-expo-routes]]). The
catalog was originally dual-sourced (TS constant + DB seed) under a generated-seed byte-equality
drift guard ([[015-pattern-generated-seed-drift-guard]]) — that window closed when work 010 made
the DB the sole runtime source. Workout history gained a per-set log in work 022: a `set_log`
jsonb wrapper (`{"unit","exercises"}`, `'{}'` = no data) denormalized per row so a future unit
toggle needs no backfill, written through the same single-statement CTE with a strict-writer /
tolerant-reader asymmetry — the POST 400s on malformed set data while BOTH read boundaries
(server mapper, client sanitizer) degrade per entry instead of letting one corrupt blob brick
boot, and the route re-projects to known fields because guards validate but don't strip
([[028-pattern-per-set-log-tracking]]).

## Hosting & delivery — DigitalOcean for web/API, EAS for iOS releases

The app self-hosts web + API on DO App Platform ([[006-decision-digitalocean-app-platform-hosting]])
via an Express host around the Expo Router server build ([[007-pattern-expo-router-server-self-host]]).
CI runs build/test/lint on every PR and needs no expo-router typegen step
([[006-pattern-ci-no-typegen-needed]]). iOS releases are orchestrated from GitHub Actions since
work 016: every merge to main first mirrors the `EXPO_PUBLIC_*` vars from Doppler prd into the
EAS production environment (upsert-only — stale keys need manual pruning), then triggers the
EAS build+submit workflow via `eas workflow:run`, which uploads the checkout so the EAS
GitHub-app link is unnecessary ([[021-decision-gh-actions-ios-release-orchestration]],
superseding in part [[018-decision-eas-ios-release-workflow]]). 018's caveats still bite: EAS
builds can't see Doppler/DO env (a missing `EXPO_PUBLIC_*` value means a green-but-dead-on-arrival
binary — the sync's two-key assert guards this), and submit lands in TestFlight, not public
release. A green "Release iOS" run means queued, not released — EAS notifications are the build
red signal. Brand assets ride a one-master-SVG pipeline: every icon surface is rasterized
locally by a lockfile-safe (`--no-save`, pinned) script, validated pre-merge by an
`expo prebuild` gate, with the committed PNGs as the artifacts
([[022-pattern-icon-asset-pipeline]]). The toolchain itself can split green-CI from red-EAS:
npm 11 writes lockfiles npm 10 rejects, so EAS pins node to match `.nvmrc` (EAS does NOT honor
`engines`/`.nvmrc` on its own) and lockfile regeneration is npm-major-sensitive
([[024-bug-npm10-npm11-lockfile-divergence]]).

## Observability — crashes, silent hangs, and the green-but-dead class

The worst production failures here threw nothing: TestFlight build 5 white-screened because
Clerk's `load()` failed silently and `isLoaded` never flipped — release builds hide the SDK's
`__DEV__`-only diagnostics ([[023-bug-clerk-isloaded-boot-hang]]). Hence Sentry crash reporting
plus a startup watchdog that fires when the splash never hides, with milestone breadcrumbs
recorded from effects ([[025-pattern-sentry-observability-wiring]]): a DSN-less build is
blocked by the release workflow's required-keys guard (green-but-blind), while a token-less
build merely ships unsymbolicated. The same instrument now names blocked sign-in statuses
(`captureMessage` on every degraded auth path) so production data — not guesswork — identifies
which intermediate Clerk status actually fires ([[026-bug-clerk-finalize-intermediate-status]]).

## Auth & environment

Clerk (core-3 `@clerk/expo`) provides the auth flows, with per-route endpoint enforcement via an
opt-in `requireAuth` ([[011-pattern-clerk-expo-core3-auth-and-endpoint-enforcement]]). Two
version-fragile Clerk traps are on record: `isLoaded` stuck false reads as a silent blank screen
([[023-bug-clerk-isloaded-boot-hang]]), and Core-3 methods returning `{ error: null }` at
intermediate sign-in statuses — where `createdSessionId` is null and an ungated `finalize()`
THROWS — crashed native login until work 020 gated every `finalize()` behind a unit-tested
status fence ([[026-bug-clerk-finalize-intermediate-status]]). Local dev
env vars come from the Doppler CLI, with the local Postgres hardcoded in Docker Compose
([[013-decision-doppler-local-env]]); production iOS build-time env lives in EAS but is
auto-mirrored from Doppler prd on every release
([[021-decision-gh-actions-ios-release-orchestration]]). Unit tests run offline via
`node --import tsx --test` over `src/**/*.test.ts` ([[012-pattern-src-unit-tests-node-tsx]]).

## Limitations

The `synthesis-watermark` is a new-scope-only floor: it attests synthesis intent at entry 033, not
body content — in-place edits to already-synthesized entries do not move it, and a stale body with
a current watermark is not detectable mechanically. Entries promoted after this synthesis count as
un-synthesized until the next refresh. Note: the corpus carries two entries numbered 006 (a
decision and a pattern) — a pre-conventions artifact; links here use full stems, so navigation is
unambiguous.
