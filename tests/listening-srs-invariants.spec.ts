import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import {
  installFakeSpeechSynthesis,
  openListeningMode,
  readSrsSnapshot,
  seedDeckAndReport,
} from './helpers/listening';

test('play pause next and previous do not mutate cards or reports', async ({ page }) => {
  await installFakeSpeechSynthesis(page);
  await seedDeckAndReport(page);
  const before = await readSrsSnapshot(page);
  await openListeningMode(page);

  await page.getByTestId('listening-audio-open').click();
  await page.getByTestId('listening-rate-1-5').click();
  await page.getByLabel(/English Natural/).check();
  await page.getByTestId('listening-audio-preview').click();
  await expect.poll(() => page.evaluate(() => (
    window as unknown as { __speechHarness: { requests: unknown[] } }
  ).__speechHarness.requests.length)).toBeGreaterThan(0);
  await page.evaluate(() => (
    window as unknown as { __speechHarness: { finishCurrent: () => void } }
  ).__speechHarness.finishCurrent());
  await page.getByTestId('listening-audio-close').click();

  await page.getByTestId('listening-play').click();
  await expect.poll(() => page.evaluate(() => (
    window as unknown as { __speechHarness: { requests: unknown[] } }
  ).__speechHarness.requests.length)).toBe(2);
  await page.getByTestId('listening-pause').click();
  await page.getByTestId('listening-next').click();
  await page.getByTestId('listening-previous').click();

  expect(await readSrsSnapshot(page)).toEqual(before);
});

test('listening modules contain no SRS or report write seam', async () => {
  const sources = await Promise.all([
    readFile('src/components/ListeningMode.tsx', 'utf8'),
    readFile('src/components/ListeningAudioDrawer.tsx', 'utf8'),
    readFile('src/lib/playbackController.ts', 'utf8'),
    readFile('src/lib/listeningPlaylist.ts', 'utf8'),
  ]);
  const combined = sources.join('\n');

  expect(combined).not.toMatch(/commitReview\s*\(/);
  expect(combined).not.toMatch(/onCardSeen\s*\(/);
  expect(combined).not.toMatch(/putCards?\s*\(/);
  expect(combined).not.toMatch(/putReports?\s*\(/);
});
