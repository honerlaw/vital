# 020 — followups

Kept at promote (2026-06-06); each is forward-looking work, not durable knowledge.

1. **Back/resend affordance on the verify steps.** Once `verifying`/`codeSent`/
   `pendingVerification` flips, there is no Back or resend-code control — a user who
   mistyped their email or never received the code is stranded until app restart. The
   gap is shared by sign-in (new step), sign-up, and forgot-password — candidate small
   shared fast-follow. (Review finding #1, triaged SUGGEST.)
2. **Tighten the `needs_client_trust` degradation path once prod data lands.** The
   mapping to `mfa.sendEmailCode()` is an upstream guess; on rejection users currently
   see the raw Clerk error. The new `Sentry.captureMessage` events name the blocking
   status — once they identify the real prod trigger, replace the guess with the
   verified method and friendlier copy. (Review finding #2, triaged SUGGEST.)
3. **Post-deploy confirmation (proposal SC#6).** Check Sentry for
   `sign-in blocked at status "..."` events after release to confirm which intermediate
   status actually fires in production, and append the answer to
   [[026-bug-clerk-finalize-intermediate-status]].
