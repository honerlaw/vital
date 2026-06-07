import { useAuth, useUser } from '@clerk/expo';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import Avatar from '@/components/Avatar';
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import { space } from '@/theme';

/**
 * Settings tab (023) — replaces the pushed /account screen. Renders only inside the
 * signed-in tree (Stack.Protected + tabs render-gate), so Clerk's user is present; the
 * avatar/email seed falls back to the user id for accounts without a primary email.
 * scroll={false}: the flex spacer pins Sign out to the bottom, above the tab bar.
 */
export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();

  return (
    <Screen scroll={false}>
      <AppText variant="screenTitle" style={styles.title}>Settings</AppText>
      {user !== null && user !== undefined ? (
        <View style={styles.profile}>
          <Avatar seed={user.primaryEmailAddress?.emailAddress ?? user.id} />
          <AppText variant="body" style={styles.email}>
            {user.primaryEmailAddress?.emailAddress ?? user.id}
          </AppText>
        </View>
      ) : null}
      <View style={styles.spacer} />
      <Button label="Sign out" onPress={() => { void signOut(); }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.lg },
  profile: { marginTop: space['3xl'], alignItems: 'center' },
  email: { marginTop: space.lg },
  spacer: { flex: 1 },
});
