import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/AppText';
import { EQUIPMENT_CATALOG } from '@/data/equipment-catalog';
import { border, colors, radius, space } from '@/theme';

interface Props {
  selected: string[];
  onToggle: (id: string) => void;
}

/**
 * Grouped multi-select picker over the canonical equipment vocabulary (042). Shared by the Settings
 * equipment screen and the routine-intake editor — both pass the current selection plus a toggle.
 * Chip styling mirrors `QuestionControl` so equipment selection reads identically to the intake's
 * other multi-selects. Fully controlled: the parent owns the selection.
 */
export default function EquipmentPicker({ selected, onToggle }: Props) {
  return (
    <View>
      {EQUIPMENT_CATALOG.map((category) => (
        <View key={category.id} style={styles.group}>
          <AppText variant="label" style={styles.groupLabel}>
            {category.label}
          </AppText>
          <View style={styles.chips}>
            {category.items.map((item) => {
              const on = selected.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => onToggle(item.id)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  style={[styles.chip, on ? styles.chipOn : null]}
                >
                  <AppText variant="bodySub" color={on ? colors.onAccent : colors.body}>
                    {item.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: space.xl },
  groupLabel: { marginBottom: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    borderWidth: border.thin,
    borderColor: colors.line2,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
});
