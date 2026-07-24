import { expect, test } from '@playwright/test';
import {
  installFakeSpeechSynthesis,
  openListeningMode,
  sampleDeckWithCards,
  seedGraduatedFutureCard,
  seedSelectedDeck,
} from './helpers/listening';
import { LISTENING_STRINGS } from '../src/lib/listeningStrings';

test('all supported languages provide complete audio control copy', () => {
  const audioKeys = [
    'audioSettings',
    'closeAudioSettings',
    'automaticVoice',
    'rate',
    'preferredVoice',
    'showAllVoices',
    'showCompatibleVoices',
    'previewVoice',
    'previewing',
    'resetAudio',
    'voicesLoading',
    'voicesUnavailable',
    'refreshVoices',
    'voiceUnavailable',
    'localVoice',
    'networkVoice',
    'fallbackForLanguage',
    'previewError',
  ] as const;

  for (const strings of Object.values(LISTENING_STRINGS)) {
    for (const key of audioKeys) {
      expect(typeof (strings as unknown as Record<string, unknown>)[key]).toBe('string');
      expect(String((strings as unknown as Record<string, unknown>)[key]).trim()).not.toBe('');
    }
  }
});

test('renders an independent paused player and starts only after a user click', async ({ page }) => {
  await installFakeSpeechSynthesis(page);
  await seedSelectedDeck(page, sampleDeckWithCards);
  await openListeningMode(page);

  await expect(page.getByTestId('listening-status')).toContainText('已暫停');
  await expect(page.getByTestId('listening-front')).toHaveText('apple');
  expect(await page.evaluate(() => (
    window as unknown as { __speechHarness: { requests: unknown[] } }
  ).__speechHarness.requests.length)).toBe(0);

  await page.getByTestId('listening-play').click();
  await expect.poll(() => page.evaluate(() => (
    window as unknown as { __speechHarness: { requests: Array<{ text: string }> } }
  ).__speechHarness.requests[0]?.text)).toBe('apple');
  await expect(page.getByTestId('listening-status')).toContainText('第 1 / 1 遍');
});

test('listening entry remains enabled when selected cards exist but nothing is due', async ({ page }) => {
  await installFakeSpeechSynthesis(page);
  await seedGraduatedFutureCard(page);
  await page.getByTestId('mode-card-vocab').click();

  await expect(page.getByTestId('practice-start')).toBeDisabled();
  await expect(page.getByTestId('listening-entry')).toBeEnabled();
});

test('repeat controls accept 0 through 5 and update the live repetition label', async ({ page }) => {
  await installFakeSpeechSynthesis(page);
  await seedSelectedDeck(page);
  await openListeningMode(page);

  const front = page.getByTestId('front-repeat-input');
  await front.fill('3');
  await expect(front).toHaveValue('3');
  await page.getByTestId('listening-play').click();
  await expect(page.getByTestId('listening-status')).toContainText('第 1 / 3 遍');

  await page.getByTestId('listening-pause').click();
  await page.getByTestId('front-repeat-decrease').click();
  await page.getByTestId('front-repeat-decrease').click();
  await page.getByTestId('front-repeat-decrease').click();
  await expect(front).toHaveValue('0');
  await expect(page.getByTestId('front-repeat-decrease')).toBeDisabled();
});

test('queue drawer jumps to a card, closes on Escape and restores trigger focus', async ({ page }) => {
  await installFakeSpeechSynthesis(page);
  await seedSelectedDeck(page);
  await openListeningMode(page);

  const trigger = page.getByTestId('listening-queue-open');
  await trigger.click();
  await expect(page.getByRole('dialog', { name: /播放清單/ })).toBeVisible();
  await page.getByTestId('listening-queue-item-1').click();
  await expect(page.getByTestId('listening-front')).toHaveText('banana');

  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: /播放清單/ })).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('audio drawer changes rate, filters voices, previews, resets, and restores focus', async ({ page }) => {
  await installFakeSpeechSynthesis(page);
  await seedSelectedDeck(page);
  await openListeningMode(page);

  const trigger = page.getByTestId('listening-audio-open');
  await expect(trigger).toContainText('0.85×');
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: /音訊設定/ });
  await expect(dialog).toBeVisible();

  await page.getByTestId('listening-rate-1-25').click();
  await expect(page.getByTestId('listening-rate-1-25')).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel(/English Natural/).check();
  await page.getByTestId('listening-audio-preview').click();
  await expect(page.getByTestId('listening-status')).toContainText('正在試聽');

  await page.getByTestId('listening-audio-reset').click();
  await expect(page.getByTestId('listening-rate-0-85')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel(/自動推薦/)).toBeChecked();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('audio drawer can reveal other languages and keeps a missing saved voice visible', async ({ page }) => {
  await installFakeSpeechSynthesis(page);
  await seedSelectedDeck(page);
  await page.evaluate(() => {
    localStorage.setItem('wordforge_listening_preferences_v1', JSON.stringify({
      schemaVersion: 1,
      source: 'today',
      order: 'sequential',
      loopPlaylist: false,
      frontRepeats: 1,
      exampleRepeats: 1,
      playbackRate: 1,
      preferredVoice: {
        voiceURI: 'missing-uri',
        name: 'Missing Voice',
        lang: 'en-US',
      },
      shuffleSeedByMode: {},
      lastCardIdByMode: {},
      updatedAt: '2026-07-24T00:00:00.000Z',
    }));
  });
  await page.reload();
  await openListeningMode(page);
  await page.getByTestId('listening-audio-open').click();
  const dialog = page.getByTestId('listening-audio-drawer');

  await expect(dialog.getByText('Missing Voice')).toBeVisible();
  await expect(dialog.getByText('目前無法使用')).toBeVisible();
  await expect(page.getByLabel(/Japanese/)).toHaveCount(0);
  await page.getByTestId('listening-voice-show-all').click();
  await expect(page.getByLabel(/Japanese/)).toBeVisible();
  await page.getByLabel(/Japanese/).check();
  await page.getByTestId('listening-audio-close').click();
  await expect(page.getByTestId('listening-audio-open')).toContainText('Japanese');
  await expect(page.getByTestId('listening-audio-open')).toContainText('en-US');
});

