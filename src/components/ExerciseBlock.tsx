import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import SetChip from '@/components/SetChip';
import { border, colors, space } from '@/theme';

interface Props {
  name: string;
  scheme: string;
  completed: boolean[];
  onToggle: (si: number) => void;
}

export default function ExerciseBlock({ name, scheme, completed, onToggle }: Props) {
  return (
    <View style={styles.block}>
      <View style={styles.head}>
        <AppText variant="exerciseName">{name}</AppText>
        <AppText variant="scheme">{scheme}</AppText>
      </View>
      <View style={styles.sets}>
        {completed.map((done, si) => (
          <SetChip key={si} index={si} done={done} onToggle={() => onToggle(si)} />
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
  sets: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
});
