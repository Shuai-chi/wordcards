import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { UI_PREFERENCES_STORAGE_KEY } from '../src/lib/uiPreferences';

async function openSettings(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByTitle('設定').click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test('saving keeps settings open and establishes a clean baseline', async ({ page }) => {
  await openSettings(page);
  await page.getByTestId('scale-base-increase').click();
  await page.getByTestId('settings-save').click();

  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByTestId('settings-save')).toBeDisabled();
  await expect(page.getByTestId('settings-save-state')).toContainText('已儲存');

  await page.getByTestId('settings-close').click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

for (const exit of ['x', 'overlay', 'escape'] as const) {
  test(`dirty ${exit} exit requires confirmation and return keeps the draft`, async ({ page }) => {
    await openSettings(page);
    await page.getByTestId('scale-base-increase').click();

    if (exit === 'x') await page.getByTestId('settings-close').click();
    if (exit === 'overlay') {
      await page.getByTestId('settings-overlay').click({ position: { x: 3, y: 3 } });
    }
    if (exit === 'escape') await page.keyboard.press('Escape');

    await expect(page.getByRole('alertdialog')).toBeVisible();
    if (exit === 'escape') {
      await page.keyboard.press('Escape');
    } else {
      await page.getByTestId('settings-return-editing').click();
    }
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByTestId('scale-base')).toHaveValue('105');

    await page.getByTestId('settings-close').click();
    await page.getByTestId('settings-discard-close').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
}

test('discard restores the live CSS preview and closes settings', async ({ page }) => {
  await openSettings(page);
  const original = await page.evaluate(() => (
    getComputedStyle(document.documentElement).getPropertyValue('--font-scale-base').trim()
  ));
  await page.getByTestId('scale-base-increase').click();
  await expect.poll(() => page.evaluate(() => (
    getComputedStyle(document.documentElement).getPropertyValue('--font-scale-base').trim()
  ))).not.toBe(original);

  await page.getByTestId('settings-close').click();
  await page.getByTestId('settings-discard-close').click();
  await expect.poll(() => page.evaluate(() => (
    getComputedStyle(document.documentElement).getPropertyValue('--font-scale-base').trim()
  ))).toBe(original);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('settings exposes keyboard tabs and bounded percentage steppers with live preview', async ({ page }) => {
  await openSettings(page);

  const tablist = page.getByRole('tablist');
  const appearanceTab = page.getByRole('tab', { name: '外觀' });
  const iconsTab = page.getByRole('tab', { name: '圖標' });
  const generalTab = page.getByRole('tab', { name: '一般與備份' });
  await expect(tablist).toBeVisible();
  await expect(appearanceTab).toHaveAttribute('aria-selected', 'true');
  await appearanceTab.press('ArrowRight');
  await expect(iconsTab).toHaveAttribute('aria-selected', 'true');
  await iconsTab.press('ArrowRight');
  await expect(generalTab).toHaveAttribute('aria-selected', 'true');
  await generalTab.press('ArrowRight');
  await expect(appearanceTab).toHaveAttribute('aria-selected', 'true');

  const statScale = page.getByTestId('scale-statNumber');
  await expect(statScale).toHaveAttribute('min', '90');
  await expect(statScale).toHaveAttribute('max', '130');
  await expect(statScale).toHaveAttribute('step', '5');
  await expect(statScale).toHaveValue('100');
  const previewNumber = page.getByTestId('appearance-preview-stat-number');
  const initialPreviewSize = Number.parseFloat(await previewNumber.evaluate(element => getComputedStyle(element).fontSize));

  await page.getByTestId('scale-statNumber-increase').click();
  await expect(statScale).toHaveValue('105');
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--font-scale-stat-number').trim())).toBe('1.05');
  expect(Number.parseFloat(await previewNumber.evaluate(element => getComputedStyle(element).fontSize))).toBeGreaterThan(initialPreviewSize);

  await statScale.fill('130');
  await statScale.press('Enter');
  await expect(statScale).toHaveValue('130');
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--font-scale-stat-number').trim())).toBe('1.3');

  await page.getByTestId('scale-statNumber-reset').click();
  await expect(statScale).toHaveValue('100');
  await page.getByTestId('scale-base').fill('90');
  await page.getByTestId('scale-base').press('Enter');
  await page.getByTestId('scale-icon').fill('125');
  await page.getByTestId('scale-icon').press('Enter');
  await page.getByTestId('scale-reset-all').click();
  await expect(page.getByTestId('scale-base')).toHaveValue('100');
  await expect(page.getByTestId('scale-icon')).toHaveValue('100');

  await statScale.fill('130');
  await statScale.press('Enter');
  await page.getByTestId('settings-save').click();
  await expect(page.getByTestId('settings-save-state')).toContainText('已儲存');
  await page.reload();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--font-scale-stat-number').trim())).toBe('1.3');
});

test('percentage input may be temporarily empty and normalizes on commit', async ({ page }) => {
  await openSettings(page);
  const cardTitle = page.getByTestId('scale-cardTitle');
  await cardTitle.fill('');
  await expect(cardTitle).toHaveValue('');
  await cardTitle.fill('127');
  await expect(cardTitle).toHaveValue('127');
  await cardTitle.press('Enter');
  await expect(cardTitle).toHaveValue('125');
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--font-scale-card-title').trim())).toBe('1.25');

  await cardTitle.fill('');
  await cardTitle.blur();
  await expect(cardTitle).toHaveValue('125');
});

test('settings header tabs and preview stay fixed while only content scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSettings(page);
  const header = page.getByTestId('settings-fixed-header');
  const preview = page.getByTestId('settings-preview-dock');
  const scroll = page.getByTestId('settings-scroll-region');
  await page.waitForTimeout(350);
  const before = await Promise.all([header.boundingBox(), preview.boundingBox()]);

  await scroll.evaluate(element => { element.scrollTop = element.scrollHeight; });

  const after = await Promise.all([header.boundingBox(), preview.boundingBox()]);
  expect(after[0]?.y).toBeCloseTo(before[0]!.y, 0);
  expect(after[1]?.y).toBeCloseTo(before[1]!.y, 0);
  expect(await scroll.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
});

test('scale controls use three two and one columns by container width', async ({ page }) => {
  for (const [width, expected] of [[1024, 3], [390, 2], [320, 1]] as const) {
    await page.setViewportSize({ width, height: 844 });
    await openSettings(page);
    const cards = page.locator('.scale-control');
    const tops = await cards.evaluateAll(elements => (
      elements.map(element => Math.round(element.getBoundingClientRect().top))
    ));
    const firstRowCount = tops.filter(top => Math.abs(top - tops[0]) <= 1).length;
    expect(firstRowCount).toBe(expected);
    const stepperTops = await cards.first().locator('.scale-stepper > *').evaluateAll(elements => (
      elements.map(element => Math.round(element.getBoundingClientRect().top))
    ));
    expect(Math.max(...stepperTops) - Math.min(...stepperTops)).toBeLessThanOrEqual(1);
    const stepperMetrics = await cards.first().locator('.scale-stepper').evaluate(element => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      bounds: Array.from(element.children).map(child => child.getBoundingClientRect().toJSON()),
    }));
    expect(stepperMetrics.scrollWidth).toBeLessThanOrEqual(stepperMetrics.clientWidth);
    expect(stepperMetrics.bounds[0].right).toBeLessThanOrEqual(stepperMetrics.bounds[1].x + 0.5);
    expect(stepperMetrics.bounds[1].right).toBeLessThanOrEqual(stepperMetrics.bounds[2].x + 0.5);
    await page.getByTestId('settings-close').click();
  }
});

test('base and study scales each resize their matching fixed preview', async ({ page }) => {
  await openSettings(page);
  const base = page.getByTestId('appearance-preview-base-text');
  const prompt = page.getByTestId('appearance-preview-study-prompt');
  const answer = page.getByTestId('appearance-preview-study-content');
  const size = async (locator: typeof base) => Number.parseFloat(
    await locator.evaluate(element => getComputedStyle(element).fontSize),
  );
  const before = [await size(base), await size(prompt), await size(answer)];

  await page.getByTestId('scale-base-increase').click();
  await page.getByTestId('scale-studyPrompt-increase').click();
  await page.getByTestId('scale-studyContent-increase').click();

  expect(await size(base)).toBeGreaterThan(before[0]);
  expect(await size(prompt)).toBeGreaterThan(before[1]);
  expect(await size(answer)).toBeGreaterThan(before[2]);
});

test('icon dock follows active profile upload transform and removal', async ({ page }) => {
  const png = await readFile(resolve('public/pwa-192.png'));
  await openSettings(page);
  await page.getByRole('tab', { name: '圖標' }).click();
  await expect(page.getByTestId('icon-preview-dock')).toBeVisible();

  await page.getByTestId('icon-upload-vocab').setInputFiles({
    name: 'preview.jpg',
    mimeType: 'image/jpeg',
    buffer: png,
  });
  const dockImage = page.getByTestId('icon-dock-vocab').locator('img');
  await expect(dockImage).toBeVisible();
  await page.getByTestId('icon-zoom-vocab').fill('1.5');
  await expect.poll(() => dockImage.getAttribute('style')).toContain('scale(1.5)');
  await page.getByTestId('icon-remove-vocab').click();
  await expect(dockImage).toHaveCount(0);
});

test('hostile localStorage scale values are clamped before they reach CSS', async ({ page }) => {
  await page.addInitScript(key => {
    localStorage.setItem(key, JSON.stringify({
      schemaVersion: 1,
      scales: { base: -5, pageHeading: 9, cardTitle: 9, cardBody: -5, statNumber: 9, icon: -5 },
      iconProfiles: [
        { id: 'profile-1', name: '設定 1' },
        { id: 'profile-2', name: '設定 2' },
        { id: 'profile-3', name: '設定 3' },
      ],
      activeIconProfileId: 'profile-1',
      updatedAt: 'invalid-but-harmless',
    }));
  }, UI_PREFERENCES_STORAGE_KEY);
  await page.goto('/');

  const values = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      base: style.getPropertyValue('--font-scale-base').trim(),
      heading: style.getPropertyValue('--font-scale-heading').trim(),
      cardTitle: style.getPropertyValue('--font-scale-card-title').trim(),
      cardBody: style.getPropertyValue('--font-scale-card-body').trim(),
      stat: style.getPropertyValue('--font-scale-stat-number').trim(),
      icon: style.getPropertyValue('--icon-scale').trim(),
    };
  });
  expect(values).toEqual({ base: '0.9', heading: '1.25', cardTitle: '1.25', cardBody: '0.9', stat: '1.3', icon: '0.8' });
});