test('preview interrupts formal speech and leaves the same repetition paused', async ({ page }) => {
  await installFakeSpeechSynthesis(page);
  await seedSelectedDeck(page);
  await openListeningMode(page);
  await page.getByTestId('front-repeat-increase').click();
  await page.getByTestId('listening-play').click();
  await expect.poll(() => page.evaluate(() => (
    window as unknown as { __speechHarness: { requests: unknown[] } }
  ).__speechHarness.requests.length)).toBe(1);

  await page.getByTestId('listening-audio-open').click();
  await page.getByTestId('listening-audio-preview').click();
  await expect.poll(() => page.evaluate(() => (
    window as unknown as { __speechHarness: { requests: unknown[] } }
  ).__speechHarness.requests.length)).toBe(2);
  await page.evaluate(() => (
    window as unknown as { __speechHarness: { finishCurrent: () => void } }
  ).__speechHarness.finishCurrent());
  await expect(page.getByTestId('listening-status')).toContainText('已暫停');

  await page.getByTestId('listening-audio-close').click();
  await page.getByTestId('listening-play').click();
  await expect.poll(() => page.evaluate(() => (
    window as unknown as { __speechHarness: { requests: unknown[] } }
  ).__speechHarness.requests.length)).toBe(3);
  const requests = await page.evaluate(() => (
    window as unknown as {
      __speechHarness: { requests: Array<{ text: string }> };
    }
  ).__speechHarness.requests);
  expect(requests.map(request => request.text)).toEqual(['apple', 'apple', 'apple']);
  await expect(page.getByTestId('listening-status')).toContainText('第 1 / 2 遍');
});

test('source order loop and last card persist while reload never autoplays', async ({ page }) => {
  await installFakeSpeechSynthesis(page);
  await seedSelectedDeck(page);
  await openListeningMode(page);

  await page.getByTestId('listening-source-all').click();
  await page.getByTestId('listening-order-shuffle').click();
  await page.getByTestId('listening-loop').check();
  await page.getByTestId('listening-next').click();
  const lastFront = await page.getByTestId('listening-front').textContent();
  await page.getByTestId('listening-back').click();
  await page.reload();
  await openListeningMode(page);

  await expect(page.getByTestId('listening-source-all')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('listening-order-shuffle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('listening-loop')).toBeChecked();
  await expect(page.getByTestId('listening-front')).toHaveText(lastFront ?? '');
  await expect(page.getByTestId('listening-status')).toContainText('已暫停');
  expect(await page.evaluate(() => (
    window as unknown as { __speechHarness: { requests: unknown[] } }
  ).__speechHarness.requests.length)).toBe(0);
});

test('returning from a browser interruption never restarts speech automatically', async ({ page }) => {
  await installFakeSpeechSynthesis(page);
  await seedSelectedDeck(page);
  await openListeningMode(page);
  await page.getByTestId('listening-play').click();
  await expect.poll(() => page.evaluate(() => (
    window as unknown as { __speechHarness: { requests: unknown[] } }
  ).__speechHarness.requests.length)).toBe(1);

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
    (window as unknown as {
      __speechHarness: { interrupt: () => void };
    }).__speechHarness.interrupt();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });

  await expect(page.getByTestId('listening-status')).toContainText('瀏覽器已中斷語音');
  expect(await page.evaluate(() => (
    window as unknown as { __speechHarness: { requests: unknown[] } }
  ).__speechHarness.requests.length)).toBe(1);
});
