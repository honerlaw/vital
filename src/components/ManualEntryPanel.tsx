import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import Button from '@/components/Button';
import TextField from '@/components/TextField';
import { type NewFoodLogEntry } from '@/data/food-types';
import { addFoodLogEntry } from '@/data/add-food-log-entry';
import { colors, space } from '@/theme';

interface Props {
  date: string;
}

/**
 * Manual diary entry (032): a name plus the four macros, typed directly. Independent of USDA — the
 * fallback path that keeps working when the search key/route is unavailable (a Unit 1 success
 * criterion). Quantity is fixed at 1 with a "1 serving" label; numbers are parsed leniently (blank
 * or junk → 0). On save it logs and returns to the diary, which refetches on focus.
 */
export default function ManualEntryPanel({ date }: Props) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [saving, setSaving] = useState(false);
  const [addFailed, setAddFailed] = useState(false);

  const parse = (text: string): number => {
    const n = Number(text);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const canSave = name.trim().length > 0 && !saving;

  const onAdd = () => {
    if (name.trim().length === 0) return;
    const entry: NewFoodLogEntry = {
      loggedOn: date,
      name: name.trim(),
      quantity: 1,
      servingLabel: '1 serving',
      calories: parse(calories),
      proteinG: parse(protein),
      carbsG: parse(carbs),
      fatG: parse(fat),
      source: 'manual',
      sourceRef: null,
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
        label="FOOD NAME"
        value={name}
        onChangeText={setName}
        autoCapitalize="sentences"
        placeholder="e.g. Chicken breast"
      />
      <TextField
        label="CALORIES"
        value={calories}
        onChangeText={setCalories}
        keyboardType="numeric"
        placeholder="0"
      />
      <TextField
        label="PROTEIN (G)"
        value={protein}
        onChangeText={setProtein}
        keyboardType="numeric"
        placeholder="0"
      />
      <TextField
        label="CARBS (G)"
        value={carbs}
        onChangeText={setCarbs}
        keyboardType="numeric"
        placeholder="0"
      />
      <TextField
        label="FAT (G)"
        value={fat}
        onChangeText={setFat}
        keyboardType="numeric"
        placeholder="0"
      />
      {addFailed ? (
        <AppText variant="statLabel" color={colors.ink} style={styles.error}>
          COULDN’T SAVE — TRY AGAIN
        </AppText>
      ) : null}
      <View style={styles.action}>
        <Button label={saving ? 'Adding…' : 'Add to diary'} onPress={onAdd} disabled={!canSave} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  error: { marginTop: space.xl },
  action: { marginTop: space.md },
});
