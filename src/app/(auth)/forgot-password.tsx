import { useSignIn } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/AppText';
import Button from '@/components/Button';
import Screen from '@/components/Screen';
import TextField from '@/components/TextField';
import { colors, space } from '@/theme';

export default function ForgotPasswordScreen() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: start a sign-in for the email, then send a reset code to it. Requires the Clerk
  // dashboard to have email+password auth and the reset_password_email_code strategy enabled.
  const sendCode = async () => {
    setError(null);
    const started = await signIn.create({ identifier: email });
    if (started.error !== null) {
      setError(started.error.message);
      return;
    }
    const sent = await signIn.resetPasswordEmailCode.sendCode();
    if (sent.error !== null) {
      setError(sent.error.message);
      return;
    }
    setCodeSent(true);
  };

  // Step 2: verify the code, submit the new password, then finalize() to sign in.
  const reset = async () => {
    setError(null);
    const verified = await signIn.resetPasswordEmailCode.verifyCode({ code });
    if (verified.error !== null) {
      setError(verified.error.message);
      return;
    }
    const submitted = await signIn.resetPasswordEmailCode.submitPassword({ password });
    if (submitted.error !== null) {
      setError(submitted.error.message);
      return;
    }
    await signIn.finalize();
  };

  return (
    <Screen>
      <AppText variant="label" style={styles.eyebrow}>Account recovery</AppText>
      <AppText variant="screenTitle" style={styles.title}>Reset password</AppText>

      {codeSent ? (
        <View>
          <TextField
            label="Reset code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            placeholder="123456"
          />
          <TextField
            label="New password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password-new"
            placeholder="Choose a new password"
          />
        </View>
      ) : (
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          placeholder="you@example.com"
        />
      )}

      {error !== null ? (
        <AppText variant="bodySub" color={colors.ink} style={styles.error}>
          {error}
        </AppText>
      ) : null}

      <View style={styles.cta}>
        <Button
          label={codeSent ? 'Reset password →' : 'Send reset code →'}
          onPress={() => { void (codeSent ? reset() : sendCode()); }}
          disabled={fetchStatus === 'fetching'}
        />
      </View>

      <TouchableOpacity onPress={() => router.push('/sign-in')} style={styles.link}>
        <AppText variant="backLink">Back to sign in</AppText>
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
