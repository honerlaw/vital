import { useAuth, useUser } from '@clerk/expo';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { apiFetch } from '@/auth/api-fetch';
import AppText from '@/components/AppText';
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import { colors, space } from '@/theme';

export default function AccountScreen() {
  const { getToken, signOut } = useAuth();
  const { user } = useUser();
  const [meId, setMeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Exercises the protected endpoint end-to-end: apiFetch attaches the Bearer token (native) /
  // relies on the session cookie (web); the server's requireAuth returns { userId } or 401.
  const verifyEndpoint = async () => {
    setError(null);
    setMeId(null);
    const res = await apiFetch('/api/me', getToken);
    if (!res.ok) {
      setError(`Request failed (${String(res.status)})`);
      return;
    }
    const body: unknown = await res.json();
    if (
      typeof body === 'object' &&
      body !== null &&
      'userId' in body &&
      typeof body.userId === 'string'
    ) {
      setMeId(body.userId);
    }
  };

  return (
    <Screen hasHeader>
      <AppText variant="screenTitle" style={styles.title}>Account</AppText>
      {user !== null && user !== undefined ? (
        <AppText variant="body" style={styles.row}>
          {user.primaryEmailAddress?.emailAddress ?? user.id}
        </AppText>
      ) : null}

      <View style={styles.cta}>
        <Button label="Verify /api/me" onPress={() => { void verifyEndpoint(); }} />
      </View>
      {meId !== null ? (
        <AppText variant="bodySub" color={colors.accent} style={styles.row}>
          {`Authenticated as ${meId}`}
        </AppText>
      ) : null}
      {error !== null ? (
        <AppText variant="bodySub" color={colors.ink} style={styles.row}>
          {error}
        </AppText>
      ) : null}

      <View style={styles.cta}>
        <Button label="Sign out" onPress={() => { void signOut(); }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.lg },
  row: { marginTop: space.lg },
  cta: { marginTop: space.xl },
});
