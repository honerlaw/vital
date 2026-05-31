import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import { border, colors, radius, space } from '@/theme';

interface Props {
  label: string;
  active?: boolean;
}

export default function Tag({ label, active = false }: Props) {
  return (
    <View style={[styles.base, active ? styles.active : null]}>
      <AppText variant="tag" color={active ? colors.accent : colors.muted}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderWidth: border.thin,
    borderColor: colors.line2,
    borderRadius: radius.xs,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  active: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
});
