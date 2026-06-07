# Bug: ungated finalize() crashes native sign-in at intermediate Clerk statuses

- Type: bug
- Date: 2026-06-06
- Work unit: 020-signin-status-gate
- Related: [[011-pattern-clerk-expo-core3-auth-and-endpoint-enforcement]] (the Core-3 flows
  this hardens — its "methods don't throw" fact now carries the finalize() carve-out),
  [[023-bug-clerk-isloaded-boot-hang]] (sibling Clerk failure class: silent SDK behavior a
  release build surfaces brutally), [[025-pattern-sentry-observability-wiring]] (the
  captureMessage instrument the fix uses to name the real prod trigger),
  [[003-pattern-conforming-code-under-strict-guardrails]] (the hook-derived-types +
  cast-free-exhaustiveness techniques the fix's helper uses)

Production native login crashed with `Cannot finalize sign-in without a created session`
(clerk.native.js `ra#finalize`, thrown from `sign-in.tsx`'s submit). Mechanism, confirmed
against `@clerk/expo@3.3.1` / `clerk-js@6.14.0`:

- Core-3 signals methods (`password()`, `verifyEmailCode()`, `submitPassword()`, ...)
  return `{ error: null }` on ANY 2xx — **including responses that leave the sign-in at an
  INTERMEDIATE status** (`needs_second_factor`, `needs_client_trust`,
  `needs_new_password`, ...). [[011]]'s "check `result.error`" idiom is necessary but NOT
  sufficient: error-free ≠ session created.
- `createdSessionId` is `null` unless `status === 'complete'`, and `finalize()` **THROWS**
  (it does not return `{ error }`) when `createdSessionId` is null. On its other failure
  paths `finalize()` does return `{ error }` — the fix handles that return at all 4 call
  sites too.

The fix (the **degradation fence**, unit-tested in `src/auth/sign-in-next-step.test.ts`):
screens call `finalize()` only on the say-so of `src/auth/sign-in-next-step.ts`, and that
helper returns `finalize` for exactly the `complete` status — a property test over the
full 6-member `SignInStatus` union enforces this. `needs_client_trust` and
`needs_second_factor`-with-an-`email_code`-factor route to an inline
`signIn.mfa.sendEmailCode()` / `verifyEmailCode()` step (sign-up's two-step idiom); every
other blocked state degrades to a readable on-screen error + `Sentry.captureMessage`
naming the status — the instrument that will identify which status actually fires in
prod. The helper's exhaustiveness is the shipped explicit-return-type + closed-switch
mechanism (see [[003]]), so a future Clerk status is a compile error, not a crash.

Caveat kept verbatim from the proposal: the `needs_client_trust`→email-code mapping is an
upstream GUESS (clerk-js routes client trust through the second-factor path for
email-link only — suggestive, not proof). The fence absorbs a wrong guess: those users
degrade to a readable error instead of recovering inline, and never crash.
