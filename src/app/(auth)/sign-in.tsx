import { useSignIn } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/AppText';
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import TextField from '@/components/TextField';
import { colors, space } from '@/theme';

export default function SignInScreen() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Core-3 signals flow: submit the password, then finalize() to activate the session. The root
  // navigator's guard flips to the app routes once useAuth() reports the new signed-in state.
  const submit = async () => {
    setError(null);
    const result = await signIn.password({ identifier: email, password });
    if (result.error !== null) {
      setError(result.error.message);
      return;
    }
    await signIn.finalize();
  };

  return (
    <Screen>
      <AppText variant="label" style={styles.eyebrow}>Welcome back</AppText>
      <AppText variant="screenTitle" style={styles.title}>Sign in</AppText>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        placeholder="you@example.com"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        placeholder="Your password"
      />
      {error !== null ? (
        <AppText variant="bodySub" color={colors.ink} style={styles.error}>
          {error}
        </AppText>
      ) : null}
      <View style={styles.cta}>
        <Button
          label="Sign in →"
          onPress={() => { void submit(); }}
          disabled={fetchStatus === 'fetching'}
        />
      </View>
      <TouchableOpacity onPress={() => router.push('/forgot-password')} style={styles.link}>
        <AppText variant="backLink">Forgot password?</AppText>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/sign-up')} style={styles.link}>
        <AppText variant="backLink">Create an account</AppText>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: space['4xl'] },
  title: { marginTop: space.sm },
  error: { marginTop: space.lg },
  cta: { marginTop: space.xl },
  link: { alignSelf: 'flex-start', paddingVertical: space.md },
});
