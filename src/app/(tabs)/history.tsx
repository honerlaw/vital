import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import EmptyState from '@/components/EmptyState';
import HistoryRow from '@/components/HistoryRow';
import Screen from '@/components/Screen';
import { useAppStore } from '@/state/useAppStore';
import { historyDate } from '@/utils/historyDate';
import { colors, space } from '@/theme';

const EMPTY_LINES = [
  'NO SESSIONS LOGGED',
  '—',
  'FINISH A WORKOUT TO RECORD IT',
];

export default function HistoryScreen() {
  const { state } = useAppStore();
  const empty = state.history.length === 0;

  return (
    <Screen>
      <AppText variant="label" style={styles.eyebrow}>
        Log
      </AppText>
      <AppText variant="screenTitle" style={styles.title}>
        History
      </AppText>
      <View style={[styles.list, empty ? null : styles.listBorder]}>
        {empty ? (
          <EmptyState lines={EMPTY_LINES} />
        ) : (
          state.history.map((log, i) => (
            <HistoryRow
              key={`${log.dateISO}-${i}`}
              dayName={log.dayName}
              programName={log.programName}
              date={historyDate(log.dateISO)}
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
  listBorder: { borderTopWidth: 1, borderTopColor: colors.line2 },
});
