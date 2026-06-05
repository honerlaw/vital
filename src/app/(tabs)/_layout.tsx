import { Tabs } from 'expo-router';
import CatalogStatus from '@/components/CatalogStatus';
import TabBar from '@/components/TabBar';
import { useAppStore } from '@/state/useAppStore';

export default function TabsLayout() {
  const { state, dispatch } = useAppStore();

  // Render-gate: hold the whole tab UI until the catalog is hydrated. SSR (`web.output: "server"`)
  // never runs the startup effect, so it always sees `loading` here and never renders a tab screen
  // (which would call `getProgram` on an empty catalog). The hook stays above the early return.
  if (state.programsStatus !== 'ready') {
    return (
      <CatalogStatus
        status={state.programsStatus}
        onRetry={() => dispatch({ type: 'RETRY_HYDRATE' })}
      />
    );
  }

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="programs" />
      <Tabs.Screen name="history" />
    </Tabs>
  );
}
