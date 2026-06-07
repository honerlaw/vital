/// <reference types="node" />
/**
 * Tests the avatar color offline (023). The binding property: every background the function
 * can emit keeps white text at WCAG AA (≥ 4.5:1) — asserted mechanically over a sweep of
 * email-shaped AND id-shaped seeds (the Settings screen falls back to the Clerk user id
 * when no primary email exists) large enough to cover essentially the whole hue space,
 * which the unique-color floor assertion makes explicit.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { avatarColor } from '@/utils/avatarColor';

const SEEDS: string[] = [];
for (let i = 0; i < 1500; i += 1) {
  SEEDS.push(`user${String(i)}@example.com`, `user_2x${String(i)}Kq`);
}

void test('same seed always produces the same color', () => {
  for (const seed of ['a@b.co', 'user_2xKq91', 'long.email+tag@example.dev']) {
    assert.equal(avatarColor(seed), avatarColor(seed));
  }
});

void test('emits a lowercase 6-digit hex color', () => {
  for (const seed of SEEDS) {
    assert.match(avatarColor(seed), /^#[0-9a-f]{6}$/);
  }
});

void test('white text clears WCAG AA (>= 4.5:1) on every generated background', () => {
  const distinct = new Set<string>();
  for (const seed of SEEDS) {
    const hex = avatarColor(seed);
    distinct.add(hex);
    const [r, g, b] = [1, 3, 5].map((at) => {
      const srgb = parseInt(hex.slice(at, at + 2), 16) / 255;
      return srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
    });
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const contrastVsWhite = 1.05 / (luminance + 0.05);
    assert.ok(
      contrastVsWhite >= 4.5,
      `${hex} (seed "${seed}") contrast ${contrastVsWhite.toFixed(3)} < 4.5`,
    );
  }
  // Coverage floor: 3000 hashed seeds over 360 hues should land nearly all of them; a low
  // count would mean the sweep silently stopped exercising the hue space.
  assert.ok(distinct.size >= 350, `only ${String(distinct.size)} distinct colors generated`);
});
