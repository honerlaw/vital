import { useAuth, useUser } from '@clerk/expo';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import Avatar from '@/components/Avatar';
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import { space } from '@/theme';

/**
 * Settings tab (023, layout refined 027) — replaces the pushed /account screen. Renders only
 * inside the signed-in tree (Stack.Protected + tabs render-gate), so Clerk's user is present;
 * the avatar/email seed falls back to the user id for accounts without a primary email.
 * scroll={false} + flushBottom: on Android + web the custom tab bar sits in normal flow below
 * the scene, so the scene ends at the bar's top — flushBottom (Screen.tsx) drops the redundant
 * tab-bar clearance so Sign out pins just above the bar. On iOS the native UITabBar is an
 * overlay (025), so flushBottom is gated off there and the screen keeps the full safe inset
 * that clears the bar. `tabScreen` is what reserves that iOS clearance now that non-tab screens
 * reserve none (Screen.tsx `!tabScreen` branch): this is the one non-scroll tab whose content
 * sits under the overlay (031, Trap 2), so it must opt in. The flex:1 `center` region holds the
 * avatar/email block vertically centered between the title and Sign out on every platform.
 */
export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();

  return (
    <Screen scroll={false} flushBottom tabScreen>
      <AppText variant="screenTitle" style={styles.title}>Settings</AppText>
      <View style={styles.center}>
        {user !== null && user !== undefined ? (
          <View style={styles.profile}>
            <Avatar seed={user.primaryEmailAddress?.emailAddress ?? user.id} />
            <AppText variant="body" style={styles.email}>
              {user.primaryEmailAddress?.emailAddress ?? user.id}
            </AppText>
          </View>
        ) : null}
      </View>
      <Button label="Sign out" onPress={() => { void signOut(); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profile: { alignItems: 'center' },
  email: { marginTop: space.lg },
});
