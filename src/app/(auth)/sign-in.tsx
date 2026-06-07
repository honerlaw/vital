import { useSignIn } from '@clerk/expo';
import * as Sentry from '@sentry/react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { signInNextStep } from '@/auth/sign-in-next-step';
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
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Degradation fence (proposal 020): every blocked terminal path shows a readable error
  // AND reports the blocking status to Sentry — the capture is what confirms which
  // intermediate status actually fires in production.
  const degrade = (message: string) => {
    Sentry.captureMessage(`sign-in blocked at status "${signIn.status}"`, { level: 'warning' });
    setError(message);
  };

  // finalize() is called ONLY when the helper returns 'finalize' (which it does for exactly
  // the 'complete' status) — never unconditionally. password() returning { error: null }
  // does NOT mean a session exists; intermediate statuses (2FA, device verification) leave
  // createdSessionId null and an ungated finalize() throws.
  const advance = async () => {
    const step = signInNextStep(signIn.status, signIn.supportedSecondFactors);
    if (step.kind === 'finalize') {
      const finalized = await signIn.finalize();
      if (finalized.error !== null) setError(finalized.error.message);
      return;
    }
    if (step.kind === 'verify-email-code') {
      const sent = await signIn.mfa.sendEmailCode();
      if (sent.error !== null) {
        degrade(sent.error.message);
        return;
      }
      setVerifying(true);
      return;
    }
    degrade(step.message);
  };

  // Step 1: submit the password, then let the status gate decide what comes next.
  const submit = async () => {
    setError(null);
    const result = await signIn.password({ identifier: email, password });
    if (result.error !== null) {
      setError(result.error.message);
      return;
    }
    await advance();
  };

  // Step 2 (only when a second factor / device verification is required): verify the
  // emailed code, then re-run the status gate — finalize only if Clerk says 'complete'.
  const verify = async () => {
    setError(null);
    const verified = await signIn.mfa.verifyEmailCode({ code });
    if (verified.error !== null) {
      setError(verified.error.message);
      return;
    }
    const step = signInNextStep(signIn.status, signIn.supportedSecondFactors);
    if (step.kind === 'finalize') {
      const finalized = await signIn.finalize();
      if (finalized.error !== null) setError(finalized.error.message);
      return;
    }
    degrade(step.kind === 'blocked' ? step.message : 'Verification could not be completed ' +
      'on this device. Please sign in on the web.');
  };

  return (
    <Screen center>
      <AppText variant="label">Welcome back</AppText>
      <AppText variant="screenTitle" style={styles.title}>
        {verifying ? 'Verify it’s you' : 'Sign in'}
      </AppText>

      {verifying ? (
        <View>
          <AppText variant="bodySub" style={styles.hint}>
            We emailed you a verification code.
          </AppText>
          <TextField
            label="Verification code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            placeholder="123456"
          />
        </View>
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
            autoComplete="password"
            placeholder="Your password"
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
          label={verifying ? 'Verify →' : 'Sign in →'}
          onPress={() => { void (verifying ? verify() : submit()); }}
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
  title: { marginTop: space.sm },
  hint: { marginTop: space.lg },
  error: { marginTop: space.lg },
  cta: { marginTop: space.xl },
  link: { alignSelf: 'flex-start', paddingVertical: space.md },
});
