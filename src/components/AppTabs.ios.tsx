import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { colors } from '@/theme';

// iOS tab bar via the native UITabBar (025): it adopts Apple Liquid Glass automatically on an
// iOS 26 build and falls back to the standard opaque bar on older iOS — no per-OS code needed.
// Android + web use the custom JS bar in `AppTabs.tsx`; Metro resolves the platform file.
// SF Symbols replace the Feather glyphs and the brand green carries through `tintColor`;
// the bespoke accent-dot / mono-label chrome is intentionally surrendered to the system bar.
// `TABS` is a data const (exempt from local/single-declaration); `AppTabs` is the sole
// declared component. Trigger `name` must match the route names under `(tabs)`.
const TABS = [
  { name: 'index', label: 'Today', sf: { default: 'house', selected: 'house.fill' } },
  { name: 'programs', label: 'Programs', sf: { default: 'list.bullet', selected: 'list.bullet' } },
  { name: 'history', label: 'History', sf: { default: 'clock', selected: 'clock.fill' } },
  { name: 'nutrition', label: 'Nutrition', sf: { default: 'fork.knife', selected: 'fork.knife' } },
  { name: 'settings', label: 'Settings', sf: { default: 'gearshape', selected: 'gearshape.fill' } },
] as const;

export default function AppTabs() {
  return (
    <NativeTabs tintColor={colors.accent}>
      {TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Icon sf={tab.sf} />
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
