import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

/**
 * Initializes Sentry for NATIVE builds only and reports whether it did — the returned
 * boolean gates the startup watchdog (start-boot-watchdog.ts), so the watchdog never
 * fires into an uninitialized client.
 *
 * Web/SSR is deliberately out of scope: `web.output: "server"` SSR-renders every route
 * in Node ([[016-pattern-ssr-safe-startup-hydration-gate]]), where the native SDK has
 * no business running — server errors land in the DigitalOcean logs, and web client
 * errors are a future unit. The early return covers both (SSR and web client share
 * `Platform.OS === 'web'`).
 *
 * The DSN is `EXPO_PUBLIC_*` (inlined at bundle build time) and read through
 * `unknown` + `typeof` — the repo pattern for the `any`-typed `process.env`
 * ([[008-pattern-dynamic-app-config-strict-lint]]). No DSN → no-op: local dev without
 * Sentry stays silent; the release workflow hard-requires the key for production
 * builds, so a DSN-less PROD binary cannot ship green.
 */
export function initSentry(): boolean {
  if (Platform.OS === 'web') return false;
  const rawDsn: unknown = process.env.EXPO_PUBLIC_SENTRY_DSN;
  const dsn = typeof rawDsn === 'string' && rawDsn.length > 0 ? rawDsn : null;
  if (dsn === null) return false;
  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
  });
  return true;
}