test('three named icon profiles upload, edit, persist, and individually restore fallback icons', async ({ page }) => {
  const jpeg = await readFile(resolve('public/pwa-192.png'));
  await openSettings(page);
  await page.getByRole('tab', { name: '圖標' }).click();

  await expect(page.locator('.icon-profile-button')).toHaveCount(3);
  await page.getByTestId('icon-profile-2').click();
  await page.getByTestId('icon-profile-name').fill('旅行圖標');
  await page.getByTestId('icon-upload-vocab').setInputFiles({
    name: 'travel.jpg',
    mimeType: 'image/jpeg',
    buffer: jpeg,
  });

  const preview = page.getByTestId('icon-preview-vocab');
  await expect(preview.locator('img')).toBeVisible();
  const previewBox = await preview.boundingBox();
  expect(previewBox).not.toBeNull();
  await page.mouse.move(previewBox!.x + previewBox!.width / 2, previewBox!.y + previewBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(previewBox!.x + previewBox!.width * 0.7, previewBox!.y + previewBox!.height * 0.6);
  await page.mouse.up();
  await expect.poll(() => preview.locator('img').getAttribute('style')).not.toContain('translate(0%, 0%)');
  await page.getByTestId('icon-fit-cover-vocab').click();
  await page.getByTestId('icon-zoom-vocab').fill('1.5');
  await expect(page.getByTestId('icon-zoom-value-vocab')).toHaveText('150%');
  await page.getByTestId('settings-save').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByTestId('settings-save-state')).toContainText('已儲存');

  await page.reload();
  await page.getByTitle('設定').click();
  await page.getByRole('tab', { name: '圖標' }).click();
  await expect(page.getByTestId('icon-profile-name')).toHaveValue('旅行圖標');
  await expect(page.getByTestId('icon-preview-vocab').locator('img')).toBeVisible();
  await expect(page.getByTestId('icon-zoom-value-vocab')).toHaveText('150%');

  await page.getByTestId('icon-remove-vocab').click();
  await expect(page.getByTestId('icon-preview-vocab').locator('img')).toHaveCount(0);
  await page.getByTestId('settings-save').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByTestId('settings-save-state')).toContainText('已儲存');
  await page.reload();
  await expect(page.getByTestId('mode-card-vocab').getByTestId('custom-icon').locator('img')).toHaveCount(0);
});

