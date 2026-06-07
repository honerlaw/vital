import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import { colors } from '@/theme';
import { avatarColor } from '@/utils/avatarColor';

interface Props {
  /** Email when present, else the Clerk user id — never empty inside the signed-in tree. */
  seed: string;
}

/** Generated monogram avatar (023): first character on a deterministic seed-hashed hue. */
export default function Avatar({ seed }: Props) {
  return (
    <View style={[styles.circle, { backgroundColor: avatarColor(seed) }]}>
      <AppText variant="displayDay" color={colors.onAccent}>
        {seed.charAt(0).toUpperCase()}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
