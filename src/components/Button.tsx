import { StyleSheet, TouchableOpacity } from 'react-native';
import AppText from '@/components/AppText';
import { border, colors, radius, space } from '@/theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  // `onAccent` is the inverted variant for use ON a filled accent surface (the green HeroCard):
  // white pill, accent-green label. `secondary` is the outline variant for a lower-emphasis CTA
  // stacked under a filled primary (transparent fill, accent border + accent label). The `variant`
  // prop must be read in the body — adding to the union alone leaves the label white-on-white (the
  // buttonLabel preset bakes in white).
  variant?: 'primary' | 'onAccent' | 'secondary';
}

export default function Button({ label, onPress, disabled = false, variant = 'primary' }: Props) {
  const fill = disabled
    ? styles.disabled
    : variant === 'onAccent'
      ? styles.onAccent
      : variant === 'secondary'
        ? styles.secondary
        : styles.primary;
  const labelColor = disabled
    ? colors.faint
    : variant === 'primary'
      ? colors.onAccent
      : colors.accent;
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
  secondary: { backgroundColor: 'transparent', borderColor: colors.accent },
  disabled: { backgroundColor: colors.line, borderColor: colors.line2 },
});
