import { useAuth } from '@clerk/expo';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import AppText from '@/components/AppText';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import EquipmentPicker from '@/components/EquipmentPicker';
import Screen from '@/components/Screen';
import { downscaleImageToDataUrl } from '@/data/downscale-image';
import { scanEquipment } from '@/data/scan-equipment';
import { useEquipmentProfile } from '@/hooks/useEquipmentProfile';
import { border, colors, radius, space } from '@/theme';

// Cap the number of photos sent in one scan — matches the route's server-side bound (042).
const MAX_SCAN_IMAGES = 6;

interface PickedImage {
  uri: string;
  width: number;
  height: number;
}

/**
 * Manage-equipment screen (042) — a pushed route off the Settings tab. Edits the per-user equipment
 * profile against the canonical vocabulary via a grouped picker, and offers an always-available
 * photo-scan: take or upload photos, downscale them client-side, pass them through the LLM, and
 * merge the recognized canonical ids into the selection for review before Save. Images are never
 * stored — they exist only as transient downscaled data URLs sent to the scan route. The saved list
 * is read from the boot-hydrated store; Save persists and converges the slice so the routine intake
 * pre-fill reflects it. Ephemeral editing state lives here; the durable side is the hook.
 */
export default function EquipmentScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { items: saved, save } = useEquipmentProfile();
  const [selected, setSelected] = useState<string[]>(saved);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Abort an in-flight scan if the user leaves mid-request, so it can't keep burning a daily LLM
  // slot after the screen is gone — same AbortController discipline the routine flows use (034).
  useEffect(() => () => abortRef.current?.abort(), []);

  const toggle = (id: string): void => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const runScan = async (assets: PickedImage[]): Promise<void> => {
    const limited = assets.slice(0, MAX_SCAN_IMAGES);
    if (limited.length === 0) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setNotice(null);
    setScanning(true);
    try {
      const images = await Promise.all(
        limited.map((a) => downscaleImageToDataUrl(a.uri, a.width, a.height)),
      );
      const profile = await scanEquipment(getToken, images, controller.signal);
      if (controller.signal.aborted) return;
      setSelected((prev) => [...new Set([...prev, ...profile.items])]);
      setNotice(
        profile.items.length > 0
          ? `Added ${String(profile.items.length)} item${profile.items.length === 1 ? '' : 's'} ` +
              'from your photos. Review and save.'
          : 'No equipment we recognize was found in those photos.',
      );
    } catch {
      if (!controller.signal.aborted) {
        setNotice('We couldn’t read those photos. Try again, or add items manually below.');
      }
    } finally {
      if (!controller.signal.aborted) setScanning(false);
    }
  };

  const takePhoto = async (): Promise<void> => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Enable camera access to scan your equipment.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 1 });
    if (result.canceled) return;
    await runScan(result.assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height })));
  };

  const uploadPhotos = async (): Promise<void> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo access needed', 'Enable photo access to scan your equipment.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (result.canceled) return;
    await runScan(result.assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height })));
  };

  const onSave = async (): Promise<void> => {
    setSaving(true);
    try {
      await save(selected);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch {
      setSaving(false);
      Alert.alert('Couldn’t save', 'Please try again.');
    }
  };

  return (
    <Screen keyboardAware>
      <BackButton />
      <AppText variant="screenTitle" style={styles.title}>
        Your equipment
      </AppText>
      <AppText variant="body" style={styles.blurb}>
        Pick the equipment you can train with, or scan a few photos of your gym and we’ll detect it.
        Your routines are generated from this list.
      </AppText>
      <View style={styles.scanRow}>
        <TouchableOpacity
          onPress={() => void takePhoto()}
          disabled={scanning || saving}
          activeOpacity={0.8}
          accessibilityRole="button"
          style={[styles.scanBtn, scanning || saving ? styles.scanBtnOff : null]}
        >
          <AppText variant="buttonLabel" color={colors.accent}>
            Take a photo
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => void uploadPhotos()}
          disabled={scanning || saving}
          activeOpacity={0.8}
          accessibilityRole="button"
          style={[styles.scanBtn, scanning || saving ? styles.scanBtnOff : null]}
        >
          <AppText variant="buttonLabel" color={colors.accent}>
            Upload photos
          </AppText>
        </TouchableOpacity>
      </View>
      {scanning ? (
        <View style={styles.scanning}>
          <ActivityIndicator color={colors.accent} />
          <AppText variant="bodySub">Reading your photos…</AppText>
        </View>
      ) : notice !== null ? (
        <AppText variant="bodySub" style={styles.notice}>
          {notice}
        </AppText>
      ) : null}
      <EquipmentPicker selected={selected} onToggle={toggle} />
      <View style={styles.cta}>
        <Button
          label={saving ? 'Saving…' : 'Save equipment'}
          onPress={() => void onSave()}
          disabled={saving || scanning}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.lg },
  blurb: { marginTop: space.md },
  scanRow: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  scanBtn: {
    flex: 1,
    borderWidth: border.thin,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: space.lg,
    alignItems: 'center',
  },
  scanBtnOff: { borderColor: colors.line2 },
  scanning: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg },
  notice: { marginTop: space.lg },
  cta: { marginTop: space['2xl'] },
});
