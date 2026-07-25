# WordForge 固定設定工具列、雙預覽與雲端指南補強實作計畫

> **面向 AI 代理的工作者：** 必需子技能：使用 `executing-plans` 逐任務實作。每個行為遵守 TDD 紅燈—綠燈—重構，並使用本文件的核取方塊追蹤。依共享 dirty worktree 與目前多 Agent 限制，不啟動 subagent。

**目標：** 讓設定視窗具備固定頂部、儲存後保持開啟、未儲存離開保護、外觀／圖標固定雙預覽與 3／2／1 欄控制項，並把雲端驗證 HTML 補成可逐步照做的操作手冊。

**架構：** 新增純函式 `settingsDraft` 作為 dirty comparison 的唯一來源，讓 `SettingsModal` 管理 saved snapshot 與完整草稿；close confirmation 為設定 panel 的 sibling alertdialog，避免兩層 focus trap 互相干擾。設定 panel 改成固定 header、條件式 preview dock、單一 scroll region；預覽沿用既有 CSS variables、`CustomIcon` 與集中式 scale constraints。

**技術棧：** React 19、TypeScript 6、Vite 8、CSS Grid／container queries／clamp、IndexedDB、localStorage、Playwright、單檔靜態 HTML。

**核准規格：** `docs/superpowers/specs/2026-07-22-settings-sticky-preview-cloud-guide-design.md`

**工作區例外：** `feature/wordforge-local-backup` 含本系列必要且尚未提交的前置變更。依既有管理計畫，不建立 worktree、不 commit、不 push；每個任務以 targeted test、`git diff --check` 與明確 status checkpoint 取代 commit。不得重設或覆蓋 `.bak-20260719`～`.bak-20260721`。

---

## 1. 檔案與責任

### 建立

- `src/lib/settingsDraft.ts`：設定草稿型別、正規化 payload、忽略 timestamp 的結構比較、Blob-aware icon records 比較。
- `src/components/SettingsCloseConfirm.tsx`：未儲存 alertdialog、初始安全焦點、Escape 回到編輯。
- `src/components/IconPreviewDock.tsx`：目前 profile 的模式卡／統計圖標固定預覽與 object URL lifecycle。
- `tests/settings-draft.spec.ts`：純函式 dirty comparison 的 Blob、transform、順序、timestamp 邊界測試。

### 修改

- `src/components/SettingsModal.tsx`：saved snapshot、dirty 狀態、全域 save transaction、requestClose、固定三層 shell。
- `src/components/AppearancePreview.tsx`：網站介面與練習卡雙面板，補上 base text 對應元素。
- `src/components/ScaleControls.tsx`：緊湊控制卡 markup，不改 constraint schema 或輸入正規化規則。
- `src/App.tsx`：設定儲存成功後不關閉；保存狀態與 preview state 交接。
- `src/index.css`：固定 header／dock／scroll region、雙預覽、3／2／1 欄與直橫式保護。
- `src/lib/personalizationStrings.ts`：八語新增已儲存、關閉、未儲存、回到編輯、捨棄離開、預覽標籤等字串。
- `tests/settings-personalization.spec.ts`：儲存、離開、sticky、雙預覽、圖標 dock、responsive 行為。
- `/home/shuaichi/Projects/03_Production/WordForge_雲端同步驗證指南.html`：逐步命令、預期結果、Console 直接入口、欄位指南與排錯。
- `README.md`、`docs/i18n/README-en.md`、`CHANGELOG.md`：新設定互動與指南入口。
- `/home/shuaichi/Projects/04_Management/plan/[Running]SRS_Web_App_Mobile_UI_Icon_Profiles-v1.md`：新增本輪 Stage、測試證據、Cleanup 與等待 Windows 驗收。

---

## 任務 0：保護現況與建立基準

**檔案：**
- 備份：本計畫所有既有修改檔，suffix `.bak-20260722-sticky-settings`
- 檢查：`git status`、Running／Paused plan、現有 Playwright 基準

- [x] **步驟 1：確認目前工作樹與計畫所有權**

