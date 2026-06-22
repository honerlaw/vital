import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import Tag from '@/components/Tag';
import { type ExerciseProgression, type Program } from '@/data/types';
import { border, colors, space } from '@/theme';

interface Props {
  program: Program;
}

/**
 * Read-only preview of a generated draft program (030): name, blurb, and the day/exercise
 * breakdown with a short progression summary per exercise. Mirrors the program-detail layout so a
 * draft reads like the real thing before it is saved.
 */
export default function GeneratedProgramPreview({ program }: Props) {
  const ruleLabel = (p: ExerciseProgression): string => {
    const start = p.startWeight === null ? 'BW' : `${String(p.startWeight)} lb`;
    const r = p.rule;
    switch (r.kind) {
      case 'linear':
        return `${start} · +${String(r.increment)}/${r.frequency === 'per-week' ? 'wk' : 'sesh'}`;
      case 'double-progression':
        return `${start} · ${String(r.repLow)}-${String(r.repHigh)} reps`;
      case 'amrap-driven':
        return `${start} · AMRAP +${String(r.baseIncrement)}`;
      default: {
        const exhaustive: never = r;
        return exhaustive;
      }
    }
  };
  return (
    <View>
      <Tag label={program.tag} />
      <AppText variant="programTitle" style={styles.title}>
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
                <AppText variant="scheme" color={colors.ink}>
                  {ex.name}
                </AppText>
                <AppText variant="scheme">
                  {ex.progression ? `${ex.scheme}  ·  ${ruleLabel(ex.progression)}` : ex.scheme}
                </AppText>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.md },
  blurb: { marginTop: space.md },
  cycle: { marginTop: space.xl },
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
});
