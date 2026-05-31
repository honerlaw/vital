import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import { border, colors, space } from '@/theme';

interface Props {
  index: string;
  title: string;
  subtitle: string;
  trailing?: string;
}

export default function RowItem({ index, title, subtitle, trailing }: Props) {
  return (
    <View style={styles.row}>
      <AppText variant="progressCount" color={colors.faint} style={styles.idx}>
        {index}
      </AppText>
      <View style={styles.body}>
        <AppText variant="exerciseName" style={styles.title}>
          {title}
        </AppText>
        <AppText variant="scheme" style={styles.subtitle}>
          {subtitle}
        </AppText>
      </View>
      {trailing ? (
        <AppText variant="rowWhen" style={styles.trailing}>
          {trailing}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingVertical: space.lg,
    borderBottomWidth: border.hairline,
    borderBottomColor: colors.line,
  },
  idx: { width: 22 },
  body: { flex: 1 },
  title: { fontSize: 15 },
  subtitle: { marginTop: 2 },
  trailing: { marginLeft: 'auto' },
});
