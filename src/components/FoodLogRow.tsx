import { Feather } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/AppText';
import { type FoodLogEntry } from '@/data/food-types';
import { border, colors, space } from '@/theme';

interface Props {
  entry: FoodLogEntry;
  onDelete: (id: string) => void;
}

/**
 * One logged diary entry (032): name + serving provenance on the left, calories on the right, and
 * a trailing delete affordance. Macros are shown beneath the name (P/C/F in grams). Numbers are
 * rounded for display only — the stored values keep their snapshotted precision.
 */
export default function FoodLogRow({ entry, onDelete }: Props) {
  const macros = `P ${String(Math.round(entry.proteinG))}  ·  C ${String(
    Math.round(entry.carbsG),
  )}  ·  F ${String(Math.round(entry.fatG))}`;
  return (
    <View style={styles.row}>
      <View style={styles.body}>
        <AppText variant="exerciseName" numberOfLines={1}>
          {entry.name}
        </AppText>
        <AppText variant="scheme" style={styles.sub}>
          {entry.servingLabel}
        </AppText>
        <AppText variant="statLabel" style={styles.macros}>
          {macros}
        </AppText>
      </View>
      <View style={styles.right}>
        <AppText variant="statValue">{String(Math.round(entry.calories))}</AppText>
        <AppText variant="statLabel" style={styles.kcal}>
          KCAL
        </AppText>
      </View>
      <TouchableOpacity
        onPress={() => {
          onDelete(entry.id);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${entry.name}`}
        hitSlop={space.md}
        style={styles.delete}
      >
        <Feather name="x" size={18} color={colors.faint} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    borderBottomWidth: border.hairline,
    borderBottomColor: colors.line,
  },
  body: { flex: 1, paddingRight: space.md },
  sub: { marginTop: 3 },
  macros: { marginTop: 5 },
  right: { alignItems: 'flex-end', paddingRight: space.lg },
  kcal: { marginTop: 2 },
  delete: { paddingLeft: space.xs },
});
