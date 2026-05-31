import { Tabs } from 'expo-router';
import TabBar from '@/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={TabBar} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="programs" />
      <Tabs.Screen name="history" />
    </Tabs>
  );
}
