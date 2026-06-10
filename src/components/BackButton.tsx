import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { colors, space } from '@/theme';

/**
 * Inline back affordance for pushed detail screens that carry no native stack header (026) —
 * `program/[id]`, whose blank chrome-only header was removed. An ink Feather chevron with no
 * back text, matching 021's chrome-chevron design language
 * ([[027-pattern-native-stack-headers-pushed-screens]]).
 *
 * Self-routing and cold-deep-link safe: pops the stack when there is one, else falls back to
 * Home. The native chevron auto-hid when `canGoBack()` was false; an unguarded `router.back()`
 * would be a visible dead tap on a first-route deep link, so the guard always lands the user
 * somewhere (`/` is the established fallback target used elsewhere in the app).
 */
export default function BackButton() {
  const router = useRouter();
  const onPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={space.md}
      style={styles.btn}
    >
      {/* Negative left margin cancels the glyph's built-in optical padding so the chevron
          aligns with the screen's left content edge. */}
      <Feather name="chevron-left" size={26} color={colors.ink} style={styles.glyph} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { alignSelf: 'flex-start', marginBottom: space.sm },
  glyph: { marginLeft: -space.xs },
});
