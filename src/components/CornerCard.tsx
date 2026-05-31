import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { border, colors, radius, space } from '@/theme';

/**
 * The dashboard hero container: thin border + four green corner brackets.
 * RN has no CSS pseudo-elements, so each bracket is an absolutely-positioned
 * 18×18 View with two borders and the matching corner radius.
 */
export default function CornerCard({ children }: { children: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={[styles.bracket, styles.tl]} />
      <View style={[styles.bracket, styles.tr]} />
      <View style={[styles.bracket, styles.bl]} />
      <View style={[styles.bracket, styles.br]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: border.thin,
    borderColor: colors.line2,
    borderRadius: radius.md,
    paddingTop: space['2xl'],
    paddingHorizontal: space.xl,
    paddingBottom: space.xl,
  },
  bracket: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: colors.accent,
  },
  tl: {
    top: -1,
    left: -1,
    borderTopWidth: border.accent,
    borderLeftWidth: border.accent,
    borderTopLeftRadius: radius.md,
  },
  tr: {
    top: -1,
    right: -1,
    borderTopWidth: border.accent,
    borderRightWidth: border.accent,
    borderTopRightRadius: radius.md,
  },
  bl: {
    bottom: -1,
    left: -1,
    borderBottomWidth: border.accent,
    borderLeftWidth: border.accent,
    borderBottomLeftRadius: radius.md,
  },
  br: {
    bottom: -1,
    right: -1,
    borderBottomWidth: border.accent,
    borderRightWidth: border.accent,
    borderBottomRightRadius: radius.md,
  },
});
