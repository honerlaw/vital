import { type FoodSource } from '@/data/food-types';

/** Guard for the closed `FoodSource` vocabulary (032): 'usda' or 'manual'. */
export function isFoodSource(value: unknown): value is FoodSource {
  return value === 'usda' || value === 'manual';
}
