# 006-clerk-auth — follow-ups

Deferred, forward-looking items from this unit (none block ship).

## Polish (low priority)
- **apiFetch slash normalization.** `src/auth/api-fetch.ts` builds `${base}${path}`; if
  `EXPO_PUBLIC_API_URL` ever gains a trailing slash this yields `//api/...`. `${APP_URL}` has no
  trailing slash today, so latent. (Review F2.)
- **Friendlier auth error copy.** Screens surface Clerk's raw `error.message`; Clerk's
  `FieldError.longMessage` / curated per-code copy would read better. (Review F3.)

## Manual verification (post-deploy, requires real Clerk keys)
- Exercise the live signup → email-code verify → signin → forgot-password (reset code) round-trip
  against a Clerk dev instance. Out of automated-test scope (no provisioned keys in CI).
- Clerk dashboard prerequisite: enable **email address** identifier + **password** strategy, and
  the **`reset_password_email_code`** reset strategy. See `docs/deploy-digitalocean.md` §5.

## Suggested next unit (NOT auto-seeded)
- **Per-user data binding.** This unit's explicit NON-GOAL: the in-memory mock `DEFAULT_STATE`
  (`src/data/programs.ts`) is still shared/identical for every authenticated user. A follow-up
  should bind program/session/history state to the Clerk `userId` (persistence + per-user load).
  Left as a suggestion for the user to start deliberately, not seeded automatically.
