import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import BackLink from '@/components/BackLink';
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
    return <CatalogStatus status={status} onRetry={() => dispatch({ type: 'RETRY_HYDRATE' })} />;
  }

  // Untrusted route param → non-throwing lookup with a not-found view (vs the throwing engine
  // `getProgram`, which is reserved for trusted ids).
  const program = state.programs.find((p) => p.id === id);
  if (!program) {
    return (
      <Screen>
        <BackLink label="Programs" onPress={() => router.back()} />
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

  const onSetActive = () => {
    dispatch({ type: 'SET_ACTIVE_PROGRAM', id: program.id });
    router.replace('/');
  };

  return (
    <Screen>
      <BackLink label="Programs" onPress={() => router.back()} />
      <Tag label={program.tag} />
      <AppText variant="screenTitle" style={styles.title}>
        {program.name}
      </AppText>
      <AppText variant="body" style={styles.blurb}>
        {program.blurb}
      </AppText>
      <AppText variant="label" style={styles.meta}>
        {`${program.cred} / ${program.perWeek} days per week`}
      </AppText>

      <View style={styles.sect}>
        <AppText variant="label">The cycle</AppText>
      </View>

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

      <View style={styles.cta}>
        <Button
          label={active ? 'Currently active' : 'Set as my program'}
          onPress={onSetActive}
          disabled={active}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.md },
  blurb: { marginTop: space.md },
  meta: { marginTop: space.md },
  sect: { marginTop: space['3xl'], marginBottom: space.sm },
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
