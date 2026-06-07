import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, space } from '@/theme';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  hasHeader?: boolean;
}

export default function Screen({ children, scroll = true, hasHeader = false }: Props) {
  const insets = useSafeAreaInsets();
  const pad = {
    // Under a native stack header the header bar consumes the top safe-area inset (021),
    // so headered screens keep only the design padding. The default path is unchanged.
    paddingTop: hasHeader ? layout.screenPaddingTop : insets.top + layout.screenPaddingTop,
    paddingBottom: insets.bottom + layout.tabBarHeight + space['2xl'],
  };
  if (!scroll) {
    return <View style={[styles.flex, styles.base, pad]}>{children}</View>;
  }
  return (
    <ScrollView
      style={[styles.flex, styles.bg]}
      contentContainerStyle={[styles.base, pad]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bg: { backgroundColor: colors.bg },
  base: {
    backgroundColor: colors.bg,
    paddingHorizontal: layout.screenPaddingX,
  },
});
