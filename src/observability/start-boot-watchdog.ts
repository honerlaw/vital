import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';
import { bootMilestones } from '@/observability/boot-milestones';

/**
 * Startup watchdog for NON-THROWING boot hangs — the failure class crash reporting
 * cannot see. Ground truth: TestFlight build 5 white-screened because Clerk `load()`
 * failed silently, `isLoaded` stayed false, and the splash never hid; no exception was
 * thrown anywhere (confirmed by live probe, 2026-06-06). If the splash hasn't hidden
 * after WATCHDOG_TIMEOUT_MS, this sends a Sentry message carrying every milestone that
 * WAS reached, so the event says how far boot got (fonts? clerk? nothing?).
 *
 * Guards mirror init-sentry.ts: never on web/SSR (a Node `setTimeout` during a server
 * render would fire spuriously — there is no splash to hide), and never when Sentry
 * didn't initialize (`sentryEnabled` is initSentry()'s return value; captureMessage
 * into a dead client would be a silent drop).
 */
const WATCHDOG_TIMEOUT_MS = 10_000;

export function startBootWatchdog(sentryEnabled: boolean): void {
  if (Platform.OS === 'web' || !sentryEnabled) return;
  setTimeout(() => {
    if (bootMilestones.has('splash-hidden')) return;
    Sentry.captureMessage(
      `startup watchdog: splash not hidden after ${String(WATCHDOG_TIMEOUT_MS)}ms`,
      {
        level: 'warning',
        extra: { milestonesReached: Array.from(bootMilestones) },
      },
    );
  }, WATCHDOG_TIMEOUT_MS);
}
