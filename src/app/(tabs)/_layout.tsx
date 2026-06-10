import AppTabs from '@/components/AppTabs';
import CatalogStatus from '@/components/CatalogStatus';
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

  // The tab bar is platform-resolved (025): the native UITabBar / Liquid Glass on iOS
  // (`AppTabs.ios.tsx`), the custom JS bar on Android + web (`AppTabs.tsx`).
  return <AppTabs />;
}
