# 020 — native sign-in survives intermediate Clerk statuses

## Status

Approved 2026-06-06 via `minerva:propose-ship-auto` consensus panels (scope 3/3,
approach 3/3, whole-proposal 3/3 — each after one revision round).

## Goal

Native sign-in never crashes on intermediate Clerk sign-in statuses. Users blocked by
an email-code second factor or device verification can complete sign-in inline; every
other blocked state degrades to a readable on-screen error plus a Sentry message
naming the status.

## Why

Production native login throws `Cannot finalize sign-in without a created session` —
clerk-js's `finalize()` throws when `createdSessionId` is null, and `sign-in.tsx:27`
calls `finalize()` unconditionally after `signIn.password()`, which returns
`{ error: null }` on any 2xx including those leaving the sign-in at an intermediate
status (`needs_second_factor`, `needs_client_trust`, `needs_new_password`, ...). The
debug session of 2026-06-06 confirmed the mechanism (Probable confidence); the
specific production status is unknown — the Sentry capture this unit adds will
confirm it. The same ungated `finalize()` exists at `forgot-password.tsx:50` and
`sign-up.tsx:45`.

## Approach

1. **Pure helper** `src/auth/sign-in-next-step.ts` (own file per the repo's custom
   `local/single-declaration` rule): exhaustive switch (no default arm — future Clerk
   statuses become compile errors, via a `never`-typed fallthrough, no casts) over the
   6-member `SignInStatus` union from the future-resource types. Signature:
   `(status: SignInStatus, supportedSecondFactors: SignInSecondFactor[]) → NextStep`
   where `NextStep = {kind:'finalize'} | {kind:'verify-email-code'} |
   {kind:'blocked', message:string}`. Mapping: `complete`→finalize;
   `needs_second_factor`→verify-email-code iff an `email_code` factor is in
   `supportedSecondFactors`, else blocked; `needs_client_trust`→verify-email-code
   (best-effort; fence absorbs failure); `needs_new_password`→blocked with message
   directing to forgot-password; `needs_identifier`/`needs_first_factor`→blocked
   generic.
2. **sign-in.tsx**: after `password()` resolves (never from initial hook state), run
   the helper. `finalize`→`signIn.finalize()`. `verify-email-code`→
   `signIn.mfa.sendEmailCode()` (error→degrade), flip to inline code-entry step (the
   `pendingVerification` idiom shipped in sign-up.tsx),
   `signIn.mfa.verifyEmailCode({ code })` (error→show message), then re-run the
   helper on the new status — finalize only on `finalize`. `blocked`→degrade.
3. **Degradation fence (BINDING acceptance criterion)**: screens call `finalize()`
   ONLY when the helper returns kind `finalize`, and the helper returns `finalize`
   for exactly the `complete` status — making the fence a pure, unit-testable
   property. Every blocked/error terminal path shows a readable error +
   `Sentry.captureMessage` naming the status, never `finalize()`. Negative tests
   explicitly cover `needs_client_trust` (returns `verify-email-code`, never
   `finalize`) and the all-non-complete-statuses property.
4. **forgot-password.tsx + sign-up.tsx**: gate their `finalize()` on
   `status === 'complete'` (sign-up uses the `SignUpStatus` union:
   `missing_requirements | complete | abandoned`); non-complete → readable error +
   `captureMessage`. No new UI (their flows already complete their own verification).
5. **Tests**: `src/auth/sign-in-next-step.test.ts` via node:test+tsx (existing repo
   pattern).

Implementer notes carried from panels: import the 6-member `SignInStatus` from the
future-resource types (`@clerk/expo` re-exports; NOT `@clerk/backend`'s different
4-member union); `supportedSecondFactors` is non-nullable on `SignInFutureResource`;
read status/factors only after the in-flight call resolves; `needs_client_trust`
recovery is best-effort.

## Success criteria

1. `npm run lint`, `npm run typecheck`, `npm test` all pass. (automated)
2. Helper unit tests cover all 6 `SignInStatus` members; property test: only
   `complete` yields `finalize`; `needs_client_trust` covered explicitly. (automated)
3. No `finalize()` call in `src/app/(auth)/` remains ungated (gated = helper-result
   check or `status === 'complete'`). (automated: grep)
4. sign-in.tsx renders the inline code-entry step when the helper returns
   `verify-email-code`. (manual-verify: confirmed by code review of the screen wiring)
5. Every degraded path shows an on-screen error AND calls `Sentry.captureMessage`
   naming the blocking status. (manual-verify: confirmed by code review of the screen
   wiring)
6. Post-deploy: Sentry confirms which status fires in prod. (manual, out of automated
   scope — recorded as followup)

## Open questions / logged limitations

- The `needs_client_trust`→mfa-email-code mapping is unverified upstream (clerk-js
  routes client trust through the second-factor path for email-link only —
  suggestive, not proof). The fence absorbs a wrong guess: those users degrade to a
  readable error instead of recovering inline.
- forgot-password with a 2FA account still dead-ends (degrades with message; no
  recovery UI there this unit).
- If the Clerk instance lacks email-code 2FA configuration, the verification UI is
  forward-provisioning; degradation covers those users.
- Which status actually fired in prod — answered post-deploy via the new Sentry
  signal.
