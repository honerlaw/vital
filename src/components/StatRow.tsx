import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import { border, colors, space } from '@/theme';

export interface StatCell {
  label: string;
  value: string;
}

export default function StatRow({ cells }: { cells: StatCell[] }) {
  return (
    <View style={styles.row}>
      {cells.map((cell, i) => (
        <View key={cell.label} style={[styles.cell, i > 0 ? styles.divider : null]}>
          <AppText variant="statLabel">{cell.label}</AppText>
          <AppText variant="statValue" style={styles.value}>
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
  cell: { flex: 1, paddingTop: space.md },
  divider: {
    borderLeftWidth: border.hairline,
    borderLeftColor: colors.line,
    paddingLeft: 14,
  },
  value: { marginTop: 3 },
});
