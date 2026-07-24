import { test, expect } from '@playwright/test';
import {
  APPEARANCE_STORAGE_KEY,
  THEME_PRESETS,
  getThemeContrastIssues,
} from '../src/lib/theme';

test.describe('appearance settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
  });

  test('migrates the old theme key into versioned settings', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('srs_theme', 'dark'));
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme-preset', 'midnight');
    await expect.poll(() => page.evaluate(key => localStorage.getItem(key), APPEARANCE_STORAGE_KEY)).not.toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('srs_theme'))).toBeNull();
  });

  test('previews, saves, and restores a dark preset after reload', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('設定').click();
    await page.getByTestId('theme-mode-dark').click();
    await page.getByTestId('theme-preset-deep-forest').click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme-preset', 'deep-forest');
    await page.getByTestId('settings-save').click();
    await expect(page.getByTestId('settings-save-state')).toContainText('已儲存');
    await page.getByTestId('settings-close').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme-preset', 'deep-forest');
  });

  test('discard confirmation restores a live theme preview', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('設定').click();
    await page.getByTestId('theme-preset-amber').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme-preset', 'amber');

    await page.getByTestId('settings-close').click();
    await page.getByTestId('settings-discard-close').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme-preset', 'ocean');
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}'), APPEARANCE_STORAGE_KEY);
    expect(saved.light.presetId).toBe('ocean');
  });

  test('blocks a custom palette with insufficient contrast', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('設定').click();
    await page.getByTestId('theme-color-primary').fill('#F8FAFC');

    await expect(page.getByTestId('theme-contrast-warning')).toBeVisible();
    await expect(page.getByTestId('settings-save')).toBeDisabled();
  });

  test('corrupt settings safely fall back to the system theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript(key => localStorage.setItem(key, '{broken-json'), APPEARANCE_STORAGE_KEY);
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme-preset', 'midnight');
  });

  test('settings remain usable in a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByTitle('設定').click();

    const cardColor = page.getByTestId('theme-color-card');
    await cardColor.scrollIntoViewIfNeeded();
    await expect(cardColor).toBeVisible();
    await page.getByTestId('settings-save').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('settings-save')).toBeVisible();
  });
});

test('all recommended palettes pass the deterministic contrast gate', () => {
  for (const mode of ['light', 'dark'] as const) {
    for (const preset of THEME_PRESETS[mode]) {
      expect(getThemeContrastIssues(preset, mode), `${mode}/${preset.id}`).toEqual([]);
    }
  }
});
