# Knowledge overview

<!-- synthesis-watermark: 016 -->

First synthesis (2026-06-05, work 011). Theme-grouped navigation over the corpus; the entries
remain the source of truth.

## Strict lint guardrails — the constraint everything is written under

All TypeScript is bound by an un-bypassable `eslint . --max-warnings 0` gate: no `any`, no casts,
100-column lines, one function per file, no inline suppression
([[001-constraint-strict-eslint-guardrails]]). Standing up that config has its own gotchas
([[002-pattern-eslint-strict-config-gotchas]]), and a body of technique exists for writing code
that conforms from the start ([[003-pattern-conforming-code-under-strict-guardrails]]), for the
React-Compiler-era hook rules — refs in render, setState-in-effect, and re-run-key deps that must
be read inside the effect ([[004-pattern-expo56-react-compiler-hook-rules]]) — and for keeping a
dynamic `app.config.ts` lint-clean ([[008-pattern-dynamic-app-config-strict-lint]]).

## App architecture — state, navigation, and startup hydration

`AppState` is the serializable user domain (active program / cursor / history / live session);
ephemeral UI like the rest timer stays out of the reducer, and full-screen flows are top-level
routes rather than tabs ([[005-decision-vital-state-and-nav-boundaries]]). The program catalog is
hydrated from the API at startup behind an SSR-safe render-gate with an explicit
loading/ready/error status and, since work 011, an in-app retry primitive
([[016-pattern-ssr-safe-startup-hydration-gate]]).

## Data layer — Postgres as the single source of truth

Postgres with plain-SQL `node-pg-migrate` migrations is the durable store
([[009-decision-postgres-node-pg-migrate]]), applied in production by a pre-deploy job
([[010-pattern-do-app-platform-migrations]]). Server-side access from Expo API routes uses a lazy
pool, `unknown` rows, and cast-free mappers ([[014-pattern-server-pg-access-expo-routes]]). The
catalog was originally dual-sourced (TS constant + DB seed) under a generated-seed byte-equality
drift guard ([[015-pattern-generated-seed-drift-guard]]) — that window closed when work 010 made
the DB the sole runtime source.

## Hosting & delivery — DigitalOcean App Platform

The app self-hosts web + API on DO App Platform ([[006-decision-digitalocean-app-platform-hosting]])
via an Express host around the Expo Router server build ([[007-pattern-expo-router-server-self-host]]).
CI runs build/test/lint on every PR and needs no expo-router typegen step
([[006-pattern-ci-no-typegen-needed]]).

## Auth & environment

Clerk (core-3 `@clerk/expo`) provides the auth flows, with per-route endpoint enforcement via an
opt-in `requireAuth` ([[011-pattern-clerk-expo-core3-auth-and-endpoint-enforcement]]). Local dev
env vars come from the Doppler CLI, with the local Postgres hardcoded in Docker Compose
([[013-decision-doppler-local-env]]). Unit tests run offline via `node --import tsx --test` over
`src/**/*.test.ts` ([[012-pattern-src-unit-tests-node-tsx]]).

## Limitations

The `synthesis-watermark` is a new-scope-only floor: it attests synthesis intent at entry 016, not
body content — in-place edits to already-synthesized entries do not move it, and a stale body with
a current watermark is not detectable mechanically. Entries promoted after this synthesis count as
un-synthesized until the next refresh. Note: the corpus carries two entries numbered 006 (a
decision and a pattern) — a pre-conventions artifact; links here use full stems, so navigation is
unambiguous.
