import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
} from '@expo-google-fonts/archivo';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from '@/auth/RootNavigator';
import { getPublishableKey } from '@/auth/clerk-config';
import SentryErrorBoundary from '@/observability/SentryErrorBoundary';
import { initSentry } from '@/observability/init-sentry';
import { recordBootMilestone } from '@/observability/record-boot-milestone';
import { startBootWatchdog } from '@/observability/start-boot-watchdog';
import StateProvider from '@/state/StateProvider';

void SplashScreen.preventAutoHideAsync();

// Module scope on purpose (same precedent as preventAutoHideAsync above): Sentry must
// be live before the first render so render-phase throws are captured, and the
// watchdog clock must start at JS boot, not first paint. Both are web/SSR no-ops, and
// the watchdog additionally no-ops when init returned false (no DSN → dead client).
const sentryEnabled = initSentry();
startBootWatchdog(sentryEnabled);

function RootLayout() {
  const [loaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  // Milestone from an effect, not render (render-time external mutation is a React
  // Compiler error, [[004]]); hook sits above the early return per the same rule.
  useEffect(() => {
    if (loaded) recordBootMilestone('fonts-loaded');
  }, [loaded]);

  // Keep the splash up until fonts are ready; RootNavigator then holds it until Clerk loads, so
  // the user never sees a flash of the sign-in screen before the session state is known.
  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={getPublishableKey()} tokenCache={tokenCache}>
        <StateProvider>
          <SentryErrorBoundary>
            <RootNavigator />
          </SentryErrorBoundary>
        </StateProvider>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}

// Sentry.wrap adds touch-event breadcrumbs + a profiler around the root. Lint-safe:
// single-declaration treats a non-memo/forwardRef CallExpression as data, so
// RootLayout above remains this file's one component declaration.
export default Sentry.wrap(RootLayout);
