import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import Button from '@/components/Button';
import DayNavHeader from '@/components/DayNavHeader';
import EmptyState from '@/components/EmptyState';
import FoodLogRow from '@/components/FoodLogRow';
import Screen from '@/components/Screen';
import StatRow from '@/components/StatRow';
import { deleteFoodLogEntry } from '@/data/delete-food-log-entry';
import { useFoodLog } from '@/hooks/useFoodLog';
import { diaryDayLabel } from '@/utils/diaryDayLabel';
import { shiftLocalDay } from '@/utils/shiftLocalDay';
import { sumMacros } from '@/utils/sumMacros';
import { todayLocalDay } from '@/utils/todayLocalDay';
import { space } from '@/theme';

const EMPTY_LINES = ['NOTHING LOGGED', '—', 'ADD A FOOD TO START THIS DAY'];
const ERROR_LINES = ['COULDN’T LOAD THIS DAY', '—', 'RETURN TO THE TAB TO RETRY'];
const LOADING_LINES = ['LOADING…'];

/**
 * The Nutrition tab (032) — Unit 1 of food tracking. Shows one local day's diary: a prev/next day
 * header, the running calorie/protein/carbs/fat totals, and the day's entries (delete inline). The
 * selected day is local component state; entries are a date-scoped fetch-on-mount resource
 * (`useFoodLog`) kept OUT of the global reducer and boot-gate. Adding a food is a top-level route
 * (005) reached via the Add button, carrying the current day so the entry lands on the right day.
 */
export default function NutritionScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const today = todayLocalDay();
  const [day, setDay] = useState(today);
  const { entries, status, reload } = useFoodLog(day);

  const onDelete = useCallback(
    (id: string) => {
      deleteFoodLogEntry(getToken, id)
        .then(reload)
        .catch(() => {
          // Swallow — the row stays until the next focus refetch reconciles it.
        });
    },
    [getToken, reload],
  );

  const totals = sumMacros(entries);
  const empty = entries.length === 0;
  const emptyLines =
    status === 'error' ? ERROR_LINES : status === 'loading' ? LOADING_LINES : EMPTY_LINES;

  return (
    <Screen tabScreen>
      <AppText variant="screenTitle" style={styles.title}>
        Nutrition
      </AppText>
      <DayNavHeader
        label={diaryDayLabel(day, today)}
        onPrev={() => {
          setDay((d) => shiftLocalDay(d, -1));
        }}
        onNext={() => {
          setDay((d) => shiftLocalDay(d, 1));
        }}
      />
      <StatRow
        cells={[
          { label: 'KCAL', value: String(Math.round(totals.calories)) },
          { label: 'PROTEIN', value: `${String(Math.round(totals.proteinG))}g` },
          { label: 'CARBS', value: `${String(Math.round(totals.carbsG))}g` },
          { label: 'FAT', value: `${String(Math.round(totals.fatG))}g` },
        ]}
      />
      <View style={styles.add}>
        <Button
          label="+ Add food"
          onPress={() => {
            router.push({ pathname: '/nutrition/add', params: { date: day } });
          }}
        />
      </View>
      <View style={styles.list}>
        {empty ? (
          <EmptyState lines={emptyLines} />
        ) : (
          entries.map((entry) => (
            <FoodLogRow key={entry.id} entry={entry} onDelete={onDelete} />
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.lg },
  add: { marginTop: space.xl },
  list: { marginTop: space.xl },
});
