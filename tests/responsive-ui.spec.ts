import { expect, test, type Page } from '@playwright/test';
import { formatStatDisplay } from '../src/lib/statDisplay';
import {
  installFakeSpeechSynthesis,
  openListeningMode,
  seedSelectedDeck,
} from './helpers/listening';

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
}

async function getCardBoxes(page: Page, selector: string) {
  return page.locator(selector).evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  }));
}

async function applyScaleVariant(page: Page, variant: 'min' | 'max') {
  const scales = variant === 'max'
    ? { base: 1.15, pageHeading: 1.25, cardTitle: 1.25, cardBody: 1.15, statNumber: 1.3, icon: 1.25 }
    : { base: 0.9, pageHeading: 0.9, cardTitle: 0.9, cardBody: 0.9, statNumber: 0.9, icon: 0.8 };
  await page.evaluate(nextScales => {
    localStorage.setItem('wordforge_ui_preferences_v1', JSON.stringify({
      schemaVersion: 1,
      scales: nextScales,
      iconProfiles: [
        { id: 'profile-1', name: '設定 1' },
        { id: 'profile-2', name: '設定 2' },
        { id: 'profile-3', name: '設定 3' },
      ],
      activeIconProfileId: 'profile-1',
      updatedAt: '2026-07-20T00:00:00.000Z',
    }));
  }, scales);
  await page.goto('/');
}

