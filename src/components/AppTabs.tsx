import { Tabs } from 'expo-router';
import TabBar from '@/components/TabBar';

// Default tab bar (Android + web): the custom JS bar (`TabBar`) passed to expo-router's
// `Tabs`. iOS resolves `AppTabs.ios.tsx` instead (the native UITabBar / Liquid Glass, 025) —
// Metro's platform-file resolution picks the right one, so `(tabs)/_layout` stays
// platform-agnostic. This block is the pre-025 `_layout` body, moved verbatim.
export default function AppTabs() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="programs" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
