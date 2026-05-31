import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import ProgramCard from '@/components/ProgramCard';
import Screen from '@/components/Screen';
import { PROGRAMS } from '@/data/programs';
import { useAppStore } from '@/state/useAppStore';
import { space } from '@/theme';

export default function ProgramsScreen() {
  const { state } = useAppStore();
  const router = useRouter();
  const eyebrow = `Library / ${String(PROGRAMS.length).padStart(2, '0')} programs`;

  return (
    <Screen>
      <AppText variant="label" style={styles.eyebrow}>
        {eyebrow}
      </AppText>
      <AppText variant="screenTitle" style={styles.title}>
        Programs
      </AppText>
      <View style={styles.list}>
        {PROGRAMS.map((program) => (
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
  eyebrow: { marginTop: space.lg },
  title: { marginTop: space.sm },
  list: { marginTop: space.xl },
});
