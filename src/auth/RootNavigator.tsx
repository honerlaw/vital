import { useAuth } from '@clerk/expo';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { recordBootMilestone } from '@/observability/record-boot-milestone';
import { colors } from '@/theme';

// Chrome for the workout screen (021): a native back-affordance bar themed to the app —
// white, shadowless, ink chevron. Since 029 the bar also HOLDS the title: the workout screen
// overrides `headerTitle` with the live day name via its in-screen `<Stack.Screen>` (the inline
// eyebrow that once blocked a native title is gone), so `'Workout'` here is only the base
// fallback before that override applies / in the loading branch. `program/[id]` used to share
// this, but its bar was blank and the screen now uses an inline BackButton instead (026); only
// `workout` keeps the native bar, because its headerLeft holds the (confirmed) cancel exit.
const pushedHeaderOptions = {
  headerShown: true,
  headerTitle: 'Workout',
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
        {/* No `options` → inherits the Stack default `headerShown: false` (026): the blank
            chrome-only header is gone; the screen renders its own inline BackButton. */}
        <Stack.Screen name="program/[id]" />
        {/* Add-food flow (032): a top-level route off the Nutrition tab, same inline-BackButton
            chrome as program/[id] (no native header). */}
        <Stack.Screen name="nutrition/add" />
        {/* Manage-equipment flow (042): a top-level route off the Settings tab, same
            inline-BackButton chrome (no native header). */}
        <Stack.Screen name="settings/equipment" />
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
