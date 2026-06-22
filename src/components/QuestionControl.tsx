import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/AppText';
import { type Question } from '@/data/routine-types';
import { border, colors, font, radius, space } from '@/theme';

interface Props {
  question: Question;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
}

/**
 * Renders one intake question (030) as a native deterministic control — chip group (single /
 * multi select), numeric field, or capped text field. Never a chat input. Fully controlled: the
 * wizard owns the answers map and passes the current value down.
 */
export default function QuestionControl({ question, value, onChange }: Props) {
  const text = typeof value === 'string' ? value : '';
  const isMulti = question.kind === 'multi-select';
  const selected = (optValue: string): boolean =>
    isMulti ? Array.isArray(value) && value.includes(optValue) : value === optValue;
  const toggleMulti = (optValue: string): void => {
    const current = Array.isArray(value) ? value : [];
    onChange(
      current.includes(optValue)
        ? current.filter((v) => v !== optValue)
        : [...current, optValue],
    );
  };
  return (
    <View style={styles.wrap}>
      <AppText variant="exerciseName" style={styles.prompt}>
        {question.prompt}
      </AppText>
      {question.kind === 'single-select' || question.kind === 'multi-select' ? (
        <View style={styles.chips}>
          {question.options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => (isMulti ? toggleMulti(opt.value) : onChange(opt.value))}
              activeOpacity={0.8}
              style={[styles.chip, selected(opt.value) ? styles.chipOn : null]}
            >
              <AppText
                variant="bodySub"
                color={selected(opt.value) ? colors.onAccent : colors.body}
              >
                {opt.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <TextInput
          value={text}
          onChangeText={onChange}
          keyboardType={question.kind === 'number' ? 'numeric' : 'default'}
          placeholder={question.kind === 'number' && question.unit ? question.unit : ''}
          placeholderTextColor={colors.faint}
          maxLength={question.kind === 'text' ? question.maxLength : undefined}
          style={styles.input}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.xl },
  prompt: { marginBottom: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    borderWidth: border.thin,
    borderColor: colors.line2,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  input: {
    borderWidth: border.thin,
    borderColor: colors.line2,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    fontFamily: font.archivoRegular,
    fontSize: 15,
    color: colors.ink,
  },
});
