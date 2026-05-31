import { StyleSheet, TouchableOpacity } from 'react-native';
import AppText from '@/components/AppText';
import { border, colors, radius, space } from '@/theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary';
}

export default function Button({ label, onPress, disabled = false }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      style={[styles.base, disabled ? styles.disabled : styles.primary]}
    >
      <AppText variant="buttonLabel" color={disabled ? colors.faint : colors.onAccent}>
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
  disabled: { backgroundColor: colors.line, borderColor: colors.line2 },
});
