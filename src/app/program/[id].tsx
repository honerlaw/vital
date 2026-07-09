import { useAuth } from '@clerk/expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import CatalogStatus from '@/components/CatalogStatus';
import Screen from '@/components/Screen';
import Tag from '@/components/Tag';
import { deleteUserProgram } from '@/data/delete-user-program';
import { bootStatus } from '@/state/boot-status';
import { useAppStore } from '@/state/useAppStore';
import { border, colors, space } from '@/theme';

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useAppStore();
  const { getToken } = useAuth();
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
  // Generated programs (030) are deletable; catalog programs are not.
  const isUserProgram = state.userProgramIds.includes(program.id);

  // Delete a generated routine: confirm, then remove on the server and locally. The reducer falls
  // the active program back to the null chooser (019) if this was the active one. The confirm runs
  // only inside the event handler (web `window.confirm` reached client-side only), mirroring the
  // workout cancel dialog (029).
  const onDelete = () => {
    const remove = () => {
      deleteUserProgram(getToken, program.id)
        .then(() => {
          dispatch({ type: 'REMOVE_USER_PROGRAM', id: program.id });
          router.replace('/');
        })
        .catch(() => undefined);
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this routine? This cannot be undone.')) remove();
      return;
    }
    Alert.alert('Delete routine?', 'This cannot be undone.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);
  };

  // First run (014): selecting saves the choice as the active program — no forced workout.
  // Also the standalone "Switch to this program" path (045): a plain SET_ACTIVE_PROGRAM makes a
  // DIFFERENT program active without starting a workout — distinct from SWITCH_AND_START_WORKOUT,
  // whose switch commits at Begin and reverts on CANCEL (015). This one persists (StateProvider
  // PUTs on SET_ACTIVE_PROGRAM) and never reverts — it's for "pick the program I'll train later".
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
    // nowISO stamped here (041) — the session start anchor, like FINISH_WORKOUT's nowISO.
    const nowISO = new Date().toISOString();
    if (!active) {
      dispatch({ type: 'SWITCH_AND_START_WORKOUT', id: program.id, nowISO });
    } else {
      dispatch({
        type: 'START_WORKOUT',
        dayIndex: (state.cursors[program.id] ?? 0) % program.days.length,
        nowISO,
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

      {/* CTAs per context (014/045): first run → choose (saves without starting a workout);
          active program → begin; a DIFFERENT program → two paths: "Switch & begin workout" (the
          switch commits at the Begin tap and CANCEL reverts it losslessly — 015) plus a standalone
          "Switch to this program" (045) that makes it active WITHOUT starting a workout and does
          not revert — for picking the program you'll train later. */}
      <View style={styles.cta}>
        {neverChose ? (
          <Button label="Choose this program" onPress={onChoose} />
        ) : active ? (
          <Button label="Begin workout →" onPress={onBegin} />
        ) : (
          <>
            <Button label="Switch & begin workout →" onPress={onBegin} />
            <View style={styles.secondaryCta}>
              <Button label="Switch to this program" onPress={onChoose} variant="secondary" />
            </View>
          </>
        )}
      </View>
      {isUserProgram ? (
        <View style={styles.deleteCta}>
          <Button label="Delete routine" onPress={onDelete} />
        </View>
      ) : null}
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
  secondaryCta: { marginTop: space.md },
  deleteCta: { marginTop: space.md },
});