執行：

```bash
cd /home/shuaichi/Projects/03_Production/SRS_Web_App
git status --short
ls -1 /home/shuaichi/Projects/04_Management/plan/*.md
```

預期：目前 branch 為 `feature/wordforge-local-backup`；既有 mobile UI／backup／sync 變更均保留；沒有其他 Agent 宣告同時修改本計畫檔案。

- [x] **步驟 2：建立精確備份**

逐一執行 `cp -a`，只備份實際存在的既有檔案：

```bash
cp -a src/App.tsx src/App.tsx.bak-20260722-sticky-settings
cp -a src/components/SettingsModal.tsx src/components/SettingsModal.tsx.bak-20260722-sticky-settings
cp -a src/components/AppearancePreview.tsx src/components/AppearancePreview.tsx.bak-20260722-sticky-settings
cp -a src/components/ScaleControls.tsx src/components/ScaleControls.tsx.bak-20260722-sticky-settings
cp -a src/index.css src/index.css.bak-20260722-sticky-settings
cp -a src/lib/personalizationStrings.ts src/lib/personalizationStrings.ts.bak-20260722-sticky-settings
cp -a tests/settings-personalization.spec.ts tests/settings-personalization.spec.ts.bak-20260722-sticky-settings
cp -a ../WordForge_雲端同步驗證指南.html ../WordForge_雲端同步驗證指南.html.bak-20260722-sticky-settings
cp -a /home/shuaichi/Projects/04_Management/plan/'[Running]SRS_Web_App_Mobile_UI_Icon_Profiles-v1.md' /home/shuaichi/Projects/04_Management/plan/'[Running]SRS_Web_App_Mobile_UI_Icon_Profiles-v1.md.bak-20260722-sticky-settings'
```

預期：所有命令 exit 0；備份 UTF-8／LF 與來源相同。

- [x] **步驟 3：跑現有設定測試基準**

執行：

```bash
npx playwright test tests/settings-personalization.spec.ts --project=chromium --retries=0
```

預期：現有 6 項設定測試 PASS。若失敗，先依 INCIDENT_LOG 與 systematic-debugging 處理，不得開始功能實作。

---

## 任務 1：Blob-aware 設定草稿比較

**檔案：**
- 建立：`src/lib/settingsDraft.ts`
- 建立：`tests/settings-draft.spec.ts`

- [x] **步驟 1：寫 dirty comparison 紅燈測試**

建立測試，最少涵蓋：

```ts
import { expect, test } from '@playwright/test';
import type { IconAssetRecord } from '../src/lib/iconAssets';
import { createDefaultUiPreferences } from '../src/lib/uiPreferences';
import { areSettingsDraftsEqual, type SettingsDraft } from '../src/lib/settingsDraft';

function draft(): SettingsDraft {
  return {
    limit: 30,
    defLangPref: 'deck',
    appearance: {
      schemaVersion: 1,
      mode: 'system',
      light: { presetId: 'ocean' },
      dark: { presetId: 'midnight' },
      updatedAt: '2026-07-22T00:00:00.000Z',
    },
    uiPreferences: createDefaultUiPreferences('2026-07-22T00:00:00.000Z'),
    iconRecords: [],
  };
}

test('ignores timestamps but detects a user-visible scale change', () => {
  const a = draft();
  const timestampOnly = {
    ...a,
    appearance: { ...a.appearance, updatedAt: 'later' },
    uiPreferences: { ...a.uiPreferences, updatedAt: 'later' },
  };
  expect(areSettingsDraftsEqual(a, timestampOnly)).toBe(true);
  expect(areSettingsDraftsEqual(a, {
    ...a,
    uiPreferences: {
      ...a.uiPreferences,
      scales: { ...a.uiPreferences.scales, base: 1.05 },
    },
  })).toBe(false);
});

test('detects blob identity and transform changes without depending on record order', () => {
  const blobA = new Blob(['a'], { type: 'image/png' });
  const blobB = new Blob(['b'], { type: 'image/png' });
  const recordA: IconAssetRecord = {
    id: 'profile-1:vocab', profileId: 'profile-1', slot: 'vocab',
    blob: blobA, mimeType: 'image/png', fileName: 'a.png', updatedAt: 'first',
    fit: 'contain', zoom: 1, offsetX: 0, offsetY: 0,
  };
  const recordB: IconAssetRecord = {
    ...recordA,
    id: 'profile-1:phrase', slot: 'phrase', fileName: 'b.png',
  };
  const withRecords = { ...draft(), iconRecords: [recordA, recordB] };
  expect(areSettingsDraftsEqual(withRecords, {
    ...withRecords,
    iconRecords: [recordB, { ...recordA, updatedAt: 'later' }],
  })).toBe(true);
  expect(areSettingsDraftsEqual(withRecords, {
    ...withRecords,
    iconRecords: [{ ...recordA, blob: blobB }, recordB],
  })).toBe(false);
  expect(areSettingsDraftsEqual(withRecords, {
    ...withRecords,
    iconRecords: [{ ...recordA, zoom: 1.05 }, recordB],
  })).toBe(false);
});
```

