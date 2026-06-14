import { StyleSheet, TouchableOpacity } from 'react-native';
import AppText from '@/components/AppText';
import { border, colors, radius, space } from '@/theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  // `onAccent` is the inverted variant for use ON a filled accent surface (the green HeroCard):
  // white pill, accent-green label. The `variant` prop must be read in the body — adding to the
  // union alone leaves the label white-on-white (the buttonLabel preset bakes in white).
  variant?: 'primary' | 'onAccent';
}

export default function Button({ label, onPress, disabled = false, variant = 'primary' }: Props) {
  const fill = disabled
    ? styles.disabled
    : variant === 'onAccent'
      ? styles.onAccent
      : styles.primary;
  const labelColor = disabled
    ? colors.faint
    : variant === 'onAccent'
      ? colors.accent
      : colors.onAccent;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      style={[styles.base, fill]}
    >
      <AppText variant="buttonLabel" color={labelColor}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    borderWidth: border.thin,
    borderRadius: radius.md,
    paddingVertical: space.lg,
    alignItems: 'center',
  },
  primary: { backgroundColor: colors.accent, borderColor: colors.accent },
  onAccent: { backgroundColor: colors.onAccent, borderColor: colors.onAccent },
  disabled: { backgroundColor: colors.line, borderColor: colors.line2 },
});
