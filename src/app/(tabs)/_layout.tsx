import { Tabs } from 'expo-router';
import CatalogStatus from '@/components/CatalogStatus';
import TabBar from '@/components/TabBar';
import { bootStatus } from '@/state/boot-status';
import { useAppStore } from '@/state/useAppStore';

export default function TabsLayout() {
  const { state, dispatch } = useAppStore();

  // Render-gate: hold the whole tab UI until BOTH startup fetches (catalog + per-user state)
  // are hydrated. SSR (`web.output: "server"`) never runs the startup effects, so it always
  // sees `loading` here and never renders a tab screen. The hook stays above the early return.
  const status = bootStatus(state);
  if (status !== 'ready') {
    return <CatalogStatus status={status} onRetry={() => dispatch({ type: 'RETRY_HYDRATE' })} />;
  }

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="programs" />
      <Tabs.Screen name="history" />
    </Tabs>
  );
}
