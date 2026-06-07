# 020 — signin-status-gate · scratchpad

## Log 2026-06-06

- Invoked via `minerva:propose-ship-auto`. Pre-flight: 003-dev-start-skill is Draft
  but unrelated (no slug/goal overlap); no worktrees in flight — proceeded.
- Seed: debug session same day diagnosed the native sign-in crash (Probable):
  ungated `finalize()` after `signIn.password()` at intermediate sign-in statuses.

## Panel decisions 2026-06-06

- [3/3 accept after 1 revision] scope check: single unit — revision baked in the
  de-risking (exhaustive helper, supportedSecondFactors-aware branching, degradation
  fence so the crash fix never depends on the unverified client-trust mapping)
- [3/3 accept after 1 revision] approach selection: option B (gate + fenced inline
  verification) — rejected: A (gate-only — dead-ends blocked users), C (dedicated
  verification route/state machine — overbuilt). Revision promoted the fence to a
  BINDING acceptance criterion with a negative test, corrected the helper signature
  to non-nullable supportedSecondFactors, and named two limitations
  (forgot-password+2FA dead-end; forward-provisioned email-code UI)
- [3/3 accept after 1 revision] whole-proposal acceptance — revision relabeled SC#4/
  SC#5 as manual-verify and corrected the lint-rule citation to
  local/single-declaration
- Carried implementer notes: negative test must exercise needs_client_trust
  specifically; import SignInStatus from the future-resource types (not
  @clerk/backend); read status/factors only after the call resolves;
  needs_client_trust recovery is best-effort

## Implementation log 2026-06-06

- Types derived from the hook (`ReturnType<typeof useSignIn>['signIn']`) instead of
  importing `@clerk/shared/types` directly — app code only ever imports `@clerk/expo`,
  and the derived union is identical (6 members) while staying version-proof and
  avoiding a transitive-dep import.
- Exhaustiveness mechanism: explicit `SignInNextStep` return type + no default arm —
  a missing case fails tsc ("lacks ending return statement") with no `never` cast
  needed, satisfying assertionStyle 'never'.
- `finalize()` returns `{ error }` too (typed) — handled at all 4 call sites rather
  than fire-and-forget.
- Gates green: lint ✓ typecheck ✓ test ✓ (51 pass, 6 new). Grep confirms all
  finalize() call sites gated (sign-in via helper kind, forgot-password/sign-up via
  status === 'complete').

## Panel decisions 2026-06-06 (work phase)

- [3/3 accept] completion verification: both panelists re-ran the gates
  independently; Arbiter mutation-tested the fence (mapping needs_new_password to
  finalize → property test FAILS; deleting a switch case → TS2366 compile error
  under strict alone, no noImplicitReturns needed). Logged low concerns: proposal
  prose said "never-typed fallthrough" but exhaustiveness is via explicit return
  type + closed switch (cosmetic drift); SC#3's grep is performed manually, not
  scripted; needs_client_trust mapping stays an upstream guess absorbed by the
  fence.
