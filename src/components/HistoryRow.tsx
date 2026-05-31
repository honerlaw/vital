import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import { border, colors, radius, space } from '@/theme';

interface Props {
  dayName: string;
  programName: string;
  date: string;
}

export default function HistoryRow({ dayName, programName, date }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.check}>
        <AppText variant="historyDate" color={colors.onAccent}>
          ✓
        </AppText>
      </View>
      <View style={styles.body}>
        <AppText variant="exerciseName" style={styles.title}>
          {dayName}
        </AppText>
        <AppText variant="label" style={styles.sub}>
          {programName}
        </AppText>
      </View>
      <AppText variant="historyDate" style={styles.date}>
        {date}
      </AppText>
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
  check: {
    width: 18,
    height: 18,
    borderRadius: radius.xs,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: { fontSize: 15 },
  sub: { marginTop: 3 },
  date: { marginLeft: 'auto' },
});
