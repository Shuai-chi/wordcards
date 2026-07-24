import { resolve } from 'node:path';
import { test, expect } from '@playwright/test';

test('theme changes do not break import and review flow', async ({ page }) => {
  await page.goto('/');

  await page.getByTitle('設定').click();
  await page.getByTestId('theme-preset-forest').click();
  await page.getByTestId('settings-save').click();
  await expect(page.getByTestId('settings-save-state')).toContainText('已儲存');
  await page.getByTestId('settings-close').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme-preset', 'forest');

  await page.locator('input[type="file"]').setInputFiles(
    resolve('sample-decks/Phrases/[片語]Everyday_Phrases_Sample.csv'),
  );
  await expect(page.getByText(/成功匯入 1 個套牌/)).toBeVisible();

  await page.getByRole('button', { name: /片語.*1 個牌組/ }).click();
  const deck = page.getByRole('checkbox').first();
  await expect(deck).toBeVisible();
  await deck.click();

  const start = page.getByRole('button', { name: /開始練習/ });
  await expect(start).toBeEnabled();
  await start.click();

  const flashcard = page.getByRole('button', { name: '點擊或按空白鍵翻牌' });
  await expect(flashcard).toBeVisible();
  await flashcard.click();
  await expect(page.getByRole('button', { name: /良好/ })).toBeVisible();
  await page.getByRole('button', { name: /良好/ }).click();
  await expect(page.getByText(/剩餘/).first()).toBeVisible();
});

test('study prompt and answer use their bounded preference scales without resizing rating controls', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('wordforge_ui_preferences_v1', JSON.stringify({
      schemaVersion: 1,
      scales: {
        base: 1, pageHeading: 1, cardTitle: 1, cardBody: 1,
        statNumber: 1, icon: 1, studyPrompt: 1.25, studyContent: 1.2,
      },
      iconProfiles: [
        { id: 'profile-1', name: '設定 1' },
        { id: 'profile-2', name: '設定 2' },
        { id: 'profile-3', name: '設定 3' },
      ],
      activeIconProfileId: 'profile-1',
      updatedAt: '2026-07-21T00:00:00.000Z',
    }));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles(
    resolve('sample-decks/Phrases/[片語]Everyday_Phrases_Sample.csv'),
  );
  await page.getByRole('button', { name: /片語.*1 個牌組/ }).click();
  await page.getByRole('checkbox').first().click();
  await page.getByRole('button', { name: /開始練習/ }).click();

  const prompt = page.getByTestId('study-prompt');
  await expect(prompt).toBeVisible();
  expect(Number.parseFloat(await prompt.evaluate(element => getComputedStyle(element).fontSize))).toBeGreaterThan(44);

  await page.getByRole('button', { name: '點擊或按空白鍵翻牌' }).click();
  const answer = page.getByTestId('study-answer-primary');
  await expect(answer).toBeVisible();
  expect(Number.parseFloat(await answer.evaluate(element => getComputedStyle(element).fontSize))).toBeGreaterThan(27);
  const ratingSize = Number.parseFloat(await page.getByRole('button', { name: /良好/ }).evaluate(element => getComputedStyle(element).fontSize));
  expect(ratingSize).toBeLessThan(20);

  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});
