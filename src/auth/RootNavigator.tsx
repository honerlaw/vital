import { useAuth } from '@clerk/expo';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { recordBootMilestone } from '@/observability/record-boot-milestone';
import { colors } from '@/theme';

// Shared chrome for the pushed detail screens (021): a native back-affordance bar themed
// to the app — white, shadowless, ink chevron with no back text, empty title (large titles
// stay inline in screen content per the design language).
const pushedHeaderOptions = {
  headerShown: true,
  headerTitle: '',
  headerStyle: { backgroundColor: colors.bg },
  headerShadowVisible: false,
  headerTintColor: colors.ink,
  headerBackButtonDisplayMode: 'minimal',
} as const;

/**
 * Auth-gated root navigator. Mounted under `ClerkProvider`, so it can read `useAuth()`. Holds
 * the splash screen until Clerk has loaded (fonts are already loaded by the time this mounts),
 * then declaratively gates routes with `Stack.Protected` — no imperative `router.replace()` in
 * an effect, keeping it clean under the repo's React-Compiler hook rules
 * (see [[004-pattern-expo56-react-compiler-hook-rules]]). The signed-in group holds the app
 * routes; the signed-out group holds the `(auth)` flows. Exactly one group is active, so the
 * router redirects to it automatically when the session state flips.
 */
export default function RootNavigator() {
  const auth = useAuth();

  useEffect(() => {
    if (auth.isLoaded) {
      // Watchdog milestones: clerk-loaded marks this gate releasing; splash-hidden
      // (recorded only after hideAsync resolves) is the watchdog's all-clear — a boot
      // that never reaches it produces a Sentry message naming how far boot got.
      recordBootMilestone('clerk-loaded');
      void SplashScreen.hideAsync().then(() => {
        recordBootMilestone('splash-hidden');
      });
    }
  }, [auth.isLoaded]);

  if (!auth.isLoaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={auth.isSignedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="program/[id]" options={pushedHeaderOptions} />
        {/* A live workout's only exits must run the cancel/finish dispatches (021): the
            swipe gesture and native back button are disabled HERE — statically, so the
            lock can't be lost to an in-screen early return — and the screen supplies its
            own headerLeft Cancel. */}
        <Stack.Screen
          name="workout"
          options={{ ...pushedHeaderOptions, headerBackVisible: false, gestureEnabled: false }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!auth.isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
