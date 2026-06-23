import { Feather } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/AppText';
import { colors, space } from '@/theme';

interface Props {
  label: string;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * The diary's day selector (032): a centered day label flanked by prev/next chevrons. Stateless —
 * the owning screen holds the current day and steps it via `shiftLocalDay`. Chevrons use the same
 * ink Feather glyph language as `BackButton` (027/026).
 */
export default function DayNavHeader({ label, onPrev, onNext }: Props) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={onPrev}
        accessibilityRole="button"
        accessibilityLabel="Previous day"
        hitSlop={space.md}
      >
        <Feather name="chevron-left" size={24} color={colors.ink} />
      </TouchableOpacity>
      <AppText variant="label" color={colors.ink}>
        {label}
      </AppText>
      <TouchableOpacity
        onPress={onNext}
        accessibilityRole="button"
        accessibilityLabel="Next day"
        hitSlop={space.md}
      >
        <Feather name="chevron-right" size={24} color={colors.ink} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.lg,
  },
});