- [x] **步驟 2：執行測試確認正確失敗**

執行：

```bash
npx playwright test tests/settings-draft.spec.ts --project=chromium --retries=0
```

預期：FAIL，原因為 `../src/lib/settingsDraft` 尚不存在，不是 fixture 或 TypeScript 拼字錯誤。

- [x] **步驟 3：實作最小草稿型別與比較器**

介面固定為：

```ts
export type DefinitionLanguagePreference = 'deck' | 'user' | 'bilingual';

export interface SettingsDraft {
  limit: number;
  defLangPref: DefinitionLanguagePreference;
  appearance: AppearanceSettingsV1;
  uiPreferences: UiPreferencesV1;
  iconRecords: IconAssetRecord[];
}

export function areSettingsDraftsEqual(a: SettingsDraft, b: SettingsDraft): boolean;
```

實作規則：

- limit 與 definition preference 直接比較。
- appearance 比較 schemaVersion、mode、light、dark；忽略 updatedAt。
- UI preference 比較 schemaVersion、scales 八鍵、profile id／name、active profile；忽略 updatedAt。
- icon records 複製後依 id 排序，比較 id、profileId、slot、mimeType、fileName、fit、zoom、offsetX、offsetY、`blob.size`、`blob.type` 與 `blob ===`；忽略 updatedAt。
- 不變更傳入陣列，不使用 JSON stringify Blob。

- [x] **步驟 4：重跑純函式測試至綠燈**

執行：

```bash
npx playwright test tests/settings-draft.spec.ts --project=chromium --retries=0
```

預期：所有新增測試 PASS。

- [x] **步驟 5：狀態檢查點**

執行：

```bash
git diff --check -- src/lib/settingsDraft.ts tests/settings-draft.spec.ts
git status --short -- src/lib/settingsDraft.ts tests/settings-draft.spec.ts
```

預期：diff check exit 0；只出現這兩個新增檔。

---

## 任務 2：儲存保持開啟與未儲存離開保護

**檔案：**
- 建立：`src/components/SettingsCloseConfirm.tsx`
- 修改：`src/components/SettingsModal.tsx`
- 修改：`src/App.tsx`
- 修改：`src/lib/personalizationStrings.ts`
- 修改：`tests/settings-personalization.spec.ts`

- [x] **步驟 1：寫 save／close 紅燈瀏覽器測試**

加入三個獨立測試：

