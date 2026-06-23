import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/AppText';
import Button from '@/components/Button';
import EmptyState from '@/components/EmptyState';
import FoodSearchResultRow from '@/components/FoodSearchResultRow';
import TextField from '@/components/TextField';
import { type FoodSearchResult, type NewFoodLogEntry } from '@/data/food-types';
import { addFoodLogEntry } from '@/data/add-food-log-entry';
import { searchFoods } from '@/data/search-foods';
import { border, colors, radius, space } from '@/theme';

interface Props {
  date: string;
}

type Phase = 'idle' | 'searching' | 'results' | 'error';

const ERROR_LINES = ['SEARCH UNAVAILABLE', '—', 'TRY AGAIN OR USE MANUAL ENTRY'];
const NONE_LINES = ['NO MATCHES', '—', 'TRY A SIMPLER TERM'];

/**
 * USDA search on-ramp (032): query → pick a result → choose a serving + quantity → log. Macros are
 * computed client-side from the result's per-100 g values × the chosen grams (USDA is the source of
 * truth; the absolute numbers are snapshotted into the entry on save). A 502 (missing key / USDA
 * down) surfaces as an error with a nudge to manual entry. On save it returns to the diary, which
 * refetches on focus.
 */
export default function FoodSearchPanel({ date }: Props) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [queryText, setQueryText] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [selected, setSelected] = useState<FoodSearchResult | null>(null);
  const [servingIndex, setServingIndex] = useState(0);
  const [quantityText, setQuantityText] = useState('1');
  const [saving, setSaving] = useState(false);
  const [addFailed, setAddFailed] = useState(false);

  const onSearch = () => {
    const q = queryText.trim();
    if (q.length === 0) return;
    setPhase('searching');
    setSelected(null);
    searchFoods(getToken, q)
      .then((rows) => {
        setResults(rows);
        setPhase('results');
      })
      .catch(() => {
        setPhase('error');
      });
  };

  const onSelect = (result: FoodSearchResult) => {
    setSelected(result);
    setServingIndex(0);
    setQuantityText('1');
  };

  const option = selected?.servingOptions[servingIndex] ?? null;
  const qty = Number(quantityText);
  const validQty = Number.isFinite(qty) && qty > 0;
  const factor = option !== null && validQty ? (option.grams * qty) / 100 : 0;
  const round1 = (n: number): number => Math.round(n * 10) / 10;

  const onAdd = () => {
    if (selected === null || option === null || !validQty) return;
    const entry: NewFoodLogEntry = {
      loggedOn: date,
      name: selected.name,
      quantity: qty,
      servingLabel: qty === 1 ? option.label : `${String(qty)} × ${option.label}`,
      calories: Math.round(selected.caloriesPer100g * factor),
      proteinG: round1(selected.proteinPer100g * factor),
      carbsG: round1(selected.carbsPer100g * factor),
      fatG: round1(selected.fatPer100g * factor),
      source: 'usda',
      sourceRef: selected.fdcId,
    };
    setSaving(true);
    setAddFailed(false);
    addFoodLogEntry(getToken, entry)
      .then(() => {
        router.back();
      })
      .catch(() => {
        setSaving(false);
        setAddFailed(true);
      });
  };

  return (
    <View>
      <TextField
        label="SEARCH FOODS"
        value={queryText}
        onChangeText={setQueryText}
        autoCapitalize="none"
        placeholder="e.g. chicken breast"
      />
      <View style={styles.searchBtn}>
        <Button
          label={phase === 'searching' ? 'Searching…' : 'Search'}
          onPress={onSearch}
          disabled={queryText.trim().length === 0 || phase === 'searching'}
        />
      </View>

      {selected !== null && option !== null ? (
        <View style={styles.detail}>
          <AppText variant="exerciseName" numberOfLines={2}>
            {selected.name}
          </AppText>
          <View style={styles.servings}>
            {selected.servingOptions.map((opt, i) => (
              <TouchableOpacity
                key={`${opt.label}-${String(opt.grams)}`}
                onPress={() => {
                  setServingIndex(i);
                }}
                accessibilityRole="button"
                style={[styles.chip, i === servingIndex ? styles.chipOn : null]}
              >
                <AppText
                  variant="tag"
                  color={i === servingIndex ? colors.accent : colors.muted}
                >
                  {opt.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
          <TextField
            label="QUANTITY"
            value={quantityText}
            onChangeText={setQuantityText}
            keyboardType="numeric"
            placeholder="1"
          />
          <AppText variant="statLabel" style={styles.preview}>
            {`${String(Math.round(selected.caloriesPer100g * factor))} KCAL  ·  ` +
              `P ${String(round1(selected.proteinPer100g * factor))}  ·  ` +
              `C ${String(round1(selected.carbsPer100g * factor))}  ·  ` +
              `F ${String(round1(selected.fatPer100g * factor))}`}
          </AppText>
          {addFailed ? (
            <AppText variant="statLabel" color={colors.ink} style={styles.error}>
              COULDN’T SAVE — TRY AGAIN
            </AppText>
          ) : null}
          <View style={styles.action}>
            <Button
              label={saving ? 'Adding…' : 'Add to diary'}
              onPress={onAdd}
              disabled={!validQty || saving}
            />
          </View>
        </View>
      ) : phase === 'error' ? (
        <EmptyState lines={ERROR_LINES} />
      ) : phase === 'results' && results.length === 0 ? (
        <EmptyState lines={NONE_LINES} />
      ) : (
        <View style={styles.results}>
          {results.map((result) => (
            <FoodSearchResultRow key={result.fdcId} result={result} onSelect={onSelect} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBtn: { marginTop: space.lg },
  results: { marginTop: space.lg },
  detail: { marginTop: space.xl },
  servings: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  chip: {
    borderWidth: border.thin,
    borderColor: colors.line2,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  preview: { marginTop: space.lg },
  error: { marginTop: space.lg },
  action: { marginTop: space.md },
});
