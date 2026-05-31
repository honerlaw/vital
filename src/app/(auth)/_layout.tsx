import { Stack } from 'expo-router';

// Pin the group's anchor so a signed-out user entering the app lands on sign-in (not the
// alphabetically-first child, forgot-password). RootNavigator gates this whole group behind
// `guard={!isSignedIn}`, so '/' resolves here and renders this initial route.
export const unstable_settings = { initialRouteName: 'sign-in' };

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
