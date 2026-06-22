import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import Button from '@/components/Button';
import HeroCard from '@/components/HeroCard';
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
      <Screen tabScreen>
        <AppText variant="screenTitle" style={styles.title}>
          Choose your program
        </AppText>
        <AppText variant="body" style={styles.chooserBlurb}>
          Pick a routine to train with — your next session will always be ready here.
        </AppText>
        <View style={styles.generate}>
          <Button
            label="✨ Generate a custom routine"
            onPress={() => router.push('/routine/new')}
          />
        </View>
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
  // Per-program position (015): a missing key means the program was never trained — day 0.
  const cursor = state.cursors[program.id] ?? 0;
  const dayIndex = cursor % program.days.length;
  const day = getNextWorkout(program, cursor);
  const upcoming = getUpcoming(program, cursor, 3);

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
    <Screen tabScreen>
      <AppText variant="screenTitle" style={styles.title}>
        Today&apos;s session
      </AppText>

      <View style={styles.hero}>
        <HeroCard>
          <AppText variant="displayDay" color={colors.onAccent}>
            {day.name}
          </AppText>
          <StatRow cells={cells} inverted />
          <View style={styles.begin}>
            <Button label="Begin →" onPress={onBegin} variant="onAccent" />
          </View>
        </HeroCard>
      </View>

      <View style={styles.list}>
        {upcoming.map((d, i) => (
          <RowItem
            key={`${d.name}-${i}`}
            index={String(((cursor + i + 1) % program.days.length) + 1).padStart(2, '0')}
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
  chooserBlurb: { marginTop: space.md },
  generate: { marginTop: space.lg },
  chooserList: { marginTop: space.lg },
  title: { marginTop: space.lg },
  hero: { marginTop: space.lg },
  begin: { marginTop: space.lg },
  list: { marginTop: space['3xl'], borderTopWidth: 1, borderTopColor: colors.line2 },
});