test('profile name may stay empty while editing and falls back only when saved', async ({ page }) => {
  await openSettings(page);
  await page.getByRole('tab', { name: '圖標' }).click();

  const name = page.getByTestId('icon-profile-name');
  await name.fill('');
  await expect(name).toHaveValue('');
  await name.fill('小狗');
  await expect(name).toHaveValue('小狗');
  await expect(page.getByTestId('icon-profile-1')).toHaveText('小狗');

  await name.fill('');
  await expect(name).toHaveValue('');
  await page.getByTestId('settings-save').click();
  await expect(page.getByTestId('settings-save-state')).toContainText('已儲存');
  await page.reload();
  await page.getByTitle('設定').click();
  await page.getByRole('tab', { name: '圖標' }).click();
  await expect(page.getByTestId('icon-profile-name')).toHaveValue('設定 1');
});

test('settings tabs and maximum scales do not overflow a 320px viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await openSettings(page);
  for (const key of ['base', 'pageHeading', 'cardTitle', 'cardBody', 'statNumber', 'icon', 'studyPrompt', 'studyContent']) {
    const input = page.getByTestId(`scale-${key}`);
    await input.fill(await input.getAttribute('max') ?? '100');
    await input.press('Enter');
  }
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  const [modePreview, studyPreview] = await Promise.all([
    page.getByTestId('appearance-preview-mode-card').boundingBox(),
    page.getByTestId('appearance-preview-study-card').boundingBox(),
  ]);
  expect(modePreview && studyPreview).toBeTruthy();
  expect(studyPreview!.x).toBeGreaterThanOrEqual(modePreview!.x + modePreview!.width);
  await expect(page.getByRole('tab', { name: '外觀' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '圖標' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '一般與備份' })).toBeVisible();
});