```ts
test('saving keeps settings open and establishes a clean baseline', async ({ page }) => {
  await openSettings(page);
  await page.getByTestId('scale-base-increase').click();
  await page.getByTestId('settings-save').click();
  await expect(page.getByRole('dialog', { name: '設定' })).toBeVisible();
  await expect(page.getByTestId('settings-save')).toBeDisabled();
  await expect(page.getByTestId('settings-save-state')).toContainText('已儲存');
  await page.getByTestId('settings-close').click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: '設定' })).toHaveCount(0);
});

test('dirty X, overlay, and Escape require confirmation', async ({ page }) => {
  for (const exit of ['x', 'overlay', 'escape'] as const) {
    await openSettings(page);
    await page.getByTestId('scale-base-increase').click();
    if (exit === 'x') await page.getByTestId('settings-close').click();
    if (exit === 'overlay') await page.getByTestId('settings-overlay').click({ position: { x: 4, y: 4 } });
    if (exit === 'escape') await page.keyboard.press('Escape');
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByTestId('settings-return-editing').click();
    await expect(page.getByTestId('scale-base')).toHaveValue('105');
    await page.getByTestId('settings-close').click();
    await page.getByTestId('settings-discard-close').click();
  }
});

test('discard restores live CSS preview and closes settings', async ({ page }) => {
  await openSettings(page);
  const original = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--font-scale-base').trim());
  await page.getByTestId('scale-base-increase').click();
  await page.getByTestId('settings-close').click();
  await page.getByTestId('settings-discard-close').click();
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--font-scale-base').trim())).toBe(original);
});
```

測試實作時為三個 exit 建立小 helper，避免重複；不得用一個龐大測試掩蓋哪個入口失敗。

- [x] **步驟 2：執行紅燈**

執行：

```bash
npx playwright test tests/settings-personalization.spec.ts --project=chromium --retries=0 -g "saving keeps|dirty X|discard restores"
```

預期：FAIL；現況會在 save 後關閉，且 X／overlay／Escape 不會顯示 alertdialog。

- [x] **步驟 3：新增八語互動字串**

在 `PersonalizationStrings` 與八個語言值新增同一組 keys：

```ts
saved: string;
saveChanges: string;
closeSettings: string;
unsavedTitle: string;
unsavedDescription: string;
returnToEditing: string;
discardAndClose: string;
```

繁中語意固定為：「已儲存」「儲存」「關閉設定」「尚未儲存變更」「離開後將不保留這些變更。」「回到編輯」「捨棄變更並離開」。其他語言需是真實翻譯，不用英文佔位。

- [x] **步驟 4：建立 sibling alertdialog**

`SettingsCloseConfirm` 介面：

```ts
interface Props {
  title: string;
  description: string;
  returnLabel: string;
  discardLabel: string;
  onReturn: () => void;
  onDiscard: () => void;
}
```

要求：

- 自己使用 `useFocusTrap`。
- 第一個 focusable element 是「回到編輯」。
- `role="alertdialog" aria-modal="true"` 並有 title／description ids。
- Escape 呼叫 `onReturn`；overlay 外側點擊也採安全的 `onReturn`。
- 元件放在 Settings panel 的 sibling，而不是 descendant，避免父子 focus trap 同時收到 Tab。

- [x] **步驟 5：在 SettingsModal 建立完整 draft 與 saved snapshot**

以單一 `SettingsDraft` 組合現有 state。核心流程：

```ts
const currentDraft: SettingsDraft = {
  limit: Math.max(0, Math.min(1000, Number.parseInt(val, 10) || 0)),
  defLangPref: selectedPref,
  appearance: draftAppearance,
  uiPreferences: draftUiPreferences,
  iconRecords: draftIconRecords,
};
const isDirty = !areSettingsDraftsEqual(savedSnapshot, currentDraft);
```

`handleSave` 必須：

1. 正規化 limit、`withAppearanceTimestamp` 與 `normalizeUiPreferences`。
2. await `onSave`。
3. 只有成功後才把正規化資料回寫 draft 與 saved snapshot。
4. `saveBusy=false`，顯示已儲存，不呼叫 onClose。
5. 失敗時保留 dirty 與草稿。

`requestClose` 必須：clean → `onClose()`；dirty → `setCloseConfirmOpen(true)`。

- [x] **步驟 6：修改 App 保存交接**

保留目前 localStorage／IndexedDB transaction 與 rollback，只移除成功路徑的：

```ts
setIsSettingsOpen(false);
```

