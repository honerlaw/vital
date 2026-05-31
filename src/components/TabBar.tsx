import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '@/components/AppText';
import { colors, layout } from '@/theme';

type FeatherName = ComponentProps<typeof Feather>['name'];
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, FeatherName> = {
  index: 'home',
  programs: 'list',
  history: 'clock',
};

const LABELS: Record<string, string> = {
  index: 'Today',
  programs: 'Programs',
  history: 'History',
};

export default function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: insets.bottom, height: layout.tabBarHeight + insets.bottom },
      ]}
    >
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        const tint = focused ? colors.accent : colors.faint;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            style={styles.tab}
          >
            <Feather name={ICONS[route.name]} size={19} color={tint} />
            <AppText variant="tabLabel" color={tint}>
              {LABELS[route.name]}
            </AppText>
            <View style={[styles.dot, focused ? styles.dotOn : null]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  dot: { width: 5, height: 5, backgroundColor: colors.accent, opacity: 0 },
  dotOn: { opacity: 1 },
});
