import { type FoodServingOption } from '@/data/food-types';
import { isMacroNumber } from '@/data/guards/isMacroNumber';

/** Guard for one selectable serving (032): a non-empty label and a finite, POSITIVE grams (a
 * zero-gram serving would zero out every macro the user logs against it). */
export function isFoodServingOption(value: unknown): value is FoodServingOption {
  return (
    typeof value === 'object' &&
    value !== null &&
    'label' in value &&
    typeof value.label === 'string' &&
    value.label.length > 0 &&
    'grams' in value &&
    isMacroNumber(value.grams) &&
    value.grams > 0
  );
}