保存成功後可以清空 preview refs，因 saved states 已更新為相同值；modal 後續修改會重新建立 preview。`onClose` 維持清空三種 preview 並關閉，作為 clean close／discard 的唯一出口。

- [x] **步驟 7：重跑 targeted tests 至綠燈**

執行同一步驟 2 指令。

預期：三類行為全部 PASS；儲存後 modal 可見、clean close 無 alert、dirty 三入口有 alert、discard 還原 CSS。

- [x] **步驟 8：狀態檢查點**

```bash
git diff --check -- src/App.tsx src/components/SettingsModal.tsx src/components/SettingsCloseConfirm.tsx src/lib/personalizationStrings.ts tests/settings-personalization.spec.ts
```

預期：exit 0。

---

## 任務 3：固定 header／dock／scroll region 與 3／2／1 欄控制項

**檔案：**
- 修改：`src/components/SettingsModal.tsx`
- 修改：`src/components/ScaleControls.tsx`
- 修改：`src/index.css`
- 修改：`tests/settings-personalization.spec.ts`

- [x] **步驟 1：寫 sticky 與網格紅燈測試**

加入：

```ts
test('settings header tabs and preview stay fixed while only content scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSettings(page);
  const header = page.getByTestId('settings-fixed-header');
  const preview = page.getByTestId('settings-preview-dock');
  const scroll = page.getByTestId('settings-scroll-region');
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
    await page.reload();
    await page.getByTitle('設定').click();
    const cards = page.locator('.scale-control');
    const tops = await cards.evaluateAll(elements => elements.map(element => Math.round(element.getBoundingClientRect().top)));
    const firstRowCount = tops.filter(top => Math.abs(top - tops[0]) <= 1).length;
    expect(firstRowCount).toBe(expected);
  }
});
```

- [x] **步驟 2：執行紅燈**

```bash
npx playwright test tests/settings-personalization.spec.ts --project=chromium --retries=0 -g "stay fixed|three two and one"
```

預期：FAIL；現有 settings panel 本身捲動，沒有三層 test ids，control list 固定單欄。

- [x] **步驟 3：重組 SettingsModal shell**

最終 DOM 邊界：

```tsx
<div className="modal-overlay" data-testid="settings-overlay" onClick={requestClose}>
  <div
    className="settings-panel"
    data-preview={activeTab !== 'general'}
    data-testid="settings-panel"
    onClick={event => event.stopPropagation()}
  >
    <header className="settings-fixed-header" data-testid="settings-fixed-header">
      <div className="settings-toolbar">
        <h2 id="settings-title">{strings.globalSettings}</h2>
        <span data-testid="settings-save-state" role="status">
          {!isDirty && copy.saved}
        </span>
        <button type="button" data-testid="settings-save" disabled={!isDirty || saveBusy} onClick={() => void handleSave()}>
          {copy.saveChanges}
        </button>
        <button type="button" data-testid="settings-close" aria-label={copy.closeSettings} onClick={requestClose}>
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="settings-tabs" role="tablist" aria-label={strings.globalSettings}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
    {activeTab !== 'general' && (
      <div className="settings-preview-dock" data-testid="settings-preview-dock">
        {activeTab === 'appearance' ? (
          <AppearancePreview strings={strings} copy={copy} />
        ) : (
          <IconPreviewDock settings={draftUiPreferences} records={draftIconRecords} strings={strings} />
        )}
      </div>
    )}
    <div className="settings-scroll-region" data-testid="settings-scroll-region">
      {active tabpanel}
    </div>
  </div>
  {closeConfirmOpen && (
    <SettingsCloseConfirm
      title={copy.unsavedTitle}
      description={copy.unsavedDescription}
      returnLabel={copy.returnToEditing}
      discardLabel={copy.discardAndClose}
      onReturn={() => setCloseConfirmOpen(false)}
      onDiscard={onClose}
    />
  )}
</div>
```

不得讓 tabpanel、save error 或 bottom action footer 留在 panel scroll container 之外而重複顯示。移除舊底部 Cancel／Save footer。

