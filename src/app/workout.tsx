import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import BackLink from '@/components/BackLink';
import Button from '@/components/Button';
import ExerciseBlock from '@/components/ExerciseBlock';
import ProgressBar from '@/components/ProgressBar';
import RestTimerBar from '@/components/RestTimerBar';
import CatalogStatus from '@/components/CatalogStatus';
import Screen from '@/components/Screen';
import { getProgram, sessionProgress } from '@/data/engine';
import { useRestTimer } from '@/hooks/useRestTimer';
import { useAppStore } from '@/state/useAppStore';
import { colors, space } from '@/theme';

const REST_SECONDS = 90;

export default function WorkoutScreen() {
  const { state, dispatch } = useAppStore();
  const router = useRouter();
  const restTimer = useRestTimer(REST_SECONDS);
  const live = state.live;

  // Deep-link / SSR guard: this standalone route is outside the tabs layout, so it carries its own
  // render-gate. Both early returns sit after all hooks.
  if (state.programsStatus !== 'ready') {
    return (
      <CatalogStatus
        status={state.programsStatus}
        onRetry={() => dispatch({ type: 'RETRY_HYDRATE' })}
      />
    );
  }
  if (!live) return null;

  const program = getProgram(state.programs, live.programId);
  const day = program.days[live.dayIndex];
  const progress = sessionProgress(live);

  const onToggle = (ei: number, si: number) => {
    const wasDone = live.completed[ei][si];
    dispatch({ type: 'TOGGLE_SET', ei, si });
    if (!wasDone) restTimer.start(REST_SECONDS);
  };

  const onFinish = () => {
    dispatch({ type: 'FINISH_WORKOUT' });
    router.replace('/');
  };

  const onCancel = () => {
    dispatch({ type: 'CANCEL_WORKOUT' });
    router.back();
  };

  return (
    <View style={styles.root}>
      <Screen>
        <BackLink label="Cancel" onPress={onCancel} />
        <AppText variant="label">{program.name}</AppText>
        <AppText variant="screenTitle" style={styles.title}>
          {day.name}
        </AppText>
        <ProgressBar pct={progress.pct} done={progress.done} total={progress.total} />
        <View style={styles.blocks}>
          {day.exercises.map((ex, ei) => (
            <ExerciseBlock
              key={`${ex.name}-${ei}`}
              name={ex.name}
              scheme={ex.scheme}
              completed={live.completed[ei]}
              onToggle={(si) => onToggle(ei, si)}
            />
          ))}
        </View>
        <Button
          label="Finish & log"
          onPress={onFinish}
          disabled={progress.done === 0}
        />
      </Screen>
      <RestTimerBar
        visible={restTimer.visible}
        seconds={restTimer.seconds}
        onSkip={restTimer.skip}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { marginTop: space.xs },
  blocks: { marginTop: space.lg },
});
