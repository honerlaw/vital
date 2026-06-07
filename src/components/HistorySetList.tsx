import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import { type SessionExerciseLog } from '@/data/types';
import { colors, space } from '@/theme';

interface Props {
  exercises: SessionExerciseLog[];
  unit: string;
}

/**
 * Expanded per-set detail under a history row (022). Done sets show `weight unit × reps`
 * ('—' for a value that was never entered); planned-only sets render dimmed, keeping the
 * planned-vs-actual signal visible. Own file per the one-component-per-file guardrail.
 */
export default function HistorySetList({ exercises, unit }: Props) {
  return (
    <View style={styles.wrap}>
      {exercises.map((ex, ei) => (
        <View key={`${ex.name}-${String(ei)}`} style={styles.exercise}>
          <View style={styles.head}>
            <AppText variant="setLabel">{ex.name}</AppText>
            <AppText variant="setLabel" color={colors.muted}>
              {ex.scheme}
            </AppText>
          </View>
          {ex.sets.map((s, si) => (
            <View key={si} style={styles.setLine}>
              <AppText variant="setLabel" color={s.done ? colors.muted : colors.faint}>
                {`S${String(si + 1)}`}
              </AppText>
              <AppText variant="setValue" color={s.done ? colors.ink : colors.faint}>
                {s.done
                  ? `${s.weight === null ? '—' : String(s.weight)} ${unit} × ${
                      s.reps === null ? '—' : String(s.reps)
                    }`
                  : 'skipped'}
              </AppText>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: space.lg, gap: space.md },
  exercise: { gap: 3 },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  setLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.lg,
    paddingLeft: space.md,
  },
});