- [x] **步驟 4：壓縮 ScaleControls markup**

- control header 改成 label＋range＋小型 reset icon／文字。
- stepper 保留 `min/max/step`、可輸入空白、Enter／blur commit、min/max disabled。
- reset all 保留在 section heading。
- 不改 `UI_SCALE_CONSTRAINTS`、`setUiScale` 或八個 key。

- [x] **步驟 5：實作 layout CSS**

必要規則：

```css
.settings-panel { display: grid; grid-template-rows: auto auto minmax(0, 1fr); overflow: hidden; }
.settings-panel[data-preview="false"] { grid-template-rows: auto minmax(0, 1fr); }
.settings-scroll-region { min-width: 0; min-height: 0; overflow-y: auto; overscroll-behavior: contain; container: settings-content / inline-size; }
.scale-control-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
@container settings-content (max-width: 38rem) {
  .scale-control-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@container settings-content (max-width: 16rem) {
  .scale-control-list { grid-template-columns: minmax(0, 1fr); }
}
```

按鈕／輸入 min-height 44px。瀏覽器不支援 container query 時，以相同 390／320 斷點的 media query fallback；320px 不得硬塞雙欄。

- [x] **步驟 6：重跑 sticky／grid／既有輸入測試**

```bash
npx playwright test tests/settings-personalization.spec.ts --project=chromium --retries=0 -g "stay fixed|three two and one|bounded percentage|temporarily empty"
```

預期：全部 PASS。

---

## 任務 4：外觀與圖標固定雙預覽

**檔案：**
- 修改：`src/components/AppearancePreview.tsx`
- 建立：`src/components/IconPreviewDock.tsx`
- 修改：`src/components/SettingsModal.tsx`
- 修改：`src/index.css`
- 修改：`tests/settings-personalization.spec.ts`

- [x] **步驟 1：寫 base／study／icon preview 紅燈測試**

```ts
test('base and study scales each resize their matching fixed preview', async ({ page }) => {
  await openSettings(page);
  const base = page.getByTestId('appearance-preview-base-text');
  const prompt = page.getByTestId('appearance-preview-study-prompt');
  const answer = page.getByTestId('appearance-preview-study-content');
  const size = async (locator: typeof base) => Number.parseFloat(await locator.evaluate(el => getComputedStyle(el).fontSize));
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
    name: 'preview.png',
    mimeType: 'image/png',
    buffer: png,
  });
  await expect(page.getByTestId('icon-dock-vocab').locator('img')).toBeVisible();
  await page.getByTestId('icon-zoom-vocab').fill('1.5');
  await expect.poll(() => page.getByTestId('icon-dock-vocab').locator('img').getAttribute('style')).toContain('scale(1.5)');
  await page.getByTestId('icon-remove-vocab').click();
  await expect(page.getByTestId('icon-dock-vocab').locator('img')).toHaveCount(0);
});
```

- [x] **步驟 2：執行紅燈**

```bash
npx playwright test tests/settings-personalization.spec.ts --project=chromium --retries=0 -g "matching fixed preview|icon dock follows"
```

預期：FAIL；base preview test id 與圖標 dock 尚不存在。

- [x] **步驟 3：重構 AppearancePreview 為兩個小面板**

網站介面 panel 必須包含：

```tsx
<span data-testid="appearance-preview-base-text" className="appearance-preview__base-text">{copy.baseTextSize}</span>
<span className="appearance-preview__page-heading">{strings.homeTitle}</span>
<span className="appearance-preview__card-title">{strings.modeVocab}</span>
<span className="appearance-preview__card-body">{strings.modeVocabDesc}</span>
<span data-testid="appearance-preview-stat-number">128</span>
```

練習 panel 必須保留 `appearance-preview-study-prompt` 與 `appearance-preview-study-content` test ids。base element CSS 明確乘上 `var(--font-scale-base)`，不能依賴繼承。

- [x] **步驟 4：建立 IconPreviewDock**

Props：

