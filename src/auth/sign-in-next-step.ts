import type { useSignIn } from '@clerk/expo';

type SignInResource = ReturnType<typeof useSignIn>['signIn'];

export type SignInStatus = SignInResource['status'];
export type SignInSecondFactor = SignInResource['supportedSecondFactors'][number];

export type SignInNextStep =
  | { kind: 'finalize' }
  | { kind: 'verify-email-code' }
  | { kind: 'blocked'; message: string };

const GENERIC_BLOCKED_MESSAGE =
  'Sign-in could not be completed on this device. Please try again, or sign in on the web.';

/**
 * Maps a Clerk sign-in status to what the screen should do next. Core-3 signals methods
 * return `{ error: null }` on any 2xx — including responses that leave the sign-in at an
 * intermediate status where `createdSessionId` is null and `finalize()` THROWS (the
 * production crash this gate exists for; see proposal 020). The degradation fence:
 * `finalize` is returned for exactly the `complete` status, so screens that only finalize
 * on this helper's say-so can never hit that throw. The switch is exhaustive with no
 * default arm — a future Clerk status is a compile error, not a silent crash.
 *
 * `needs_client_trust` (device verification) is routed to the email-code step best-effort:
 * clerk-js routes it through the second-factor path for email links, which is suggestive
 * but unproven for email codes. If the attempt fails, the screen degrades to a readable
 * error — never `finalize()`.
 */
export function signInNextStep(
  status: SignInStatus,
  supportedSecondFactors: SignInSecondFactor[],
): SignInNextStep {
  switch (status) {
    case 'complete':
      return { kind: 'finalize' };
    case 'needs_client_trust':
      return { kind: 'verify-email-code' };
    case 'needs_second_factor':
      return supportedSecondFactors.some((factor) => factor.strategy === 'email_code')
        ? { kind: 'verify-email-code' }
        : {
            kind: 'blocked',
            message:
              'This account requires a second factor this app does not support yet. ' +
              'Please sign in on the web.',
          };
    case 'needs_new_password':
      return {
        kind: 'blocked',
        message: 'Your password needs to be reset. Use "Forgot password?" below.',
      };
    case 'needs_identifier':
    case 'needs_first_factor':
      return { kind: 'blocked', message: GENERIC_BLOCKED_MESSAGE };
  }
}
