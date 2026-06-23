import { StyleSheet, TouchableOpacity } from 'react-native';
import AppText from '@/components/AppText';
import { type FoodSearchResult } from '@/data/food-types';
import { border, colors, space } from '@/theme';

interface Props {
  result: FoodSearchResult;
  onSelect: (result: FoodSearchResult) => void;
}

/** One USDA search hit (032): the food name and its per-100 g calories; tap to pick it. */
export default function FoodSearchResultRow({ result, onSelect }: Props) {
  return (
    <TouchableOpacity
      onPress={() => {
        onSelect(result);
      }}
      accessibilityRole="button"
      activeOpacity={0.7}
      style={styles.row}
    >
      <AppText variant="exerciseName" numberOfLines={2} style={styles.name}>
        {result.name}
      </AppText>
      <AppText variant="scheme">
        {`${String(Math.round(result.caloriesPer100g))} kcal / 100 g`}
      </AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: space.md,
    borderBottomWidth: border.hairline,
    borderBottomColor: colors.line,
  },
  name: { marginBottom: 3 },
});
