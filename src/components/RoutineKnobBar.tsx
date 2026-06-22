import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/AppText';
import { type RoutineKnob } from '@/data/routine-types';
import { border, colors, radius, space } from '@/theme';

interface Props {
  onKnob: (knob: RoutineKnob) => void;
  disabled?: boolean;
}

// Button-driven re-prompt knobs (030) — never free-form chat. Param-less directives plus a few
// preset "emphasize" muscle groups, so refinement stays fully structured.
const KNOBS: { label: string; knob: RoutineKnob }[] = [
  { label: 'More volume', knob: { kind: 'more-volume' } },
  { label: 'Less time', knob: { kind: 'less-time' } },
  { label: 'Emphasize legs', knob: { kind: 'emphasize', muscleGroup: 'legs' } },
  { label: 'Emphasize chest', knob: { kind: 'emphasize', muscleGroup: 'chest' } },
  { label: 'Emphasize back', knob: { kind: 'emphasize', muscleGroup: 'back' } },
  { label: 'Emphasize arms', knob: { kind: 'emphasize', muscleGroup: 'arms' } },
];

export default function RoutineKnobBar({ onKnob, disabled = false }: Props) {
  return (
    <View>
      <AppText variant="label" style={styles.heading}>
        Refine
      </AppText>
      <View style={styles.row}>
        {KNOBS.map((k) => (
          <TouchableOpacity
            key={k.label}
            onPress={() => onKnob(k.knob)}
            disabled={disabled}
            activeOpacity={0.8}
            style={[styles.chip, disabled ? styles.chipOff : null]}
          >
            <AppText variant="bodySub" color={disabled ? colors.faint : colors.body}>
              {k.label}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { marginBottom: space.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    borderWidth: border.thin,
    borderColor: colors.line2,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  chipOff: { borderColor: colors.line },
});
