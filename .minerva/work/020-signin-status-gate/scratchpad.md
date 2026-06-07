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