```ts
interface Props {
  settings: UiPreferencesV1;
  records: IconAssetRecord[];
  strings: UIStrings;
}
```

元件只選 active profile records，為每個 record 建立 object URL，組成 `ActiveIconAssets`，unmount 或 records 變更時 revoke。用 `CustomIcon` 顯示六個 slots，缺圖時使用與正式卡片相同的 Lucide fallback。不得保存 object URL 到 state storage。

- [x] **步驟 5：加入 preview dock responsive CSS**

- appearance 兩個 panel 一般保持並排。
- 320px 仍並排但縮短說明；若實測文字破版，允許同一 dock 內改為兩列，但 dock 不可無限制增高。
- 矮橫式縮小 gap／padding、隱藏 `.preview-secondary-copy`，保留 base、heading、prompt、answer、stat、icons。
- 圖標 dock 左邊兩模式、右邊 2×2 統計，圖片容器保持一致 object-fit／transform。

- [x] **步驟 6：重跑 preview、icon 與 320px 測試**

```bash
npx playwright test tests/settings-personalization.spec.ts --project=chromium --retries=0 -g "matching fixed preview|icon dock follows|320px viewport|three named icon"
```

預期：全部 PASS；既有圖片精細編輯與持久化測試不得退化。

---

## 任務 5：雲端同步驗證指南傻瓜化

**檔案：**
- 修改：`/home/shuaichi/Projects/03_Production/WordForge_雲端同步驗證指南.html`
- 驗證：Playwright 臨時靜態伺服器／HTML DOM assertions

- [x] **步驟 1：先建立指南驗收腳本或臨時 Playwright assertions**

驗收至少斷言：

```ts
const requiredUrls = [
  'https://console.cloud.google.com/projectcreate',
  'https://console.cloud.google.com/apis/library/drive.googleapis.com',
  'https://console.cloud.google.com/auth/overview',
  'https://console.cloud.google.com/auth/branding',
  'https://console.cloud.google.com/auth/audience',
  'https://console.cloud.google.com/auth/scopes',
  'https://console.cloud.google.com/auth/clients',
];
for (const url of requiredUrls) await expect(page.locator(`a[href="${url}"]`)).toHaveCount(1);
await expect(page.locator('body')).toContainText('npx playwright test tests/sync.spec.ts --project=chromium --retries=0');
await expect(page.locator('body')).toContainText('模擬');
await expect(page.locator('body')).toContainText('不會讀寫 Google Drive');
```

另在 320 與 1440px 斷言 `scrollWidth <= clientWidth`，並測核取狀態 reload 後保留。

- [x] **步驟 2：執行指南紅燈檢查**

以 `python3 -m http.server` 服務 `/home/shuaichi/Projects/03_Production`，執行 assertions。

預期：FAIL；現有 HTML 缺七個直接 Console URL 與完整逐步命令／排錯文字。

- [x] **步驟 3：重寫「同步核心自動化驗證」為逐步操作**

必須依序包含：

```bash
cd /home/shuaichi/Projects/03_Production/SRS_Web_App
node --version
npm --version
test -d node_modules && echo "依賴已存在" || echo "請執行 npm install"
npx playwright test tests/sync.spec.ts --project=chromium --retries=0
```

寫清楚 Playwright config 會自動啟動 Vite dev server、正常預期 7 tests PASS、測試不需 Client ID。列出 Chromium 缺失時 `npx playwright install chromium`；port 5173 衝突時先關閉自己啟動的舊 dev server，不提供破壞性 kill-all 指令。

七個案例逐項用中文說明：upload、download、conflict preservation、first-connect divergence、offline convergence、post-write disconnect、partial-download rollback。

- [x] **步驟 4：補 Google Cloud 每頁入口與逐欄指南**

每個 Console URL 以明顯按鈕放在對應步驟頂部，另提供「如果連結要求登入是正常的」提示。欄位內容必須與規格 §7.3 完全一致，並分清：

- Pilot 現在必填。
- 正式對外發布才必填。
- 不應填寫／不應分享。

