import { useSignUp } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/AppText';
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import TextField from '@/components/TextField';
import { colors, space } from '@/theme';

export default function SignUpScreen() {
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: create the user, then send the email verification code. Stays on this screen and
  // flips to the inline code-entry step rather than navigating to a separate route.
  const startSignUp = async () => {
    setError(null);
    const created = await signUp.create({ emailAddress: email, password });
    if (created.error !== null) {
      setError(created.error.message);
      return;
    }
    const sent = await signUp.verifications.sendEmailCode();
    if (sent.error !== null) {
      setError(sent.error.message);
      return;
    }
    setPendingVerification(true);
  };

  // Step 2: verify the emailed code, then finalize() to activate the session.
  const verify = async () => {
    setError(null);
    const verified = await signUp.verifications.verifyEmailCode({ code });
    if (verified.error !== null) {
      setError(verified.error.message);
      return;
    }
    await signUp.finalize();
  };

  return (
    <Screen>
      <AppText variant="label" style={styles.eyebrow}>Get started</AppText>
      <AppText variant="screenTitle" style={styles.title}>
        {pendingVerification ? 'Verify email' : 'Create account'}
      </AppText>

      {pendingVerification ? (
        <TextField
          label="Verification code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          placeholder="123456"
        />
      ) : (
        <View>
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
            autoComplete="password-new"
            placeholder="Choose a password"
          />
        </View>
      )}

      {error !== null ? (
        <AppText variant="bodySub" color={colors.ink} style={styles.error}>
          {error}
        </AppText>
      ) : null}

      <View style={styles.cta}>
        <Button
          label={pendingVerification ? 'Verify →' : 'Sign up →'}
          onPress={() => { void (pendingVerification ? verify() : startSignUp()); }}
          disabled={fetchStatus === 'fetching'}
        />
      </View>

      <TouchableOpacity onPress={() => router.push('/sign-in')} style={styles.link}>
        <AppText variant="backLink">Already have an account? Sign in</AppText>
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
