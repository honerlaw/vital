/**
 * Reads the Clerk publishable key for the client. `EXPO_PUBLIC_*` vars are inlined into the
 * bundle at build time (see [[008-pattern-dynamic-app-config-strict-lint]] / .do/app.yaml), so
 * this must be a static property access. The `any`-typed value is narrowed through `unknown`
 * + `typeof` rather than asserted (no casts), matching the app.config.ts origin pattern.
 *
 * Returns '' when unset; `ClerkProvider` validates the key, so a missing/blank key surfaces as
 * a clear provider error rather than a silent miss.
 */
export function getPublishableKey(): string {
  const raw: unknown = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return typeof raw === 'string' ? raw : '';
}
