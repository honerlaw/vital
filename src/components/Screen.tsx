import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, space } from '@/theme';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  hasHeader?: boolean;
  center?: boolean;
  flushBottom?: boolean;
  tabScreen?: boolean;
}

export default function Screen({
  children,
  scroll = true,
  hasHeader = false,
  center = false,
  flushBottom = false,
  tabScreen = false,
}: Props) {
  const insets = useSafeAreaInsets();
  // On iOS the tab bar is the native UITabBar (025), whose content view controller hosts each
  // tab's ScrollView with the default contentInsetAdjustmentBehavior — so the native side
  // auto-insets that ScrollView for the safe area, on BOTH edges. Any manual safe-area term we
  // also add on this path double-counts. The gate is the iOS tab scroll path; the non-scroll
  // Settings tab (bare View, no native auto-inset) and every non-tab consumer (`tabScreen`
  // defaults false) keep the original manual padding.
  const onNativeTabBar = process.env.EXPO_OS === 'ios';
  const onNativeTabScroll = tabScreen && onNativeTabBar && scroll;
  // Bottom: drop the manual `tabBarHeight` (025) — the native bottom inset clears the bar.
  // `insets.bottom + space['2xl']` stays as trailing scroll space (NOT dropped here).
  const tabBarPad = onNativeTabScroll ? 0 : layout.tabBarHeight;
  const pad = {
    // Top: drop the manual `insets.top` whenever a native consumer already supplied the top
    // safe-area inset — a native stack header (021, `hasHeader`) or the native tab content
    // inset (028, `onNativeTabScroll`). Both keep only the design padding; every other path
    // adds the inset manually. (028 is the symmetric top twin of the 025 bottom fix above.)
    paddingTop:
      hasHeader || onNativeTabScroll
        ? layout.screenPaddingTop
        : insets.top + layout.screenPaddingTop,
    // flushBottom (027) drops the tab-bar clearance so a bottom-pinned child (Settings' Sign
    // out) sits one design margin above the bar. SAFE ONLY where the bar is relative-flow
    // (Android + web custom TabBar.tsx): the scene ends at the bar's top, so the default
    // expression double-counts insets.bottom + tabBarHeight. On iOS the bar is the native
    // UITabBar overlay (025) — content runs under it and a non-scroll screen gets no auto-inset
    // — so flushBottom is gated off there (restoring the inset, per 032), leaving the iOS path
    // byte-identical to the default.
    paddingBottom: flushBottom && !onNativeTabBar
      ? space['2xl']
      : insets.bottom + tabBarPad + space['2xl'],
  };
  if (!scroll) {
    return <View style={[styles.flex, styles.base, pad]}>{children}</View>;
  }
  return (
    <ScrollView
      style={[styles.flex, styles.bg]}
      contentContainerStyle={[styles.base, pad, center ? styles.center : null]}
      showsVerticalScrollIndicator={false}
      // Taps on touchables (e.g. a set's done toggle, 022) must fire on the first tap even
      // while the keyboard is up — 'handled' keeps plain background taps dismissing as before.
      keyboardShouldPersistTaps="handled"
      // Centered forms (023): on iOS this scrolls the focused field clear of the keyboard
      // (no-op on Android, where the default `resize` mode re-centers the shrunken viewport).
      automaticallyAdjustKeyboardInsets={center}
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
  // Vertical centering for short content (023, auth forms). flexGrow never shrinks below
  // content height, so overflowing content simply scrolls as before.
  center: { flexGrow: 1, justifyContent: 'center' },
});
