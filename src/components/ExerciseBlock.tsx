import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import SetRow from '@/components/SetRow';
import { parseSchemeReps } from '@/data/engine';
import { type SetPatch } from '@/data/engine/updateSet';
import { type SetEntry } from '@/data/types';
import { border, colors, space } from '@/theme';

interface Props {
  name: string;
  scheme: string;
  sets: SetEntry[];
  onPatch: (si: number, patch: SetPatch) => void;
}

export default function ExerciseBlock({ name, scheme, sets, onPatch }: Props) {
  // Both fallbacks are non-authoritative prefills (022): reps from the scheme's parsed
  // per-set target; weight from the nearest PRIOR committed set in this exercise (straight
  // sets fill forward as you log). They render as placeholders and commit only at done-toggle
  // with the field blank — committed values are never rewritten by other rows.
  const repsFallback = parseSchemeReps(scheme);
  const priorWeight = (si: number): number | null => {
    const prior = sets
      .slice(0, si)
      .reverse()
      .find((e) => e.weight !== null);
    return prior ? prior.weight : null;
  };
  return (
    <View style={styles.block}>
      <View style={styles.head}>
        <AppText variant="exerciseName">{name}</AppText>
        <AppText variant="scheme">{scheme}</AppText>
      </View>
      <View style={styles.sets}>
        {sets.map((entry, si) => (
          <SetRow
            key={si}
            index={si}
            entry={entry}
            weightFallback={priorWeight(si)}
            repsFallback={repsFallback}
            onPatch={(patch) => onPatch(si, patch)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderTopWidth: border.thin,
    borderTopColor: colors.line2,
    paddingTop: space.lg,
    paddingBottom: space.lg,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: space.md,
  },
  sets: { gap: space.sm },
});
