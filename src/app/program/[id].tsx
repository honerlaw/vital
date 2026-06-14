import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import CatalogStatus from '@/components/CatalogStatus';
import Screen from '@/components/Screen';
import Tag from '@/components/Tag';
import { bootStatus } from '@/state/boot-status';
import { useAppStore } from '@/state/useAppStore';
import { border, colors, space } from '@/theme';

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useAppStore();
  const router = useRouter();

  // Deep-link / SSR guard (standalone route, outside the tabs layout; combined catalog +
  // per-user-state readiness); after all hooks.
  const status = bootStatus(state);
  if (status !== 'ready') {
    return (
      <CatalogStatus
        status={status}
        onRetry={() => dispatch({ type: 'RETRY_HYDRATE' })}
        back
      />
    );
  }

  // Untrusted route param → non-throwing lookup with a not-found view (vs the throwing engine
  // `getProgram`, which is reserved for trusted ids).
  const program = state.programs.find((p) => p.id === id);
  if (!program) {
    return (
      <Screen>
        <BackButton />
        <AppText variant="screenTitle" style={styles.title}>
          Not found
        </AppText>
        <AppText variant="body" style={styles.blurb}>
          {`No program "${id}".`}
        </AppText>
      </Screen>
    );
  }
  const active = program.id === state.activeProgramId;
  const neverChose = state.activeProgramId === null;

  // First run (014): selecting saves the choice as the active program — no forced workout.
  const onChoose = () => {
    dispatch({ type: 'SET_ACTIVE_PROGRAM', id: program.id });
    router.replace('/');
  };

  // Begin a workout here. For the active program this is Today's Begin (same cursor arithmetic).
  // For a DIFFERENT program, starting a workout in it is what makes it the active program (014).
  // Since 015 that is ONE composite action — SWITCH_AND_START_WORKOUT switches the id, resumes
  // the target program's own position (per-program cursors; switching never zeroes progress),
  // and records the previous id on the session so cancelling reverts the switch.
  const onBegin = () => {
    if (!active) {
      dispatch({ type: 'SWITCH_AND_START_WORKOUT', id: program.id });
    } else {
      dispatch({
        type: 'START_WORKOUT',
        dayIndex: (state.cursors[program.id] ?? 0) % program.days.length,
      });
    }
    router.push('/workout');
  };

  return (
    <Screen>
      <BackButton />
      <Tag label={program.tag} />
      <AppText variant="screenTitle" style={styles.title}>
        {program.name}
      </AppText>
      <AppText variant="body" style={styles.blurb}>
        {program.blurb}
      </AppText>

      <View style={styles.cycle}>
        {program.days.map((day, i) => (
          <View key={`${day.name}-${i}`} style={styles.dayBlock}>
            <View style={styles.dayHead}>
              <AppText variant="exerciseName">
                {`${String(i + 1).padStart(2, '0')} · ${day.name}`}
              </AppText>
              <AppText variant="scheme">{`${day.exercises.length} ex`}</AppText>
            </View>
            {day.exercises.map((ex, ei) => (
              <View key={`${ex.name}-${ei}`} style={styles.exLine}>
                <AppText variant="scheme">{ex.name}</AppText>
                <AppText variant="scheme" color={colors.ink}>
                  {ex.scheme}
                </AppText>
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* One CTA per context (014): choose (first run, saves without starting a workout),
          begin (this program is active), or switch & begin (starting a workout in a different
          program is what makes it active — there is no standalone "set active" tap). The switch
          commits at the Begin tap and CANCEL reverts it (015) — losslessly, since each program
          keeps its own cursor and switching never mutates the map. */}
      <View style={styles.cta}>
        {neverChose ? (
          <Button label="Choose this program" onPress={onChoose} />
        ) : (
          <Button
            label={active ? 'Begin workout →' : 'Switch & begin workout →'}
            onPress={onBegin}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.md },
  blurb: { marginTop: space.md },
  cycle: { marginTop: space['3xl'] },
  dayBlock: {
    borderTopWidth: border.thin,
    borderTopColor: colors.line2,
    paddingTop: space.lg,
    paddingBottom: space.md,
  },
  dayHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: space.md,
  },
  exLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space.xs,
  },
  cta: { marginTop: space.lg },
});
