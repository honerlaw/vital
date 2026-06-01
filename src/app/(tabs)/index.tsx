import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/AppText';
import Button from '@/components/Button';
import CornerCard from '@/components/CornerCard';
import RowItem from '@/components/RowItem';
import Screen from '@/components/Screen';
import StatRow from '@/components/StatRow';
import {
  cadenceDayLabel,
  estimateMinutes,
  getNextWorkout,
  getProgram,
  getUpcoming,
  totalSets,
} from '@/data/engine';
import { useAppStore } from '@/state/useAppStore';
import { dateEyebrow } from '@/utils/dateEyebrow';
import { colors, space } from '@/theme';

export default function TodayScreen() {
  const { state, dispatch } = useAppStore();
  const router = useRouter();
  const program = getProgram(state.programs, state.activeProgramId);
  const dayIndex = state.cursor % program.days.length;
  const day = getNextWorkout(program, state.cursor);
  const upcoming = getUpcoming(program, state.cursor, 3);

  const onBegin = () => {
    dispatch({ type: 'START_WORKOUT', dayIndex });
    router.push('/workout');
  };

  const cells = [
    { label: 'Exercises', value: String(day.exercises.length).padStart(2, '0') },
    { label: 'Sets', value: String(totalSets(day)) },
    { label: 'Est', value: `${estimateMinutes(day)}m` },
  ];

  return (
    <Screen>
      <View style={styles.headerRow}>
        <AppText variant="label" style={styles.eyebrow}>
          {dateEyebrow(new Date())}
        </AppText>
        <TouchableOpacity onPress={() => router.push('/account')} accessibilityRole="button">
          <AppText variant="backLink">Account</AppText>
        </TouchableOpacity>
      </View>
      <AppText variant="screenTitle" style={styles.title}>
        Today&apos;s session
      </AppText>

      <View style={styles.hero}>
        <CornerCard>
          <AppText variant="label">{program.name}</AppText>
          <AppText variant="displayDay" style={styles.day}>
            {day.name}
          </AppText>
          <StatRow cells={cells} />
          <View style={styles.begin}>
            <Button label="Begin →" onPress={onBegin} />
          </View>
        </CornerCard>
      </View>

      <View style={styles.sect}>
        <AppText variant="label">Up next</AppText>
        <AppText variant="label">{`${program.perWeek}×/wk`}</AppText>
      </View>
      <View style={styles.list}>
        {upcoming.map((d, i) => (
          <RowItem
            key={`${d.name}-${i}`}
            index={String(((state.cursor + i + 1) % program.days.length) + 1).padStart(2, '0')}
            title={d.name}
            subtitle={`${d.exercises.length} exercises`}
            trailing={cadenceDayLabel(program.perWeek, i + 1)}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.lg,
  },
  eyebrow: {},
  title: { marginTop: space.sm },
  hero: { marginTop: space.lg },
  day: { marginTop: space.sm },
  begin: { marginTop: space.lg },
  sect: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space['3xl'],
    marginBottom: space.md,
  },
  list: { borderTopWidth: 1, borderTopColor: colors.line2 },
});
