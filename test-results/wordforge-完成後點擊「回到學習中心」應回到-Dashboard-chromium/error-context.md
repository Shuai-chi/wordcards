# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wordforge.spec.ts >> 完成後點擊「回到學習中心」應回到 Dashboard
- Location: tests\wordforge.spec.ts:183:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.waitFor: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('text="點擊卡片或按 Space 鍵顯示答案", text="練習完成！"').first() to be visible

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6] [cursor=pointer]:
        - img [ref=e8]
        - heading "WordForge" [level=1] [ref=e11]
      - generic [ref=e12]:
        - generic "匯入 CSV" [ref=e13] [cursor=pointer]:
          - img [ref=e14]
        - button "設定" [ref=e17] [cursor=pointer]:
          - img [ref=e18]
  - main [ref=e21]:
    - generic [ref=e22]:
      - generic [ref=e24]:
        - generic [ref=e25]: 剩餘 3 張卡片
        - generic [ref=e26]: 進度 0%
      - generic [ref=e28] [cursor=pointer]:
        - generic [ref=e29]: 新
        - heading "run" [level=1] [ref=e31]:
          - text: run
          - img [ref=e32]
        - generic [ref=e36]: 點擊卡片或按 Space 鍵顯示答案
```

# Test source

```ts
  92  |   await page.locator('input[type="file"]').setInputFiles(CSV_PATH);
  93  |   await expect(page.getByText(/成功匯入/)).toBeVisible({ timeout: 5000 });
  94  |   await page.getByText('sample').click();
  95  |   await page.getByRole('button', { name: /開始練習/ }).click();
  96  | 
  97  |   // 等待卡片提示出現，確保畫面已渲染完成
  98  |   await expect(page.getByText('點擊卡片或按 Space 鍵顯示答案')).toBeVisible();
  99  | 
  100 |   // 點擊卡片翻面
  101 |   await page.getByText('點擊卡片或按 Space 鍵顯示答案').click();
  102 | 
  103 |   // 答案面板應出現（出現評分按鈕）
  104 |   await expect(page.getByRole('button', { name: '重學' })).toBeVisible();
  105 |   await expect(page.getByRole('button', { name: '困難' })).toBeVisible();
  106 |   await expect(page.getByRole('button', { name: '良好' })).toBeVisible();
  107 |   await expect(page.getByRole('button', { name: '輕鬆' })).toBeVisible();
  108 | });
  109 | 
  110 | // ════════════════════════════════════════════════════════════
  111 | // 6. 鍵盤快捷鍵：Space 翻面
  112 | // ════════════════════════════════════════════════════════════
  113 | test('按 Space 鍵應翻面顯示答案', async ({ page }) => {
  114 |   await page.locator('input[type="file"]').setInputFiles(CSV_PATH);
  115 |   await expect(page.getByText(/成功匯入/)).toBeVisible({ timeout: 5000 });
  116 |   await page.getByText('sample').click();
  117 |   await page.getByRole('button', { name: /開始練習/ }).click();
  118 | 
  119 |   // 等待卡片提示出現，確保畫面已渲染完成
  120 |   await expect(page.getByText('點擊卡片或按 Space 鍵顯示答案')).toBeVisible();
  121 | 
  122 |   // 按 Space
  123 |   await page.keyboard.press('Space');
  124 | 
  125 |   // 評分按鈕應出現
  126 |   await expect(page.getByRole('button', { name: '良好' })).toBeVisible();
  127 | });
  128 | 
  129 | // ════════════════════════════════════════════════════════════
  130 | // 7. 鍵盤快捷鍵：3 = Good 評分
  131 | // ════════════════════════════════════════════════════════════
  132 | test('按 3 鍵應評為良好並切換到下一張卡', async ({ page }) => {
  133 |   await page.locator('input[type="file"]').setInputFiles(CSV_PATH);
  134 |   await expect(page.getByText(/成功匯入/)).toBeVisible({ timeout: 5000 });
  135 |   await page.getByText('sample').click();
  136 |   await page.getByRole('button', { name: /開始練習/ }).click();
  137 | 
  138 |   // 等待卡片顯示
  139 |   await expect(page.getByText('點擊卡片或按 Space 鍵顯示答案')).toBeVisible();
  140 | 
  141 |   // 翻面
  142 |   await page.keyboard.press('Space');
  143 |   await expect(page.getByRole('button', { name: '良好' })).toBeVisible();
  144 | 
  145 |   // 按 3 評分
  146 |   await page.keyboard.press('3');
  147 | 
  148 |   // 應切換到下一張（評分按鈕消失，再次顯示 Space 提示）
  149 |   await expect(page.getByText('點擊卡片或按 Space 鍵顯示答案')).toBeVisible({ timeout: 3000 });
  150 | });
  151 | 
  152 | // ════════════════════════════════════════════════════════════
  153 | // 8. 完成所有卡片後顯示完成頁面
  154 | // ════════════════════════════════════════════════════════════
  155 | test('完成所有卡片後應顯示「練習完成」頁面', async ({ page }) => {
  156 |   await page.locator('input[type="file"]').setInputFiles(CSV_PATH);
  157 |   await expect(page.getByText(/成功匯入/)).toBeVisible({ timeout: 5000 });
  158 |   await page.getByText('sample').click();
  159 |   await page.getByRole('button', { name: /開始練習/ }).click();
  160 | 
  161 |   await expect(page.getByText('點擊卡片或按 Space 鍵顯示答案')).toBeVisible();
  162 | 
  163 |   // 把所有卡片都按 Easy (4) 過完
  164 |   for (let i = 0; i < 10; i++) {
  165 |     // 等待提示或是完成畫面出現
  166 |     const locator = page.locator('text="點擊卡片或按 Space 鍵顯示答案", text="練習完成！"');
  167 |     await locator.first().waitFor({ state: 'visible' });
  168 | 
  169 |     if (await page.getByText('練習完成！').isVisible()) break;
  170 | 
  171 |     await page.keyboard.press('Space');
  172 |     await expect(page.getByRole('button', { name: '輕鬆' })).toBeVisible();
  173 |     await page.keyboard.press('4');
  174 |   }
  175 | 
  176 |   await expect(page.getByText('練習完成！')).toBeVisible({ timeout: 5000 });
  177 |   await expect(page.getByRole('button', { name: '回到學習中心' })).toBeVisible();
  178 | });
  179 | 
  180 | // ════════════════════════════════════════════════════════════
  181 | // 9. 完成後返回 Dashboard
  182 | // ════════════════════════════════════════════════════════════
  183 | test('完成後點擊「回到學習中心」應回到 Dashboard', async ({ page }) => {
  184 |   await page.locator('input[type="file"]').setInputFiles(CSV_PATH);
  185 |   await expect(page.getByText(/成功匯入/)).toBeVisible({ timeout: 5000 });
  186 |   await page.getByText('sample').click();
  187 |   await page.getByRole('button', { name: /開始練習/ }).click();
  188 |   await expect(page.getByText('點擊卡片或按 Space 鍵顯示答案')).toBeVisible();
  189 | 
  190 |   for (let i = 0; i < 10; i++) {
  191 |     const locator = page.locator('text="點擊卡片或按 Space 鍵顯示答案", text="練習完成！"');
> 192 |     await locator.first().waitFor({ state: 'visible' });
      |                           ^ Error: locator.waitFor: Test timeout of 60000ms exceeded.
  193 | 
  194 |     if (await page.getByText('練習完成！').isVisible()) break;
  195 | 
  196 |     await page.keyboard.press('Space');
  197 |     await expect(page.getByRole('button', { name: '輕鬆' })).toBeVisible();
  198 |     await page.keyboard.press('4');
  199 |   }
  200 | 
  201 |   await page.getByRole('button', { name: '回到學習中心' }).click();
  202 |   await expect(page.getByRole('heading', { name: 'WordForge' })).toBeVisible();
  203 | });
  204 | 
  205 | // ════════════════════════════════════════════════════════════
  206 | // 10. 刪除套牌
  207 | // ════════════════════════════════════════════════════════════
  208 | test('刪除套牌後應從列表移除', async ({ page }) => {
  209 |   await page.locator('input[type="file"]').setInputFiles(CSV_PATH);
  210 |   await expect(page.getByText(/成功匯入/)).toBeVisible({ timeout: 5000 });
  211 |   await expect(page.getByText('sample')).toBeVisible();
  212 | 
  213 |   // 點擊刪除按鈕（Trash icon）
  214 |   await page.getByTitle('').filter({ has: page.locator('svg') }).last();
  215 |   
  216 |   // 使用 dialog handler 自動確認
  217 |   page.on('dialog', dialog => dialog.accept());
  218 |   await page.locator('button').filter({ has: page.locator('[class*="lucide"]') }).last().click();
  219 | 
  220 |   // 套牌應從列表移除，顯示「尚無單字套牌」
  221 |   await expect(page.getByText('尚無單字套牌')).toBeVisible({ timeout: 3000 });
  222 | });
  223 | 
```