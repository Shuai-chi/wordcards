import { expect, test } from '@playwright/test';
import type { IconAssetRecord } from '../src/lib/iconAssets';
import { createDefaultUiPreferences } from '../src/lib/uiPreferences';
import { areSettingsDraftsEqual, type SettingsDraft } from '../src/lib/settingsDraft';

function draft(): SettingsDraft {
  return {
    limit: 30,
    defLangPref: 'deck',
    appearance: {
      schemaVersion: 1,
      mode: 'system',
      light: { presetId: 'ocean' },
      dark: { presetId: 'midnight' },
      updatedAt: '2026-07-22T00:00:00.000Z',
    },
    uiPreferences: createDefaultUiPreferences('2026-07-22T00:00:00.000Z'),
    iconRecords: [],
  };
}

test('ignores timestamps but detects a user-visible scale change', () => {
  const original = draft();
  const timestampOnly = {
    ...original,
    appearance: { ...original.appearance, updatedAt: 'later' },
    uiPreferences: { ...original.uiPreferences, updatedAt: 'later' },
  };

  expect(areSettingsDraftsEqual(original, timestampOnly)).toBe(true);
  expect(areSettingsDraftsEqual(original, {
    ...original,
    uiPreferences: {
      ...original.uiPreferences,
      scales: { ...original.uiPreferences.scales, base: 1.05 },
    },
  })).toBe(false);
});

test('detects blob identity and transform changes without depending on record order', () => {
  const blobA = new Blob(['a'], { type: 'image/png' });
  const blobB = new Blob(['b'], { type: 'image/png' });
  const recordA: IconAssetRecord = {
    id: 'profile-1:vocab',
    profileId: 'profile-1',
    slot: 'vocab',
    blob: blobA,
    mimeType: 'image/png',
    fileName: 'a.png',
    updatedAt: 'first',
    fit: 'contain',
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
  };
  const recordB: IconAssetRecord = {
    ...recordA,
    id: 'profile-1:phrase',
    slot: 'phrase',
    fileName: 'b.png',
  };
  const withRecords = { ...draft(), iconRecords: [recordA, recordB] };

  expect(areSettingsDraftsEqual(withRecords, {
    ...withRecords,
    iconRecords: [recordB, { ...recordA, updatedAt: 'later' }],
  })).toBe(true);
  expect(areSettingsDraftsEqual(withRecords, {
    ...withRecords,
    iconRecords: [{ ...recordA, blob: blobB }, recordB],
  })).toBe(false);
  expect(areSettingsDraftsEqual(withRecords, {
    ...withRecords,
    iconRecords: [{ ...recordA, zoom: 1.05 }, recordB],
  })).toBe(false);
});

test('detects general, theme, profile, and icon metadata changes', () => {
  const original = draft();
  expect(areSettingsDraftsEqual(original, { ...original, limit: 31 })).toBe(false);
  expect(areSettingsDraftsEqual(original, { ...original, defLangPref: 'bilingual' })).toBe(false);
  expect(areSettingsDraftsEqual(original, {
    ...original,
    appearance: { ...original.appearance, mode: 'dark' },
  })).toBe(false);
  expect(areSettingsDraftsEqual(original, {
    ...original,
    uiPreferences: {
      ...original.uiPreferences,
      iconProfiles: [
        { ...original.uiPreferences.iconProfiles[0], name: '小狗' },
        original.uiPreferences.iconProfiles[1],
        original.uiPreferences.iconProfiles[2],
      ],
    },
  })).toBe(false);
});
