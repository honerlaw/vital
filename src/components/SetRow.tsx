import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/AppText';
import { type SetPatch } from '@/data/engine/updateSet';
import { type SetEntry } from '@/data/types';
import { border, colors, font, radius, space } from '@/theme';

interface Props {
  index: number;
  entry: SetEntry;
  /** Prior set's committed weight in this exercise — placeholder + commit fallback (022). */
  weightFallback: number | null;
  /** parseSchemeReps target for this exercise's scheme — placeholder + commit fallback. */
  repsFallback: number | null;
  onPatch: (patch: SetPatch) => void;
}

/**
 * One set of the active workout (022 — replaced the boolean SetChip): weight input, reps
 * input, done toggle. The inputs hold LOCAL text (seeded once from the live entry, so a
 * remount mid-session restores typed values); every edit dispatches the parsed value and the
 * pure engine does all coercion. Fallbacks are non-authoritative: they render as
 * placeholders and are committed only when the set is marked done with the field still
 * blank — so "did the prescription" costs one tap, while a typed 15 over a "5+" scheme is
 * never clamped. Edits never cascade to other rows; committed values are never rewritten.
 */
export default function SetRow({ index, entry, weightFallback, repsFallback, onPatch }: Props) {
  const [weightText, setWeightText] = useState(() =>
    entry.weight === null ? '' : String(entry.weight),
  );
  const [repsText, setRepsText] = useState(() => (entry.reps === null ? '' : String(entry.reps)));

  const onWeight = (t: string) => {
    setWeightText(t);
    onPatch({ weight: t === '' ? null : Number(t) });
  };
  const onReps = (t: string) => {
    setRepsText(t);
    onPatch({ reps: t === '' ? null : Number(t) });
  };
  const onToggle = () => {
    // Commit-on-toggle: a blank field records its fallback (the visible placeholder), and the
    // input is filled in so the row shows exactly what was logged.
    const weight = weightText === '' ? weightFallback : Number(weightText);
    const reps = repsText === '' ? repsFallback : Number(repsText);
    if (weightText === '' && weightFallback !== null) setWeightText(String(weightFallback));
    if (repsText === '' && repsFallback !== null) setRepsText(String(repsFallback));
    onPatch({ done: !entry.done, weight, reps });
  };

  return (
    <View style={styles.row}>
      <AppText variant="setLabel" style={styles.label}>
        {`S${index + 1}`}
      </AppText>
      <TextInput
        value={weightText}
        onChangeText={onWeight}
        placeholder={weightFallback === null ? 'lb' : String(weightFallback)}
        placeholderTextColor={colors.faint}
        keyboardType="decimal-pad"
        accessibilityLabel={`Set ${String(index + 1)} weight`}
        style={styles.input}
      />
      <AppText variant="setLabel" color={colors.muted}>
        ×
      </AppText>
      <TextInput
        value={repsText}
        onChangeText={onReps}
        placeholder={repsFallback === null ? 'reps' : String(repsFallback)}
        placeholderTextColor={colors.faint}
        keyboardType="number-pad"
        accessibilityLabel={`Set ${String(index + 1)} reps`}
        style={styles.input}
      />
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ selected: entry.done }}
        accessibilityLabel={`Set ${String(index + 1)} done`}
        style={[styles.toggle, entry.done ? styles.toggleDone : null]}
      >
        <AppText variant="setValue" color={entry.done ? colors.onAccent : colors.ink}>
          {entry.done ? '✓' : '—'}
        </AppText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  label: { width: 24 },
  input: {
    flex: 1,
    borderWidth: border.thin,
    borderColor: colors.line2,
    borderRadius: radius.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    fontFamily: font.archivoRegular,
    fontSize: 15,
    color: colors.ink,
    textAlign: 'center',
  },
  toggle: {
    width: 48,
    borderWidth: border.thin,
    borderColor: colors.line2,
    borderRadius: radius.sm,
    paddingVertical: space.sm,
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  toggleDone: { backgroundColor: colors.accent, borderColor: colors.accent },
});
