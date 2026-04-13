import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSV_PATH = path.join(__dirname, 'fixtures', 'sample.csv');

// ─── 清除 IndexedDB 以確保每次測試從乾淨狀態開始 ───────────────
async function clearStorage(page: Page) {
  // Fire-and-forget: just issue the delete + clear, then let the reload reinitialise
  await page.evaluate(() => {
    indexedDB.deleteDatabase('SRS_DB');
    localStorage.clear();
  });
  await page.waitForTimeout(300);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
});

// ════════════════════════════════════════════════════════════
// 1. 首頁載入
// ════════════════════════════════════════════════════════════
test('首頁應正確載入並顯示 WordForge 標題', async ({ page }) => {
  await expect(page.locator('h1', { hasText: 'WordForge' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('尚無單字套牌')).toBeVisible({ timeout: 10000 });
});

// ════════════════════════════════════════════════════════════
// 2. CSV 匯入
// ════════════════════════════════════════════════════════════
test('匯入 CSV 後應顯示套牌名稱與卡片數', async ({ page }) => {
  // 觸發檔案上傳
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(CSV_PATH);

  // 等待 toast「成功匯入」出現
  await expect(page.getByText(/成功匯入/)).toBeVisible({ timeout: 5000 });

  // 套牌卡片應顯示
  await expect(page.getByText('sample')).toBeVisible();
  await expect(page.getByText(/3 張卡片/)).toBeVisible();
});

// ════════════════════════════════════════════════════════════
// 3. 設定 Modal
// ════════════════════════════════════════════════════════════
test('設定 Modal 可開啟、輸入與儲存', async ({ page }) => {
  // 點擊齒輪按鈕
  await page.getByTitle('設定').click();
  await expect(page.getByText('全域設定')).toBeVisible();

  // 修改數值
  const input = page.getByRole('spinbutton');
  await input.fill('50');
  await page.getByRole('button', { name: '儲存' }).click();

  // Modal 關閉，新值顯示在 Dashboard
  await expect(page.getByText('全域每日新卡上限：50')).toBeVisible();
});

// ════════════════════════════════════════════════════════════
// 4. 選取套牌並開始學習
// ════════════════════════════════════════════════════════════
test('選取套牌後應可開始學習並顯示卡片', async ({ page }) => {
  // 先匯入 CSV
  await page.locator('input[type="file"]').setInputFiles(CSV_PATH);
  await expect(page.getByText(/成功匯入/)).toBeVisible({ timeout: 5000 });

  // 選取套牌（點擊套牌列）
  await page.getByText('sample').click();

  // 開始練習按鈕應變成可用
  const startBtn = page.getByRole('button', { name: /開始練習/ });
  await expect(startBtn).toBeEnabled();
  await startBtn.click();

  // 學習頁面：應顯示進度條和卡片單字
  await expect(page.getByText(/剩餘.*張卡片/)).toBeVisible();
  // 卡片應顯示「點擊卡片或按 Space 鍵顯示答案」
  await expect(page.getByText('點擊卡片或按 Space 鍵顯示答案')).toBeVisible();
});

// ════════════════════════════════════════════════════════════
// 5. 卡片翻面（點擊）
// ════════════════════════════════════════════════════════════
test('點擊卡片後應翻面顯示答案', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles(CSV_PATH);
  await expect(page.getByText(/成功匯入/)).toBeVisible({ timeout: 5000 });
  await page.getByText('sample').click();
  await page.getByRole('button', { name: /開始練習/ }).click();

  // 等待卡片提示出現，確保畫面已渲染完成
  await expect(page.getByText('點擊卡片或按 Space 鍵顯示答案')).toBeVisible();

  // 點擊卡片翻面
  await page.getByText('點擊卡片或按 Space 鍵顯示答案').click();

  // 答案面板應出現（出現評分按鈕）
  await expect(page.getByRole('button', { name: '重學' })).toBeVisible();
  await expect(page.getByRole('button', { name: '困難' })).toBeVisible();
  await expect(page.getByRole('button', { name: '良好' })).toBeVisible();
  await expect(page.getByRole('button', { name: '輕鬆' })).toBeVisible();
});

// ════════════════════════════════════════════════════════════
// 6. 鍵盤快捷鍵：Space 翻面
// ════════════════════════════════════════════════════════════
test('按 Space 鍵應翻面顯示答案', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles(CSV_PATH);
  await expect(page.getByText(/成功匯入/)).toBeVisible({ timeout: 5000 });
  await page.getByText('sample').click();
  await page.getByRole('button', { name: /開始練習/ }).click();

  // 等待卡片提示出現，確保畫面已渲染完成
  await expect(page.getByText('點擊卡片或按 Space 鍵顯示答案')).toBeVisible();

  // 按 Space
  await page.keyboard.press('Space');

  // 評分按鈕應出現
  await expect(page.getByRole('button', { name: '良好' })).toBeVisible();
});

