import { useSignIn } from '@clerk/expo';
import * as Sentry from '@sentry/react-native';
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

  // Step 2: verify the code, submit the new password, then finalize() to sign in — gated
  // on the 'complete' status (proposal 020): submitPassword() can leave the sign-in at an
  // intermediate status (e.g. a 2FA account), where an ungated finalize() throws. That
  // path degrades to a readable error + a Sentry message naming the status (a known
  // limitation: no second-factor recovery UI in this flow yet).
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
    if (signIn.status !== 'complete') {
      Sentry.captureMessage(
        `password reset blocked at status "${signIn.status}"`,
        { level: 'warning' },
      );
      setError('Your password was reset, but this device needs additional verification. ' +
        'Please sign in again.');
      return;
    }
    const finalized = await signIn.finalize();
    if (finalized.error !== null) setError(finalized.error.message);
  };

  return (
    <Screen center>
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
  title: { marginTop: space.sm },
  error: { marginTop: space.lg },
  cta: { marginTop: space.xl },
  link: { alignSelf: 'flex-start', paddingVertical: space.md },
});
