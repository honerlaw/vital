import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import ProgramCard from '@/components/ProgramCard';
import Screen from '@/components/Screen';
import { useAppStore } from '@/state/useAppStore';
import { space } from '@/theme';

export default function ProgramsScreen() {
  const { state } = useAppStore();
  const router = useRouter();
  // The `(tabs)/_layout` render-gate holds this screen until `programsStatus === 'ready'` (an empty
  // catalog resolves to `error`, not `ready`), so the catalog here is always present and non-empty.
  const { programs } = state;

  return (
    <Screen tabScreen>
      <AppText variant="screenTitle" style={styles.title}>
        Programs
      </AppText>
      <View style={styles.list}>
        {programs.map((program) => (
          <ProgramCard
            key={program.id}
            program={program}
            active={program.id === state.activeProgramId}
            onPress={() =>
              router.push({ pathname: '/program/[id]', params: { id: program.id } })
            }
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.lg },
  list: { marginTop: space.xl },
});