附上 Google 官方解釋連結：Drive appData、Drive scopes、Auth Platform get started、Audience、Data Access、OAuth Clients、GIS token model；不得連非官方部落格。

- [x] **步驟 5：重跑指南驗收至綠燈**

預期：七個 Console URL 各存在一次、命令與警示存在、320／1440 無溢位、checkbox reload 保留。停止臨時 HTTP server。

---

## 任務 6：文件、完整回歸、視覺驗收與 Cleanup

**檔案：**
- 修改：`README.md`
- 修改：`docs/i18n/README-en.md`
- 修改：`CHANGELOG.md`
- 修改：`/home/shuaichi/Projects/04_Management/plan/[Running]SRS_Web_App_Mobile_UI_Icon_Profiles-v1.md`

- [x] **步驟 1：更新使用文件**

記錄：

- 儲存後保持開啟與已儲存狀態。
- dirty close confirmation。
- 固定雙預覽與 base／study preview 對應。
- 控制項 3／2／1 欄。
- 雲端指南直接入口；真正 Google Drive Stage 4 仍未完成。

- [x] **步驟 2：更新管理計畫**

在 Running mobile UI plan 新增 2026-07-22 Stage，包含本計畫六個任務、TDD 證據、Windows 人工驗收與 Cleanup。不得在使用者驗收前改成 Resolved。

- [x] **步驟 3：執行差異與 lint**

```bash
git diff --check
npm run lint
```

預期：diff check exit 0；lint 0 errors。若仍只有既有 `App.tsx`／`LearningView.tsx` Hook dependency warnings，記錄精確行號；新增程式不得增加 warning。

- [x] **步驟 4：執行 build／typecheck**

```bash
npm run build
```

預期：`tsc -b`、Vite production build 與 PWA service worker 全部成功。專案沒有獨立 typecheck script，此命令是正式 typecheck。

- [x] **步驟 5：執行完整 Chromium 回歸**

```bash
npx playwright test --project=chromium --retries=0
```

預期：現有 55 項加本輪新增測試全部 PASS；必須引用 fresh output 的實際數量，不預先虛構最終總數。

- [x] **步驟 6：視覺矩陣驗收**

用 Playwright 或瀏覽器逐一檢查：

- 320×720、390×844、430×932 直式。
- 844×390、932×430 橫式。
- 768×1024、1024×768、1440×900。
- 外觀與圖標分頁在頂部、中段、捲到底部。
- 八個倍率最大／最小、三個圖標 profiles、alertdialog。

每個尺寸驗證：header／dock 固定、scroll region 可達底部、無水平溢位、save／X 不被遮蔽、dialog focus 正常。

- [x] **步驟 7：Cleanup**

將下列本輪拋棄式產物移至系統 Trash：

- `test-results/`
- 視覺驗收 screenshots 臨時資料夾
- HTML 驗收臨時腳本／server temp

保留所有 `.bak-20260722-sticky-settings`，直到使用者 Windows 驗收通過。確認 dev server `http://localhost:5173` 回傳 HTTP 200，供使用者驗收。

- [x] **步驟 8：交付報告**

提供：修改摘要、檔案清單、dirty／儲存資料流、實際驗證命令與結果、雲端指南連結、Windows 預覽方式、已知既有 warnings。不得聲稱 Google Drive provider 已完成，不 commit、不 push。

---

## 計畫自檢

- [x] 規格 §1～§11 每個需求皆對應任務 1～6。
- [x] 無禁止使用的占位語、未決介面或未定義方法。
- [x] `SettingsDraft`、`areSettingsDraftsEqual`、`SettingsCloseConfirm`、`IconPreviewDock` 的名稱與簽名全篇一致。
- [x] 每個 production 行為皆先有會正確失敗的測試，再有最小實作與綠燈指令。
- [x] 不新增 dependency、後端、OAuth secret、資料庫 migration 或同步演算法變更。
- [x] 備份、完整回歸、視覺矩陣、Cleanup 與等待 Windows 人工驗收均已列入。
