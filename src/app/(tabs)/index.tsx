import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/AppText';
import Button from '@/components/Button';
import CornerCard from '@/components/CornerCard';
import ProgramCard from '@/components/ProgramCard';
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

  // First-run chooser (014): null = the user has never chosen a program. The fork sits between
  // the hooks (order-safe) and the engine calls below — `getProgram` is the throwing trusted
  // lookup, so the null branch must return before it. The render-gate guarantees a non-empty,
  // ready catalog here (an empty catalog resolves to 'error', not 'ready').
  if (state.activeProgramId === null) {
    return (
      <Screen>
        {/* Same header row as the session view — the Account link must stay reachable on first
            run (it is the only path to /account and Sign out). */}
        <View style={styles.headerRow}>
          <AppText variant="label" style={styles.eyebrow}>
            {dateEyebrow(new Date())}
          </AppText>
          <TouchableOpacity onPress={() => router.push('/account')} accessibilityRole="button">
            <AppText variant="backLink">Account</AppText>
          </TouchableOpacity>
        </View>
        <AppText variant="screenTitle" style={styles.title}>
          Choose your program
        </AppText>
        <AppText variant="body" style={styles.chooserBlurb}>
          Pick a routine to train with — your next session will always be ready here.
        </AppText>
        <View style={styles.chooserList}>
          {state.programs.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              active={false}
              onPress={() =>
                router.push({ pathname: '/program/[id]', params: { id: program.id } })
              }
            />
          ))}
        </View>
      </Screen>
    );
  }

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
  chooserBlurb: { marginTop: space.md },
  chooserList: { marginTop: space.lg },
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
