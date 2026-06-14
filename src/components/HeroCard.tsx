import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, space } from '@/theme';

/**
 * The dashboard hero: a solid card filled with the brand accent green. Its content is rendered
 * inverted (white) by the callers — `StatRow inverted`, `Button variant="onAccent"`, and a
 * white `displayDay`. Replaced the corner-bracket frame (the old CornerCard) in 029: the
 * brackets read as a frame, not a card.
 */
export default function HeroCard({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingTop: space['2xl'],
    paddingHorizontal: space.xl,
    paddingBottom: space.xl,
  },
});
