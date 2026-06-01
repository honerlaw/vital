import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import EmptyState from '@/components/EmptyState';
import ProgramCard from '@/components/ProgramCard';
import Screen from '@/components/Screen';
import { fetchPrograms } from '@/data/programs-api';
import { type Program } from '@/data/types';
import { useAppStore } from '@/state/useAppStore';
import { space } from '@/theme';

export default function ProgramsScreen() {
  const { state } = useAppStore();
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPrograms()
      .then((loaded) => {
        if (!cancelled) setPrograms(loaded);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load programs.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const count = programs === null ? null : String(programs.length).padStart(2, '0');
  const eyebrow = count === null ? 'Library' : `Library / ${count} programs`;

  return (
    <Screen>
      <AppText variant="label" style={styles.eyebrow}>
        {eyebrow}
      </AppText>
      <AppText variant="screenTitle" style={styles.title}>
        Programs
      </AppText>
      <View style={styles.list}>
        {error !== null ? (
          <EmptyState lines={['COULD NOT LOAD PROGRAMS', '—', 'CHECK YOUR CONNECTION']} />
        ) : programs === null ? (
          <EmptyState lines={['LOADING PROGRAMS…']} />
        ) : programs.length === 0 ? (
          <EmptyState lines={['NO PROGRAMS YET', '—', 'CHECK BACK SOON']} />
        ) : (
          programs.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              active={program.id === state.activeProgramId}
              onPress={() =>
                router.push({ pathname: '/program/[id]', params: { id: program.id } })
              }
            />
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: space.lg },
  title: { marginTop: space.sm },
  list: { marginTop: space.xl },
});
