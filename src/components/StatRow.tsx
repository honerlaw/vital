import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import { border, colors, space } from '@/theme';

export interface StatCell {
  label: string;
  value: string;
}

// `inverted` renders the row ON an accent fill (the green HeroCard): white text (opaque, so it
// keeps WCAG AA on the green — a translucent label would blend toward green and fail), and
// translucent-white dividers. Hierarchy stays in the font size/weight gap, not opacity.
interface Props {
  cells: StatCell[];
  inverted?: boolean;
}

export default function StatRow({ cells, inverted = false }: Props) {
  const textColor = inverted ? colors.onAccent : undefined;
  return (
    <View style={[styles.row, inverted ? styles.rowInverted : null]}>
      {cells.map((cell, i) => (
        <View
          key={cell.label}
          style={[
            styles.cell,
            i > 0 ? styles.divider : null,
            i > 0 && inverted ? styles.dividerInverted : null,
          ]}
        >
          <AppText variant="statLabel" color={textColor}>{cell.label}</AppText>
          <AppText variant="statValue" color={textColor} style={styles.value}>
            {cell.value}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginTop: space.lg,
    borderTopWidth: border.hairline,
    borderTopColor: colors.line,
  },
  rowInverted: { borderTopColor: colors.onAccentLine },
  cell: { flex: 1, paddingTop: space.md },
  divider: {
    borderLeftWidth: border.hairline,
    borderLeftColor: colors.line,
    paddingLeft: 14,
  },
  dividerInverted: { borderLeftColor: colors.onAccentLine },
  value: { marginTop: 3 },
});