test('mode cards place the icon and enlarged title in one primary row', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  for (const mode of ['vocab', 'phrase']) {
    const card = page.getByTestId(`mode-card-${mode}`);
    const primary = card.getByTestId('mode-primary');
    await expect(primary.getByTestId('custom-icon')).toBeVisible();
    await expect(primary.getByTestId('mode-title')).toBeVisible();

    const [iconBox, titleBox] = await Promise.all([
      primary.getByTestId('custom-icon').boundingBox(),
      primary.getByTestId('mode-title').boundingBox(),
    ]);
    expect(iconBox).not.toBeNull();
    expect(titleBox).not.toBeNull();
    expect(Math.abs((iconBox!.y + iconBox!.height / 2) - (titleBox!.y + titleBox!.height / 2))).toBeLessThan(4);
    expect(Number.parseFloat(await primary.getByTestId('mode-title').evaluate(element => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(30);
  }
});

test('stat cards use icon-plus-Chinese-label on the left and a number-only right column', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByTestId('mode-card-vocab').click();

  const cards = page.getByTestId(/^stat-card-/);
  await expect(cards).toHaveCount(4);
  for (const card of await cards.all()) {
    const left = card.getByTestId('stat-left');
    const iconZone = card.getByTestId('stat-icon-zone');
    const label = card.getByTestId('stat-label');
    const number = card.getByTestId('stat-number');
    await expect(iconZone.getByTestId('custom-icon')).toBeVisible();
    await expect(number).toHaveText(/^\d+$/);
    expect((await number.locator('*').count())).toBe(0);
    expect(Number.parseFloat(await number.evaluate(element => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(30);

    const [cardBox, leftBox, numberBox, iconBox, labelBox] = await Promise.all([
      card.boundingBox(), left.boundingBox(), number.boundingBox(), iconZone.boundingBox(), label.boundingBox(),
    ]);
    expect(cardBox && leftBox && numberBox && iconBox && labelBox).toBeTruthy();
    expect(numberBox!.width / leftBox!.width).toBeGreaterThan(1.9);
    expect(numberBox!.width / leftBox!.width).toBeLessThan(2.1);
    expect(iconBox!.height / labelBox!.height).toBeGreaterThan(1.9);
    expect(iconBox!.height / labelBox!.height).toBeLessThan(2.1);
    expect(leftBox!.x + leftBox!.width).toBeLessThanOrEqual(numberBox!.x + 1);
  }
  await expect(page.getByText('張卡片', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Hard', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Good', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Easy', { exact: true })).toHaveCount(0);
});

test('stat display keeps three digits and caps abnormal daily counts', () => {
  expect(formatStatDisplay(0)).toBe('0');
  expect(formatStatDisplay(999)).toBe('999');
  expect(formatStatDisplay(1000)).toBe('999+');
  expect(formatStatDisplay(1248)).toBe('999+');
});

for (const viewport of [
  { name: 'small phone', width: 320, height: 720, modeColumns: 1, statColumns: 2 },
  { name: 'phone', width: 390, height: 844, modeColumns: 1, statColumns: 2 },
  { name: 'large phone', width: 430, height: 932, modeColumns: 1, statColumns: 2 },
  { name: 'tablet', width: 768, height: 1024, modeColumns: 2, statColumns: 4 },
  { name: 'small desktop', width: 1024, height: 768, modeColumns: 2, statColumns: 4 },
  { name: 'desktop', width: 1440, height: 900, modeColumns: 2, statColumns: 4 },
  { name: 'phone landscape', width: 844, height: 390, modeColumns: 2, statColumns: 4 },
  { name: 'large phone landscape', width: 932, height: 430, modeColumns: 2, statColumns: 4 },
]) {
  test(`${viewport.name} reflows without overlap or horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    await expectNoHorizontalOverflow(page);

    const modeBoxes = await getCardBoxes(page, '[data-testid^="mode-card-"]');
    expect(modeBoxes).toHaveLength(2);
    if (viewport.modeColumns === 1) {
      expect(Math.abs(modeBoxes[0].x - modeBoxes[1].x)).toBeLessThan(2);
      expect(modeBoxes[1].y).toBeGreaterThanOrEqual(modeBoxes[0].bottom);
    } else {
      expect(Math.abs(modeBoxes[0].y - modeBoxes[1].y)).toBeLessThan(2);
      expect(modeBoxes[1].x).toBeGreaterThan(modeBoxes[0].x + modeBoxes[0].width - 2);
    }

    await page.getByTestId('mode-card-vocab').click();
    await expectNoHorizontalOverflow(page);
    const statBoxes = await getCardBoxes(page, '[data-testid^="stat-card-"]');
    expect(statBoxes).toHaveLength(4);
    expect(statBoxes.every(box => box.width > 0 && box.height > 0)).toBe(true);
    expect(Math.max(...statBoxes.map(box => box.height)) - Math.min(...statBoxes.map(box => box.height))).toBeLessThan(2);
    if (viewport.statColumns === 2) {
      expect(Math.abs(statBoxes[0].y - statBoxes[1].y)).toBeLessThan(2);
      expect(Math.abs(statBoxes[2].y - statBoxes[3].y)).toBeLessThan(2);
      expect(statBoxes[2].y).toBeGreaterThanOrEqual(statBoxes[0].bottom);
    } else {
      expect(Math.max(...statBoxes.map(box => box.y)) - Math.min(...statBoxes.map(box => box.y))).toBeLessThan(2);
    }

    for (const variant of ['min', 'max'] as const) {
      await applyScaleVariant(page, variant);
      await expectNoHorizontalOverflow(page);
      for (const card of await page.getByTestId(/^mode-card-/).all()) {
        const icon = await card.getByTestId('custom-icon').boundingBox();
        const title = await card.getByTestId('mode-title').boundingBox();
        expect(icon).not.toBeNull();
        expect(title).not.toBeNull();
        expect(icon!.x + icon!.width).toBeLessThanOrEqual(title!.x + 1);
        expect(title!.width).toBeGreaterThan(0);
      }
      await page.getByTestId('mode-card-vocab').click();
      await expectNoHorizontalOverflow(page);
      for (const card of await page.getByTestId(/^stat-card-/).all()) {
        const label = await card.getByTestId('stat-label').boundingBox();
        const number = await card.getByTestId('stat-number').boundingBox();
        expect(label).not.toBeNull();
        expect(number).not.toBeNull();
        expect(label!.x + label!.width).toBeLessThanOrEqual(number!.x + 1);
      }
    }
  });
}

for (const viewport of [
  { name: 'small phone', width: 320, height: 720 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'large phone', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'small desktop', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone landscape', width: 844, height: 390 },
]) {
  test(`listening mode fits ${viewport.name} without transport overlap`, async ({ page }) => {
    await installFakeSpeechSynthesis(page);
    await page.setViewportSize(viewport);
    await seedSelectedDeck(page);
    await openListeningMode(page);

    await expectNoHorizontalOverflow(page);
    const content = await page.getByTestId('listening-content').boundingBox();
    const transport = await page.getByTestId('listening-transport').boundingBox();
    expect(content && transport).toBeTruthy();
    expect(content!.y + content!.height).toBeLessThanOrEqual(transport!.y + 1);

    for (const id of ['listening-previous', 'listening-play', 'listening-next']) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    const audioTrigger = page.getByTestId('listening-audio-open');
    const audioTriggerBox = await audioTrigger.boundingBox();
    expect(audioTriggerBox).not.toBeNull();
    expect(audioTriggerBox!.height).toBeGreaterThanOrEqual(44);
    await audioTrigger.click();

    const audioDrawer = page.getByTestId('listening-audio-drawer');
    await expect(audioDrawer).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const drawerBox = await audioDrawer.boundingBox();
    expect(drawerBox).not.toBeNull();
    expect(drawerBox!.x).toBeGreaterThanOrEqual(0);
    expect(drawerBox!.y).toBeGreaterThanOrEqual(0);
    expect(drawerBox!.x + drawerBox!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(drawerBox!.y + drawerBox!.height).toBeLessThanOrEqual(viewport.height + 1);

    for (const id of [
      'listening-rate-0-5',
      'listening-rate-2',
      'listening-audio-preview',
      'listening-audio-reset',
      'listening-audio-close',
    ]) {
      const size = await page.getByTestId(id).evaluate(element => {
        const box = element.getBoundingClientRect();
        return { width: box.width, height: box.height };
      });
      expect(size.width).toBeGreaterThanOrEqual(44);
      expect(size.height).toBeGreaterThanOrEqual(44);
    }

    await page.getByTestId('listening-audio-close').click();
    await expect(audioDrawer).toHaveCount(0);
  });
}
