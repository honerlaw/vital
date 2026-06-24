import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/AppText';
import Button from '@/components/Button';
import { colors, layout, radius, space } from '@/theme';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  /** The reassuring, safe default (filled accent) — e.g. "Keep generating". */
  keepLabel: string;
  /** The destructive action (plain text) — e.g. "Cancel". */
  confirmLabel: string;
  onKeep: () => void;
  onConfirm: () => void;
}

/**
 * Themed confirm dialog (034). The reusable, brand-styled alternative to RN's `Alert` /
 * `window.confirm` (027 used those for the workout exit). Built on RN `Modal`, it is web/SSR-safe
 * (016): it renders nothing until `visible` and never touches `window` at render. The safe action
 * ("keep") is the filled accent default; the destructive action ("confirm") is a plain text button
 * below it, matching VITAL's minimal stacked-CTA aesthetic.
 */
export default function ConfirmDialog({
  visible,
  title,
  message,
  keepLabel,
  confirmLabel,
  onKeep,
  onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onKeep}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <AppText variant="exerciseName" style={styles.title}>
            {title}
          </AppText>
          <AppText variant="body" style={styles.message}>
            {message}
          </AppText>
          <Button label={keepLabel} onPress={onKeep} />
          <TouchableOpacity
            onPress={onConfirm}
            activeOpacity={0.7}
            accessibilityRole="button"
            style={styles.confirm}
          >
            <AppText variant="buttonLabel" color={colors.muted}>
              {confirmLabel}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,10,10,0.45)',
    justifyContent: 'center',
    paddingHorizontal: layout.screenPaddingX,
  },
  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: space['2xl'],
  },
  title: { marginBottom: space.sm },
  message: { marginBottom: space['2xl'] },
  confirm: { alignItems: 'center', paddingVertical: space.lg },
});