// ════════════════════════════════════════════════════════════
// 7. 鍵盤快捷鍵：3 = Good 評分
// ════════════════════════════════════════════════════════════
test('按 3 鍵應評為良好並切換到下一張卡', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles(CSV_PATH);
  await expect(page.getByText(/成功匯入/)).toBeVisible({ timeout: 5000 });
  await page.getByText('sample').click();
  await page.getByRole('button', { name: /開始練習/ }).click();

  // 等待卡片顯示
  await expect(page.getByText('點擊卡片或按 Space 鍵顯示答案')).toBeVisible();

  // 翻面
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: '良好' })).toBeVisible();

  // 按 3 評分
  await page.keyboard.press('3');

  // 應切換到下一張（評分按鈕消失，再次顯示 Space 提示）
  await expect(page.getByText('點擊卡片或按 Space 鍵顯示答案')).toBeVisible({ timeout: 3000 });
});

// ════════════════════════════════════════════════════════════
// 8. 完成所有卡片後顯示完成頁面
// ════════════════════════════════════════════════════════════
test('完成所有卡片後應顯示「練習完成」頁面', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles(CSV_PATH);
  await expect(page.getByText(/成功匯入/)).toBeVisible({ timeout: 5000 });
  await page.getByText('sample').click();
  await page.getByRole('button', { name: /開始練習/ }).click();

  await expect(page.getByText('點擊卡片或按 Space 鍵顯示答案')).toBeVisible();

  // 把所有卡片都按 Easy (4) 過完
  for (let i = 0; i < 10; i++) {
    // 等待提示或是完成畫面出現
    const locator = page.locator('text="點擊卡片或按 Space 鍵顯示答案", text="練習完成！"');
    await locator.first().waitFor({ state: 'visible' });

    if (await page.getByText('練習完成！').isVisible()) break;

    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: '輕鬆' })).toBeVisible();
    await page.keyboard.press('4');
  }

  await expect(page.getByText('練習完成！')).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('button', { name: '回到學習中心' })).toBeVisible();
});

// ════════════════════════════════════════════════════════════
// 9. 完成後返回 Dashboard
// ════════════════════════════════════════════════════════════
test('完成後點擊「回到學習中心」應回到 Dashboard', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles(CSV_PATH);
  await expect(page.getByText(/成功匯入/)).toBeVisible({ timeout: 5000 });
  await page.getByText('sample').click();
  await page.getByRole('button', { name: /開始練習/ }).click();
  await expect(page.getByText('點擊卡片或按 Space 鍵顯示答案')).toBeVisible();

  for (let i = 0; i < 10; i++) {
    const locator = page.locator('text="點擊卡片或按 Space 鍵顯示答案", text="練習完成！"');
    await locator.first().waitFor({ state: 'visible' });

    if (await page.getByText('練習完成！').isVisible()) break;

    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: '輕鬆' })).toBeVisible();
    await page.keyboard.press('4');
  }

  await page.getByRole('button', { name: '回到學習中心' }).click();
  await expect(page.getByRole('heading', { name: 'WordForge' })).toBeVisible();
});

// ════════════════════════════════════════════════════════════
// 10. 刪除套牌
// ════════════════════════════════════════════════════════════
test('刪除套牌後應從列表移除', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles(CSV_PATH);
  await expect(page.getByText(/成功匯入/)).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('sample')).toBeVisible();

  // 點擊刪除按鈕（Trash icon）
  await page.getByTitle('').filter({ has: page.locator('svg') }).last();
  
  // 使用 dialog handler 自動確認
  page.on('dialog', dialog => dialog.accept());
  await page.locator('button').filter({ has: page.locator('[class*="lucide"]') }).last().click();

  // 套牌應從列表移除，顯示「尚無單字套牌」
  await expect(page.getByText('尚無單字套牌')).toBeVisible({ timeout: 3000 });
});
