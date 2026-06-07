import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { BackHandler, StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/AppText';
import Button from '@/components/Button';
import ExerciseBlock from '@/components/ExerciseBlock';
import ProgressBar from '@/components/ProgressBar';
import RestTimerBar from '@/components/RestTimerBar';
import CatalogStatus from '@/components/CatalogStatus';
import Screen from '@/components/Screen';
import { getProgram, sessionProgress } from '@/data/engine';
import { type SetPatch } from '@/data/engine/updateSet';
import { useRestTimer } from '@/hooks/useRestTimer';
import { bootStatus } from '@/state/boot-status';
import { useAppStore } from '@/state/useAppStore';
import { colors, space } from '@/theme';

const REST_SECONDS = 90;

export default function WorkoutScreen() {
  const { state, dispatch } = useAppStore();
  const router = useRouter();
  const restTimer = useRestTimer(REST_SECONDS);
  const live = state.live;

  // The single cancel path (021): the headerLeft Cancel and the Android hardware back both
  // route through here.
  const onCancel = useCallback(() => {
    dispatch({ type: 'CANCEL_WORKOUT' });
    router.back();
  }, [dispatch, router]);

  // Android hardware/system back must run the same cancel path as the header button — a
  // plain pop would strand the live session and skip the 015 program-switch revert
  // (CANCEL_WORKOUT is a reducer no-op when no session is live). Predictive back is not
  // enabled in this app (CNG, no enableOnBackInvokedCallback), so BackHandler intercepts
  // classic back reliably; revisit this if that manifest flag is ever added (021).
  // NOTE: onCancel is re-created on every dispatch (StateProvider's dispatch is
  // re-memoized on [state]), so this effect re-subscribes per state change. Cleanup keeps
  // exactly one listener holding the latest closure — correct, just churny; a
  // subscribe-once-via-ref refactor is recorded in followups.md.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel();
      return true;
    });
    return () => {
      sub.remove();
    };
  }, [onCancel]);

  // The Cancel affordance must exist in EVERY render branch (021) — the navigator
  // statically disables the swipe gesture and native back button, so this headerLeft is
  // the screen's only visible exit. Inline arrow (not a top-level component) to satisfy
  // the single-declaration/no-multi-comp guardrails.
  const headerScreen = (
    <Stack.Screen
      options={{
        headerLeft: () => (
          <TouchableOpacity
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel workout"
          >
            <AppText variant="backLink">Cancel</AppText>
          </TouchableOpacity>
        ),
      }}
    />
  );

  // Deep-link / SSR guard: this standalone route is outside the tabs layout, so it carries its own
  // render-gate (combined: catalog + per-user state). Both early returns sit after all hooks, and
  // both render headerScreen — a bare null would unmount the Cancel chrome exactly when it matters.
  const status = bootStatus(state);
  if (status !== 'ready') {
    return (
      <>
        {headerScreen}
        <CatalogStatus
          status={status}
          onRetry={() => dispatch({ type: 'RETRY_HYDRATE' })}
          hasHeader
        />
      </>
    );
  }
  if (!live) return headerScreen;

  const program = getProgram(state.programs, live.programId);
  const day = program.days[live.dayIndex];
  const progress = sessionProgress(live);

  const onPatch = (ei: number, si: number, patch: SetPatch) => {
    // All coercion happens in the pure engine (022); this handler only forwards the patch
    // and starts the rest timer on a pending→done transition (weight/reps edits don't).
    const wasDone = live.sets[ei][si].done;
    dispatch({ type: 'UPDATE_SET', ei, si, patch });
    if (patch.done === true && !wasDone) restTimer.start(REST_SECONDS);
  };

  const onFinish = () => {
    // The timestamp is stamped HERE (event handler, single dispatch site) so the reducer and
    // the persistence write-through compute the same deterministic finishSession result.
    dispatch({ type: 'FINISH_WORKOUT', nowISO: new Date().toISOString() });
    router.replace('/');
  };

  return (
    <View style={styles.root}>
      {headerScreen}
      <Screen hasHeader>
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
              sets={live.sets[ei]}
              onPatch={(si, patch) => onPatch(ei, si, patch)}
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
