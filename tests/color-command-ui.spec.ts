import { expect, test } from '@playwright/test';
import { APPEARANCE_STORAGE_KEY } from '../src/lib/theme';

async function openSettings(page: import('@playwright/test').Page) {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.getByTitle('設定').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByTestId('theme-command-input').scrollIntoViewIfNeeded();
}

test('applies partial commands with Enter and rejects an invalid line atomically', async ({ page }) => {
  await openSettings(page);
  const input = page.getByTestId('theme-command-input');
  const primary = page.getByTestId('theme-color-primary');
  const accent = page.getByTestId('theme-color-accent');

  await input.fill('primary=#166534;accent=#0F766E');
  await input.press('Enter');
  await expect(primary).toHaveValue('#166534');
  await expect(accent).toHaveValue('#0F766E');
  await expect(page.getByTestId('theme-command-status')).toContainText('primary');

  await input.fill('primary=#B45309;accent=#12GG44');
  await page.getByTestId('theme-command-apply').click();
  await expect(primary).toHaveValue('#166534');
  await expect(accent).toHaveValue('#0F766E');
  await expect(page.getByTestId('theme-command-status')).toContainText('第 2 段');
});

test('shows and copies the current full palette without replacing the input draft', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:5173' });
  await openSettings(page);
  const input = page.getByTestId('theme-command-input');

  await page.getByTestId('theme-command-show').click();
  await expect(input).toHaveValue('background=#F8FAFC;card=#FFFFFF;primary=#2563EB;accent=#7C3AED');
  await input.fill('primary=#166534');
  await page.getByTestId('theme-command-copy').click();
  await expect(input).toHaveValue('primary=#166534');
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('background=#F8FAFC;card=#FFFFFF;primary=#2563EB;accent=#7C3AED');
});

test('restore uses the latest saved palette and light dark drafts remain isolated', async ({ page }) => {
  await openSettings(page);
  const input = page.getByTestId('theme-command-input');

  await input.fill('background=#F7FAF7;card=#FFFFFF;primary=#166534;accent=#0F766E');
  await page.getByTestId('theme-command-apply').click();
  await page.getByTestId('settings-save').click();
  await expect(page.getByTestId('settings-save-state')).toContainText('已儲存');

  await input.fill('background=#FFFBEB;card=#FFFFFF;primary=#B45309;accent=#9A3412');
  await page.getByTestId('theme-command-apply').click();
  await expect(page.getByTestId('theme-color-primary')).toHaveValue('#B45309');
  await page.getByTestId('theme-command-restore').click();
  await expect(page.getByTestId('theme-color-primary')).toHaveValue('#166534');

  await input.fill('primary=#B45309');
  await page.getByTestId('theme-mode-dark').click();
  await expect(input).toHaveValue('');
  await input.fill('background=#0F172A;card=#1E293B;primary=#93C5FD;accent=#C4B5FD');
  await page.getByTestId('theme-command-apply').click();
  await expect(page.getByTestId('theme-color-primary')).toHaveValue('#93C5FD');

  await page.getByTestId('theme-mode-light').click();
  await expect(page.getByTestId('theme-color-primary')).toHaveValue('#166534');
});

test('valid low contrast command previews but cannot be saved', async ({ page }) => {
  await openSettings(page);
  await page.getByTestId('theme-command-input').fill(
    'background=#F8FAFC;card=#F8FAFC;primary=#F8FAFC;accent=#F8FAFC',
  );
  await page.getByTestId('theme-command-apply').click();
  await expect(page.getByTestId('theme-color-primary')).toHaveValue('#F8FAFC');
  await expect(page.getByTestId('theme-contrast-warning')).toBeVisible();
  await expect(page.getByTestId('settings-save')).toBeDisabled();
});

test('saved command results persist but command text does not', async ({ page }) => {
  await openSettings(page);
  await page.getByTestId('theme-command-input').fill(
    'background=#F7FAF7;card=#FFFFFF;primary=#166534;accent=#0F766E',
  );
  await page.getByTestId('theme-command-apply').click();
  await page.getByTestId('settings-save').click();
  await expect(page.getByTestId('settings-save-state')).toContainText('已儲存');
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), APPEARANCE_STORAGE_KEY)).toContain('#166534');

  await page.reload();
  await page.getByTitle('設定').click();
  await page.getByTestId('theme-command-input').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('theme-command-input')).toHaveValue('');
  await expect(page.getByTestId('theme-color-primary')).toHaveValue('#166534');
});

test('clipboard denial reports failure without changing the draft', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new DOMException('denied')) },
    });
  });
  await openSettings(page);
  await page.getByTestId('theme-command-input').fill('primary=#166534');
  await page.getByTestId('theme-command-copy').click();
  await expect(page.getByTestId('theme-command-input')).toHaveValue('primary=#166534');
  await expect(page.getByTestId('theme-command-status')).toContainText('無法複製');
});

test('copies through the document fallback when Clipboard API is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: (command: string) => {
        const state = globalThis as typeof globalThis & { __wordforgeCopiedText?: string };
        state.__wordforgeCopiedText = document.activeElement instanceof HTMLTextAreaElement
          ? document.activeElement.value
          : '';
        return command === 'copy';
      },
    });
  });
  await openSettings(page);
  await page.getByTestId('theme-command-copy').click();

  await expect(page.getByTestId('theme-command-status')).toContainText('目前配色指令已複製');
  await expect.poll(() => page.evaluate(
    () => (globalThis as typeof globalThis & { __wordforgeCopiedText?: string }).__wordforgeCopiedText,
  )).toBe('background=#F8FAFC;card=#FFFFFF;primary=#2563EB;accent=#7C3AED');
});

test('command controls stay reachable without horizontal overflow', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 720 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 844, height: 390 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await openSettings(page);
    const panel = page.getByTestId('settings-panel');
    const apply = page.getByTestId('theme-command-apply');
    const restore = page.getByTestId('theme-command-restore');
    const metrics = await panel.evaluate(element => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
    for (const button of [apply, restore]) {
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      await expect(button).toHaveAttribute('aria-label', /.+/);
    }
    await page.getByTestId('settings-close').click();
  }
});
