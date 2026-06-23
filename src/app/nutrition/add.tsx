import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/AppText';
import BackButton from '@/components/BackButton';
import FoodSearchPanel from '@/components/FoodSearchPanel';
import ManualEntryPanel from '@/components/ManualEntryPanel';
import Screen from '@/components/Screen';
import { todayLocalDay } from '@/utils/todayLocalDay';
import { border, colors, radius, space } from '@/theme';

type Mode = 'search' | 'manual';

const MODES: { key: Mode; label: string }[] = [
  { key: 'search', label: 'Search' },
  { key: 'manual', label: 'Manual' },
];

/**
 * Add-food flow (032) — a top-level route (005), not a tab, reached from the Nutrition tab's Add
 * button. It carries the diary `date` as a param so a logged entry lands on the day the user was
 * viewing (defaulting to today on a cold deep-link). A segmented toggle switches between the USDA
 * search on-ramp and manual entry; each panel logs and returns to the diary itself.
 */
export default function AddFoodScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const date =
    typeof params.date === 'string' && params.date.length > 0 ? params.date : todayLocalDay();
  const [mode, setMode] = useState<Mode>('search');

  return (
    <Screen>
      <BackButton />
      <AppText variant="screenTitle" style={styles.title}>
        Add Food
      </AppText>
      <View style={styles.toggle}>
        {MODES.map((m) => (
          <TouchableOpacity
            key={m.key}
            onPress={() => {
              setMode(m.key);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === m.key }}
            style={[styles.segment, mode === m.key ? styles.segmentOn : null]}
          >
            <AppText variant="buttonLabel" color={mode === m.key ? colors.onAccent : colors.muted}>
              {m.label}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
      {mode === 'search' ? <FoodSearchPanel date={date} /> : <ManualEntryPanel date={date} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.sm, marginBottom: space.lg },
  toggle: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.lg,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.md,
    borderWidth: border.thin,
    borderColor: colors.line2,
    borderRadius: radius.md,
  },
  segmentOn: { backgroundColor: colors.accent, borderColor: colors.accent },
});
