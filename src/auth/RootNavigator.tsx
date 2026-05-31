import { useAuth } from '@clerk/expo';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

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
    if (auth.isLoaded) void SplashScreen.hideAsync();
  }, [auth.isLoaded]);

  if (!auth.isLoaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={auth.isSignedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="program/[id]" />
        <Stack.Screen name="workout" />
        <Stack.Screen name="account" />
      </Stack.Protected>
      <Stack.Protected guard={!auth.isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
