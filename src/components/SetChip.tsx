import { StyleSheet, TouchableOpacity } from 'react-native';
import AppText from '@/components/AppText';
import { border, colors, radius, space } from '@/theme';

interface Props {
  index: number;
  done: boolean;
  onToggle: () => void;
}

export default function SetChip({ index, done, onToggle }: Props) {
  const tint = done ? colors.onAccent : colors.muted;
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: done }}
      style={[styles.chip, done ? styles.done : null]}
    >
      <AppText variant="setLabel" color={tint}>
        {`S${index + 1}`}
      </AppText>
      <AppText
        variant="setValue"
        color={done ? colors.onAccent : colors.ink}
        style={styles.value}
      >
        {done ? '✓' : '—'}
      </AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    minWidth: 56,
    borderWidth: border.thin,
    borderColor: colors.line2,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    paddingHorizontal: space.xs,
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  done: { backgroundColor: colors.accent, borderColor: colors.accent },
  value: { marginTop: 3 },
});
