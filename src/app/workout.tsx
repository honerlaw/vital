import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Alert, BackHandler, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import Button from '@/components/Button';
import ExerciseBlock from '@/components/ExerciseBlock';
import ProgressBar from '@/components/ProgressBar';
import RestTimerBar from '@/components/RestTimerBar';
import CatalogStatus from '@/components/CatalogStatus';
import Screen from '@/components/Screen';
import { getProgram, lastLoggedWeight, progressionTarget, sessionProgress } from '@/data/engine';
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

  // The single cancel path (021): the headerLeft chevron and the Android hardware back both
  // route through here. 029 gates the exit behind a confirmation — an accidental tap or system
  // back must not silently discard a live session. The actual discard (CANCEL_WORKOUT, whose
  // absence strands the session and skips the 015 program-switch revert) runs only on confirm.
  // ONE useCallback (the discard arrow is local, not a second top-level declaration) keeps this
  // lint-clean under local/single-declaration. The confirm prompt runs only inside this
  // event / BackHandler callback, never at SSR render, so the `window.confirm` web branch
  // (RN's Alert is a no-op on web) reaches `window` only client-side.
  const onCancel = useCallback(() => {
    const discard = () => {
      dispatch({ type: 'CANCEL_WORKOUT' });
      router.back();
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Cancel workout? Your logged sets will be discarded.')) discard();
      return;
    }
    Alert.alert('Cancel workout?', 'Your logged sets will be discarded.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: discard },
    ]);
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

  // The back affordance + title must exist in EVERY render branch (021) — the navigator
  // statically disables the swipe gesture and native back button, so this headerLeft is the
  // screen's only visible exit. The title moved INTO the native bar in 029 (the inline eyebrow
  // that blocked a native large title is gone), so derive the active day up-front — guarded, so
  // the loading/error/no-live branches fall back to 'Workout' rather than reading an undefined
  // day. Inline arrow `headerLeft` (NOT a top-level component) satisfies
  // single-declaration/no-multi-comp; the Feather chevron rides the iOS liquid-glass bar (031).
  const status = bootStatus(state);
  const headerDay =
    live && status === 'ready'
      ? getProgram(state.programs, live.programId).days[live.dayIndex]
      : null;
  const headerScreen = (
    <Stack.Screen
      options={{
        headerTitle: headerDay ? headerDay.name : 'Workout',
        headerLeft: () => (
          <TouchableOpacity
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel workout"
            hitSlop={space.md}
          >
            <Feather name="chevron-left" size={26} color={colors.ink} />
          </TouchableOpacity>
        ),
      }}
    />
  );

  // Deep-link / SSR guard: this standalone route is outside the tabs layout, so it carries its own
  // render-gate (combined: catalog + per-user state). Both early returns sit after all hooks, and
  // both render headerScreen — a bare null would unmount the back chrome exactly when it matters.
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
  // Weight prefill source, per exercise. For a generated exercise (030) this is the
  // progression-derived target (startWeight advanced by logged history); for a catalog exercise it
  // is the last logged weight (024). Either way it is the chain's history rung, coalesced in
  // ExerciseBlock below the in-session prior set — a placeholder, never a clamp (028). Plain
  // derivation, NOT useMemo — this sits after the early-return render gates where a hook would
  // violate hook rules (004), and the React Compiler memoizes it anyway.
  const historyWeights = day.exercises.map((ex) =>
    ex.progression
      ? progressionTarget(ex.progression, state.history, ex.name)
      : lastLoggedWeight(state.history, ex.name),
  );

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
        <ProgressBar pct={progress.pct} done={progress.done} total={progress.total} />
        <View style={styles.blocks}>
          {day.exercises.map((ex, ei) => (
            <ExerciseBlock
              key={`${ex.name}-${ei}`}
              name={ex.name}
              scheme={ex.scheme}
              sets={live.sets[ei]}
              historyWeight={historyWeights[ei]}
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
  blocks: { marginTop: space.lg },
});
