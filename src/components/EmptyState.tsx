import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import { colors, space } from '@/theme';

export default function EmptyState({ lines }: { lines: string[] }) {
  return (
    <View style={styles.wrap}>
      {lines.map((line, i) => (
        <AppText key={i} variant="scheme" color={colors.muted} style={styles.line}>
          {line}
        </AppText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: space['6xl'] },
  line: { lineHeight: 22, textAlign: 'center' },
});
