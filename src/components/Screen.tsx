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
  keyboardAware?: boolean;
}

export default function Screen({
  children,
  scroll = true,
  hasHeader = false,
  center = false,
  flushBottom = false,
  tabScreen = false,
  keyboardAware = false,
}: Props) {
  const insets = useSafeAreaInsets();
  // On iOS the tab bar is the native UITabBar (025), whose content view controller hosts each
  // tab's ScrollView with the default contentInsetAdjustmentBehavior — so the native side
  // auto-insets that ScrollView for the safe area, on BOTH edges. Any manual safe-area term we
  // also add on the iOS tab scroll path therefore double-counts. `onNativeTabScroll` is that
  // path; how each remaining class of screen pads is spelled out at `tabBarPad` /
  // `designMarginOnly` below.
  const onNativeTabBar = process.env.EXPO_OS === 'ios';
  const onNativeTabScroll = tabScreen && onNativeTabBar && scroll;
  // Manual tab-bar clearance is reserved ONLY for tab screens whose bar actually overlaps the
  // scroll content: the Android/web custom bar, and the iOS non-scroll Settings tab sitting
  // under the native UITabBar overlay (031, Trap 2). iOS *scrolling* tab screens get clearance
  // from the native UITabBar auto-inset instead (so 0 here, 025), and NON-tab screens —
  // program/[id], workout, routine (root-Stack siblings pushed OVER the tabs) and the signed-out
  // (auth) screens — have no bar at all, so they reserve nothing. Reserving `tabBarHeight` on
  // those non-tab screens was a pure ~64pt empty gap below the last item; `!tabScreen` drops it.
  const tabBarPad = onNativeTabScroll || !tabScreen ? 0 : layout.tabBarHeight;
  // The iOS native auto-inset already covers the safe area too, so a scrolling iOS tab screen
  // needs neither `tabBarHeight` NOR `insets.bottom` — only a design margin. Adding insets.bottom
  // there double-counted the native inset, leaving a ~tab-bar-height trailing gap at the end of
  // scroll. flushBottom (027) likewise keeps only the margin for a bottom-pinned child on the
  // Android/web relative-flow bar.
  const designMarginOnly = onNativeTabScroll || (flushBottom && !onNativeTabBar);
  const pad = {
    // Top: drop the manual `insets.top` whenever a native consumer already supplied the top
    // safe-area inset — a native stack header (021, `hasHeader`) or the native tab content
    // inset (028, `onNativeTabScroll`). Both keep only the design padding; every other path
    // adds the inset manually. (028 is the symmetric top twin of the 025 bottom fix above.)
    paddingTop:
      hasHeader || onNativeTabScroll
        ? layout.screenPaddingTop
        : insets.top + layout.screenPaddingTop,
    paddingBottom: designMarginOnly ? space['2xl'] : insets.bottom + tabBarPad + space['2xl'],
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
      // Centered forms (023) AND opt-in keyboardAware screens (034, the routine intake form): on
      // iOS this scrolls the focused field clear of the keyboard (no-op on Android, where the
      // default `resize` mode re-flows the shrunken viewport so lower inputs stay reachable).
      automaticallyAdjustKeyboardInsets={center || keyboardAware}
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
