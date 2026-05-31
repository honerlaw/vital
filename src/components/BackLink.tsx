import { StyleSheet, TouchableOpacity } from 'react-native';
import AppText from '@/components/AppText';
import { space } from '@/theme';

interface Props {
  label: string;
  onPress: () => void;
}

export default function BackLink({ label, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" style={styles.link}>
      <AppText variant="backLink">{`← ${label}`}</AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'flex-start', paddingVertical: space.sm },
});
