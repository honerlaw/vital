import { DimensionValue, StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import { colors, space } from '@/theme';

interface Props {
  pct: number;
  done: number;
  total: number;
}

export default function ProgressBar({ pct, done, total }: Props) {
  const fillWidth: DimensionValue = `${Math.round(pct * 100)}%`;
  return (
    <View style={styles.row}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: fillWidth }]} />
      </View>
      <AppText variant="progressCount">{`${done}/${total}`}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: space.lg,
    marginBottom: space.xs,
  },
  track: { flex: 1, height: 1, backgroundColor: colors.line2 },
  fill: {
    position: 'absolute',
    left: 0,
    top: -1,
    height: 3,
    backgroundColor: colors.accent,
  },
});
