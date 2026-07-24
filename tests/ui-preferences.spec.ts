import { expect, test } from '@playwright/test';
import {
  UI_PREFERENCES_STORAGE_KEY,
  UI_SCALE_CONSTRAINTS,
  createDefaultUiPreferences,
  normalizeUiPreferences,
  renameIconProfile,
  resetAllUiScales,
  resetUiScale,
  setUiScale,
} from '../src/lib/uiPreferences';

test.describe('UI preference schema', () => {
  test('uses one constraint map for all safe default scales', () => {
    const settings = createDefaultUiPreferences('2026-07-20T00:00:00.000Z');

    expect(Object.keys(settings.scales)).toEqual(Object.keys(UI_SCALE_CONSTRAINTS));
    for (const [key, constraint] of Object.entries(UI_SCALE_CONSTRAINTS)) {
      expect(settings.scales[key as keyof typeof settings.scales]).toBe(constraint.defaultValue);
    }
    expect(settings.iconProfiles.map(profile => profile.name)).toEqual(['設定 1', '設定 2', '設定 3']);
    expect(settings.activeIconProfileId).toBe('profile-1');
  });

  test('clamps, rounds, and repairs hostile persisted values', () => {
    const settings = normalizeUiPreferences({
      schemaVersion: 1,
      scales: {
        base: -20,
        pageHeading: 99,
        cardTitle: 1.234,
        cardBody: Number.NaN,
        statNumber: Number.POSITIVE_INFINITY,
        icon: 0.91,
        studyPrompt: 99,
        studyContent: -20,
      },
      iconProfiles: [
        { id: 'profile-1', name: '   ' },
        { id: 'profile-2', name: '  我的藍色圖標  ' },
        { id: 'profile-3', name: '123456789012345678901234567890' },
      ],
      activeIconProfileId: 'profile-99',
      updatedAt: 42,
    }, '2026-07-20T01:00:00.000Z');

    expect(settings.scales).toEqual({
      base: 0.9,
      pageHeading: 1.25,
      cardTitle: 1.25,
      cardBody: 1,
      statNumber: 1,
      icon: 0.9,
      studyPrompt: 1.25,
      studyContent: 0.9,
    });
    expect(settings.iconProfiles).toEqual([
      { id: 'profile-1', name: '設定 1' },
      { id: 'profile-2', name: '我的藍色圖標' },
      { id: 'profile-3', name: '123456789012345678901234' },
    ]);
    expect(settings.activeIconProfileId).toBe('profile-1');
    expect(settings.updatedAt).toBe('2026-07-20T01:00:00.000Z');
  });

  test('falls back completely for malformed JSON-shaped input', () => {
    expect(normalizeUiPreferences(null).schemaVersion).toBe(1);
    expect(normalizeUiPreferences({ schemaVersion: 999 }).scales.base).toBe(1);
    expect(UI_PREFERENCES_STORAGE_KEY).toBe('wordforge_ui_preferences_v1');
  });

  test('updates and resets scales without allowing out-of-range values', () => {
    const defaults = createDefaultUiPreferences('2026-07-20T00:00:00.000Z');
    const enlarged = setUiScale(defaults, 'statNumber', 9);
    expect(enlarged.scales.statNumber).toBe(1.3);
    expect(resetUiScale(enlarged, 'statNumber').scales.statNumber).toBe(1);

    const changed = setUiScale(setUiScale(defaults, 'base', 0.9), 'icon', 1.25);
    expect(resetAllUiScales(changed).scales).toEqual(defaults.scales);
  });

  test('keeps an editable profile-name draft and repairs it only during normalization', () => {
    const defaults = createDefaultUiPreferences('2026-07-20T00:00:00.000Z');
    const blankDraft = renameIconProfile(defaults, 'profile-2', '');
    expect(blankDraft.iconProfiles[1].name).toBe('');
    expect(renameIconProfile(blankDraft, 'profile-2', '小狗').iconProfiles[1].name).toBe('小狗');
    expect(normalizeUiPreferences(blankDraft).iconProfiles[1].name).toBe('設定 2');
  });

  test('applies all eight normalized scales to root CSS variables', async ({ page }) => {
    await page.goto('/');
    const settings = createDefaultUiPreferences('2026-07-20T00:00:00.000Z');
    settings.scales.base = 1.15;
    settings.scales.statNumber = 1.3;
    settings.scales.studyPrompt = 1.25;
    settings.scales.studyContent = 1.2;

    const values = await page.evaluate(async ({ settings }) => {
      const { applyUiPreferences: applyInBrowser } = await import('http://localhost:5173/src/lib/uiPreferences.ts');
      const root = document.documentElement;
      applyInBrowser(settings, root);
      return {
        base: root.style.getPropertyValue('--font-scale-base'),
        heading: root.style.getPropertyValue('--font-scale-heading'),
        cardTitle: root.style.getPropertyValue('--font-scale-card-title'),
        cardBody: root.style.getPropertyValue('--font-scale-card-body'),
        statNumber: root.style.getPropertyValue('--font-scale-stat-number'),
        icon: root.style.getPropertyValue('--icon-scale'),
        studyPrompt: root.style.getPropertyValue('--font-scale-study-prompt'),
        studyContent: root.style.getPropertyValue('--font-scale-study-content'),
      };
    }, { settings });

    expect(values).toEqual({
      base: '1.15',
      heading: '1',
      cardTitle: '1',
      cardBody: '1',
      statNumber: '1.3',
      icon: '1',
      studyPrompt: '1.25',
      studyContent: '1.2',
    });
  });
});
