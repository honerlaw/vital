import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import Button from '@/components/Button';
import ProgramCard from '@/components/ProgramCard';
import Screen from '@/components/Screen';
import { type Program } from '@/data/types';
import { useAppStore } from '@/state/useAppStore';
import { colors, space } from '@/theme';

export default function ProgramsScreen() {
  const { state } = useAppStore();
  const router = useRouter();
  // The `(tabs)/_layout` render-gate holds this screen until `programsStatus === 'ready'` (an empty
  // catalog resolves to `error`, not `ready`), so the catalog here is always present and non-empty.
  const { programs } = state;

  // Split the merged array by origin (030): user-generated programs vs. the built-in catalog. Each
  // group keeps its merged order (catalog by sort_order; user portion newest-first per the GET).
  const userPrograms = programs.filter((p) => state.userProgramIds.includes(p.id));
  const catalogPrograms = programs.filter((p) => !state.userProgramIds.includes(p.id));

  const renderCard = (program: Program) => (
    <ProgramCard
      key={program.id}
      program={program}
      active={program.id === state.activeProgramId}
      onPress={() => router.push({ pathname: '/program/[id]', params: { id: program.id } })}
    />
  );

  return (
    <Screen tabScreen>
      <AppText variant="screenTitle" style={styles.title}>
        Programs
      </AppText>
      <View style={styles.generate}>
        <Button label="✨ Generate a custom routine" onPress={() => router.push('/routine/new')} />
      </View>
      <View style={styles.list}>
        {userPrograms.length > 0 ? (
          <>
            <AppText variant="label" color={colors.muted} style={styles.sectionHeader}>
              Your Routines
            </AppText>
            {userPrograms.map(renderCard)}
          </>
        ) : null}
        <AppText
          variant="label"
          color={colors.muted}
          style={[styles.sectionHeader, userPrograms.length > 0 ? styles.sectionGap : null]}
        >
          Program Catalog
        </AppText>
        {catalogPrograms.map(renderCard)}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.lg },
  generate: { marginTop: space.xl },
  list: { marginTop: space.lg },
  sectionHeader: { marginBottom: space.xs },
  sectionGap: { marginTop: space.xl },
});
