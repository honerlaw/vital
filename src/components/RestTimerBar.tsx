import { useEffect, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';
import AppText from '@/components/AppText';
import { formatTime } from '@/utils/formatTime';
import { border, colors, radius, space } from '@/theme';

interface Props {
  visible: boolean;
  seconds: number;
  onSkip: () => void;
}

const HIDDEN_OFFSET = 200;

export default function RestTimerBar({ visible, seconds, onSkip }: Props) {
  const [translateY] = useState(() => new Animated.Value(HIDDEN_OFFSET));

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : HIDDEN_OFFSET,
      duration: 340,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.bar, { transform: [{ translateY }] }]}
    >
      <AppText variant="restLabel">Rest</AppText>
      <AppText variant="restTime" style={styles.time}>
        {formatTime(seconds)}
      </AppText>
      <TouchableOpacity onPress={onSkip} accessibilityRole="button" style={styles.skip}>
        <AppText variant="backLink">Skip</AppText>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: space.xl,
    right: space.xl,
    bottom: space['2xl'],
    backgroundColor: colors.bg,
    borderWidth: border.thin,
    borderColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 13,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: { marginLeft: 'auto' },
  skip: {
    marginLeft: space.lg,
    paddingLeft: space.lg,
    borderLeftWidth: border.thin,
    borderLeftColor: colors.line2,
  },
});
