# WordForge AI 色彩指令列實作計畫

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推薦）或 superpowers:executing-plans 逐任務實現此計畫。步驟使用複選框（`- [ ]`）語法來跟蹤進度。

**目標：** 在設定的自訂配色區加入嚴格、可部分更新的 AI 色彩指令列，支援目前配色顯示／複製、即時預覽、最近儲存配色回復與完整驗證。

**架構：** `themeCommand.ts` 是唯一語法與序列化邊界，回傳原子式部分 patch 或結構化錯誤；`ColorCommandBar.tsx` 管理暫態輸入與操作狀態；`SettingsModal.tsx` 只負責把 patch 合併到目前模式、呼叫既有預覽與從 `savedSnapshot` 回復。正式持久化繼續使用 `wordforge_appearance_v1` 與現有全域儲存交易。

**技術棧：** React 19、TypeScript 6、Vite 8、Lucide React、原生 Clipboard API、CSS Grid／container query、Playwright 1.59。

---

## 執行限制

- 核准規格：`docs/superpowers/specs/2026-07-23-color-command-design.md`。
- 目前功能依賴工作區內尚未提交的設定固定列、草稿快照及雙預覽改版；不得 `git reset`、`git checkout --`、覆蓋或另開不含這些變更的 worktree。
- 現有 worktree 有多輪其他功能變更。依共享治理，本計畫不自動 commit 或 push；每個任務用 targeted test 與 `git diff --check` 建立確定性 checkpoint，待使用者另行授權再整理提交。
- 修改既有檔案前先建立 `.bak-20260723-color-command` 備份。新增檔不需要備份。
- 不新增 npm dependency、後端、AI API、localStorage key、主題 schema version 或備份 schema version。
- 指令協定固定使用中文項目名稱；其他介面操作文字沿用現有八語 `PersonalizationStrings`。

## 檔案結構與責任

- 建立 `src/lib/themeCommand.ts`：固定欄位、嚴格解析、HEX 正規化、結構化錯誤與標準序列化。
- 建立 `src/components/ColorCommandBar.tsx`：暫態輸入、顯示、複製、套用、回復、鍵盤與 ARIA 狀態。
- 修改 `src/components/SettingsModal.tsx`：提供目前 tokens、合併部分 patch、回復目前模式的 saved selection。
- 修改 `src/lib/personalizationStrings.ts`：八語操作文案；指令關鍵字維持中文協定。
- 修改 `src/index.css`：沿用設計變數的指令列、44px 圖標按鈕、container/mobile/landscape 保護。
- 建立 `tests/theme-command.spec.ts`：純解析器與序列化測試。
- 建立 `tests/color-command-ui.spec.ts`：套用、原子錯誤、模式隔離、回復、複製、對比、持久化與響應式測試。
- 修改 `README.md`、`docs/i18n/README-en.md`、`CHANGELOG.md`：使用方式、固定語法與儲存界線。
- 修改 `/home/shuaichi/Projects/04_Management/plan/[Running]SRS_Web_App_Mobile_UI_Icon_Profiles-v1.md`：加入本輪 Stage 10 與驗證證據，不提前結案。

### 任務 1：嚴格解析器與標準序列化

**文件：**
- 建立：`src/lib/themeCommand.ts`
- 建立：`tests/theme-command.spec.ts`

- [ ] **步驟 1：寫入解析器紅燈測試**

建立 `tests/theme-command.spec.ts`：

```ts
import { expect, test } from '@playwright/test';
import {
  formatThemeCommandError,
  parseThemeCommand,
  serializeThemeCommand,
} from '../src/lib/themeCommand';

test('parses a complete command and normalizes lowercase hex', () => {
  expect(parseThemeCommand('背景=#f7f8fc；卡片=#ffffff；主色=#4f46e5；強調=#f59e0b')).toEqual({
    ok: true,
    patch: {
      background: '#F7F8FC',
      card: '#FFFFFF',
      primary: '#4F46E5',
      accent: '#F59E0B',
    },
  });
});

test('parses an arbitrary-order partial command with bounded whitespace', () => {
  expect(parseThemeCommand('  強調 = #F59E0B ； 主色 = #2563EB  ')).toEqual({
    ok: true,
    patch: { accent: '#F59E0B', primary: '#2563EB' },
  });
});

for (const [name, input, code] of [
  ['empty', '   ', 'empty'],
  ['multiline', '背景=#F8FAFC\n卡片=#FFFFFF', 'multiline'],
  ['unknown label', '品牌=#2563EB', 'unknown-label'],
  ['duplicate label', '主色=#2563EB；主色=#166534', 'duplicate-label'],
  ['missing assignment', '主色#2563EB', 'invalid-assignment'],
  ['too many assignments', '主色=#2563EB=錯誤', 'invalid-assignment'],
  ['three digit hex', '主色=#369', 'invalid-hex'],
  ['invalid hex', '主色=#12GG44', 'invalid-hex'],
  ['ascii delimiter', '背景=#F8FAFC;卡片=#FFFFFF', 'invalid-assignment'],
  ['trailing delimiter', '背景=#F8FAFC；', 'empty-segment'],
] as const) {
  test(`rejects ${name} atomically`, () => {
    const result = parseThemeCommand(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(code);
  });
}

test('reports segment, source and first duplicate position', () => {
  const result = parseThemeCommand('背景=#F8FAFC；主色=#2563EB；主色=#166534');
  expect(result).toMatchObject({
    ok: false,
    error: {
      code: 'duplicate-label',
      segmentIndex: 3,
      segment: '主色=#166534',
      firstSegmentIndex: 2,
    },
  });
  if (!result.ok) expect(formatThemeCommandError(result.error)).toContain('第 3 段');
});

test('serializes all tokens in canonical order and round trips', () => {
  const tokens = {
    primary: '#2563eb',
    accent: '#7c3aed',
    background: '#f8fafc',
    card: '#ffffff',
  };
  const command = serializeThemeCommand(tokens);
  expect(command).toBe('背景=#F8FAFC；卡片=#FFFFFF；主色=#2563EB；強調=#7C3AED');
  expect(parseThemeCommand(command)).toEqual({
    ok: true,
    patch: {
      background: '#F8FAFC',
      card: '#FFFFFF',
      primary: '#2563EB',
      accent: '#7C3AED',
    },
  });
});
```

- [ ] **步驟 2：執行測試並確認正確紅燈**

執行：

```bash
npx playwright test tests/theme-command.spec.ts --project=chromium --retries=0
```

預期：FAIL，錯誤指出無法解析 `../src/lib/themeCommand`；不能是 dev server 或既有測試故障。

- [ ] **步驟 3：建立最小完整解析器**

建立 `src/lib/themeCommand.ts`：

```ts
import type { ThemeCoreTokens } from './theme';

export const THEME_COMMAND_FIELDS = [
  { label: '背景', token: 'background' },
  { label: '卡片', token: 'card' },
  { label: '主色', token: 'primary' },
  { label: '強調', token: 'accent' },
] as const satisfies ReadonlyArray<{ label: string; token: keyof ThemeCoreTokens }>;

export type ThemeCommandErrorCode =
  | 'empty'
  | 'multiline'
  | 'empty-segment'
  | 'invalid-assignment'
  | 'unknown-label'
  | 'duplicate-label'
  | 'invalid-hex';

export interface ThemeCommandError {
  code: ThemeCommandErrorCode;
  segmentIndex?: number;
  segment?: string;
  label?: string;
  firstSegmentIndex?: number;
}

export type ThemeCommandResult =
  | { ok: true; patch: Partial<ThemeCoreTokens> }
  | { ok: false; error: ThemeCommandError };

const HEX_COLOR = /^#[0-9A-F]{6}$/i;
const ALLOWED_LABELS = THEME_COMMAND_FIELDS.map(field => field.label).join('、');

export function parseThemeCommand(input: string): ThemeCommandResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: { code: 'empty' } };
  if (/[\r\n]/.test(input)) return { ok: false, error: { code: 'multiline' } };

  const segments = trimmed.split('；');
  const patch: Partial<ThemeCoreTokens> = {};
  const firstPositions = new Map<string, number>();

  for (let index = 0; index < segments.length; index += 1) {
    const segmentIndex = index + 1;
    const segment = segments[index].trim();
    if (!segment) return { ok: false, error: { code: 'empty-segment', segmentIndex, segment } };

    const firstEquals = segment.indexOf('=');
    if (firstEquals <= 0 || firstEquals !== segment.lastIndexOf('=')) {
      return { ok: false, error: { code: 'invalid-assignment', segmentIndex, segment } };
    }

    const label = segment.slice(0, firstEquals).trim();
    const value = segment.slice(firstEquals + 1).trim();
    const field = THEME_COMMAND_FIELDS.find(candidate => candidate.label === label);
    if (!field) {
      return { ok: false, error: { code: 'unknown-label', segmentIndex, segment, label } };
    }

    const firstSegmentIndex = firstPositions.get(label);
    if (firstSegmentIndex !== undefined) {
      return {
        ok: false,
        error: { code: 'duplicate-label', segmentIndex, segment, label, firstSegmentIndex },
      };
    }
    if (!HEX_COLOR.test(value)) {
      return { ok: false, error: { code: 'invalid-hex', segmentIndex, segment, label } };
    }

    firstPositions.set(label, segmentIndex);
    patch[field.token] = value.toUpperCase();
  }

  return { ok: true, patch };
}

export function serializeThemeCommand(tokens: ThemeCoreTokens): string {
  return THEME_COMMAND_FIELDS
    .map(field => `${field.label}=${tokens[field.token].toUpperCase()}`)
    .join('；');
}

export function formatThemeCommandError(error: ThemeCommandError): string {
  const location = error.segmentIndex ? `第 ${error.segmentIndex} 段` : '整行指令';
  const source = error.segment !== undefined ? `「${error.segment}」` : '';
  switch (error.code) {
    case 'empty': return '請輸入至少一個色彩項目。';
    case 'multiline': return '色彩指令只能使用單行格式。';
    case 'empty-segment': return `${location}${source}：不可有空白項目或結尾分號。`;
    case 'invalid-assignment': return `${location}${source}：每個項目必須使用「項目=#RRGGBB」。`;
    case 'unknown-label': return `${location}${source}：未知項目「${error.label ?? ''}」；可用項目為 ${ALLOWED_LABELS}。`;
    case 'duplicate-label': return `${location}${source}：項目「${error.label ?? ''}」已在第 ${error.firstSegmentIndex} 段出現。`;
    case 'invalid-hex': return `${location}${source}：色碼必須是六位 HEX，例如 #2563EB。`;
  }
}
```

- [ ] **步驟 4：重跑解析器測試**

執行：

```bash
npx playwright test tests/theme-command.spec.ts --project=chromium --retries=0
```

預期：全部 PASS。

- [ ] **步驟 5：建立任務 checkpoint**

執行：

```bash
git diff --check -- src/lib/themeCommand.ts tests/theme-command.spec.ts
```

預期：exit 0。不要 commit 或 push。

### 任務 2：先鎖定指令列端到端行為

**文件：**
- 建立：`tests/color-command-ui.spec.ts`

- [ ] **步驟 1：寫入完整 UI 紅燈測試**

建立 `tests/color-command-ui.spec.ts`：

```ts
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

  await input.fill('主色=#166534；強調=#0F766E');
  await input.press('Enter');
  await expect(primary).toHaveValue('#166534');
  await expect(accent).toHaveValue('#0F766E');
  await expect(page.getByTestId('theme-command-status')).toContainText('主色');

  await input.fill('主色=#B45309；強調=#12GG44');
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
  await expect(input).toHaveValue('背景=#F8FAFC；卡片=#FFFFFF；主色=#2563EB；強調=#7C3AED');
  await input.fill('主色=#166534');
  await page.getByTestId('theme-command-copy').click();
  await expect(input).toHaveValue('主色=#166534');
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('背景=#F8FAFC；卡片=#FFFFFF；主色=#2563EB；強調=#7C3AED');
});

test('restore uses the latest saved palette and light dark drafts remain isolated', async ({ page }) => {
  await openSettings(page);
  const input = page.getByTestId('theme-command-input');

  await input.fill('背景=#F7FAF7；卡片=#FFFFFF；主色=#166534；強調=#0F766E');
  await page.getByTestId('theme-command-apply').click();
  await page.getByTestId('settings-save').click();
  await expect(page.getByTestId('settings-save-state')).toContainText('已儲存');

  await input.fill('背景=#FFFBEB；卡片=#FFFFFF；主色=#B45309；強調=#9A3412');
  await page.getByTestId('theme-command-apply').click();
  await expect(page.getByTestId('theme-color-primary')).toHaveValue('#B45309');
  await page.getByTestId('theme-command-restore').click();
  await expect(page.getByTestId('theme-color-primary')).toHaveValue('#166534');

  await input.fill('主色=#B45309');
  await page.getByTestId('theme-mode-dark').click();
  await expect(input).toHaveValue('');
  await input.fill('背景=#0F172A；卡片=#1E293B；主色=#93C5FD；強調=#C4B5FD');
  await page.getByTestId('theme-command-apply').click();
  await expect(page.getByTestId('theme-color-primary')).toHaveValue('#93C5FD');

  await page.getByTestId('theme-mode-light').click();
  await expect(page.getByTestId('theme-color-primary')).toHaveValue('#166534');
});

test('valid low contrast command previews but cannot be saved', async ({ page }) => {
  await openSettings(page);
  await page.getByTestId('theme-command-input').fill(
    '背景=#F8FAFC；卡片=#F8FAFC；主色=#F8FAFC；強調=#F8FAFC',
  );
  await page.getByTestId('theme-command-apply').click();
  await expect(page.getByTestId('theme-color-primary')).toHaveValue('#F8FAFC');
  await expect(page.getByTestId('theme-contrast-warning')).toBeVisible();
  await expect(page.getByTestId('settings-save')).toBeDisabled();
});

test('saved command results persist but command text does not', async ({ page }) => {
  await openSettings(page);
  await page.getByTestId('theme-command-input').fill(
    '背景=#F7FAF7；卡片=#FFFFFF；主色=#166534；強調=#0F766E',
  );
  await page.getByTestId('theme-command-apply').click();
  await page.getByTestId('settings-save').click();
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), APPEARANCE_STORAGE_KEY)).not.toBeNull();

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
  await page.getByTestId('theme-command-input').fill('主色=#166534');
  await page.getByTestId('theme-command-copy').click();
  await expect(page.getByTestId('theme-command-input')).toHaveValue('主色=#166534');
  await expect(page.getByTestId('theme-command-status')).toContainText('無法複製');
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
```

- [ ] **步驟 2：執行 UI 測試並確認缺少元件的紅燈**

執行：

```bash
npx playwright test tests/color-command-ui.spec.ts --project=chromium --retries=0
```

預期：FAIL，第一個失敗是找不到 `theme-command-input`；既有設定 modal 必須仍可開啟。

### 任務 3：指令列元件、八語文案與 SettingsModal 整合

**文件：**
- 建立：`src/components/ColorCommandBar.tsx`
- 修改：`src/lib/personalizationStrings.ts`
- 修改：`src/components/SettingsModal.tsx`

- [ ] **步驟 1：備份兩個既有檔案**

執行：

```bash
cp -a src/lib/personalizationStrings.ts src/lib/personalizationStrings.ts.bak-20260723-color-command
cp -a src/components/SettingsModal.tsx src/components/SettingsModal.tsx.bak-20260723-color-command
```

預期：兩份備份存在，原檔內容未改變。

- [ ] **步驟 2：擴充集中式介面字串**

在 `PersonalizationStrings` 增加：

```ts
colorCommandTitle: string;
colorCommandShowCurrent: string;
colorCommandCopyCurrent: string;
colorCommandApply: string;
colorCommandRestore: string;
colorCommandPlaceholder: string;
colorCommandRule: string;
colorCommandApplied: string;
colorCommandRestored: string;
colorCommandCopied: string;
colorCommandCopyFailed: string;
```

為現有八個 locale 加入以下精確內容；關鍵字 `背景、卡片、主色、強調` 不翻譯，確保匯入協定一致：

```ts
// zh-TW
colorCommandTitle: 'AI 色彩指令', colorCommandShowCurrent: '顯示目前配置', colorCommandCopyCurrent: '一鍵複製',
colorCommandApply: '套用色彩指令', colorCommandRestore: '恢復最近儲存的配色',
colorCommandPlaceholder: '背景=#F8FAFC；卡片=#FFFFFF；主色=#2563EB；強調=#7C3AED',
colorCommandRule: '格式：項目=#RRGGBB；項目=#RRGGBB｜可用項目：背景、卡片、主色、強調｜可只填要修改的項目',
colorCommandApplied: '已套用', colorCommandRestored: '已恢復最近儲存的配色。',
colorCommandCopied: '目前配色指令已複製。', colorCommandCopyFailed: '無法複製，請允許剪貼簿權限後再試。',

// en
colorCommandTitle: 'AI color command', colorCommandShowCurrent: 'Show current palette', colorCommandCopyCurrent: 'Copy command',
colorCommandApply: 'Apply color command', colorCommandRestore: 'Restore last saved palette',
colorCommandPlaceholder: '背景=#F8FAFC；卡片=#FFFFFF；主色=#2563EB；強調=#7C3AED',
colorCommandRule: 'Format: 項目=#RRGGBB；項目=#RRGGBB | Allowed keys: 背景、卡片、主色、強調 | Partial updates are allowed',
colorCommandApplied: 'Applied', colorCommandRestored: 'Restored the last saved palette.',
colorCommandCopied: 'Current palette command copied.', colorCommandCopyFailed: 'Copy failed. Allow clipboard access and try again.',

// ja
colorCommandTitle: 'AI カラーコマンド', colorCommandShowCurrent: '現在の配色を表示', colorCommandCopyCurrent: 'コマンドをコピー',
colorCommandApply: 'カラーコマンドを適用', colorCommandRestore: '最後に保存した配色へ戻す',
colorCommandPlaceholder: '背景=#F8FAFC；卡片=#FFFFFF；主色=#2563EB；強調=#7C3AED',
colorCommandRule: '形式：項目=#RRGGBB；項目=#RRGGBB｜使用可能：背景、卡片、主色、強調｜変更項目だけでも指定可能',
colorCommandApplied: '適用済み', colorCommandRestored: '最後に保存した配色へ戻しました。',
colorCommandCopied: '現在の配色コマンドをコピーしました。', colorCommandCopyFailed: 'コピーできません。クリップボード権限を許可してください。',

// ko
colorCommandTitle: 'AI 색상 명령', colorCommandShowCurrent: '현재 색상 표시', colorCommandCopyCurrent: '명령 복사',
colorCommandApply: '색상 명령 적용', colorCommandRestore: '마지막 저장 색상 복원',
colorCommandPlaceholder: '背景=#F8FAFC；卡片=#FFFFFF；主色=#2563EB；強調=#7C3AED',
colorCommandRule: '형식: 項目=#RRGGBB；項目=#RRGGBB | 사용 키: 背景、卡片、主色、強調 | 일부 항목만 입력 가능',
colorCommandApplied: '적용됨', colorCommandRestored: '마지막으로 저장한 색상을 복원했습니다.',
colorCommandCopied: '현재 색상 명령을 복사했습니다.', colorCommandCopyFailed: '복사할 수 없습니다. 클립보드 권한을 허용하세요.',

// de
colorCommandTitle: 'AI-Farbbefehl', colorCommandShowCurrent: 'Aktuelle Palette anzeigen', colorCommandCopyCurrent: 'Befehl kopieren',
colorCommandApply: 'Farbbefehl anwenden', colorCommandRestore: 'Zuletzt gespeicherte Palette',
colorCommandPlaceholder: '背景=#F8FAFC；卡片=#FFFFFF；主色=#2563EB；強調=#7C3AED',
colorCommandRule: 'Format: 項目=#RRGGBB；項目=#RRGGBB | Schlüssel: 背景、卡片、主色、強調 | Teiländerungen sind erlaubt',
colorCommandApplied: 'Angewendet', colorCommandRestored: 'Zuletzt gespeicherte Palette wiederhergestellt.',
colorCommandCopied: 'Aktueller Palettenbefehl kopiert.', colorCommandCopyFailed: 'Kopieren fehlgeschlagen. Zwischenablagezugriff erlauben.',

// es
colorCommandTitle: 'Comando de color IA', colorCommandShowCurrent: 'Mostrar paleta actual', colorCommandCopyCurrent: 'Copiar comando',
colorCommandApply: 'Aplicar comando de color', colorCommandRestore: 'Restaurar última paleta guardada',
colorCommandPlaceholder: '背景=#F8FAFC；卡片=#FFFFFF；主色=#2563EB；強調=#7C3AED',
colorCommandRule: 'Formato: 項目=#RRGGBB；項目=#RRGGBB | Claves: 背景、卡片、主色、強調 | Se permiten cambios parciales',
colorCommandApplied: 'Aplicado', colorCommandRestored: 'Se restauró la última paleta guardada.',
colorCommandCopied: 'Se copió el comando de la paleta actual.', colorCommandCopyFailed: 'No se pudo copiar. Permite el acceso al portapapeles.',

// fr
colorCommandTitle: 'Commande couleur IA', colorCommandShowCurrent: 'Afficher la palette actuelle', colorCommandCopyCurrent: 'Copier la commande',
colorCommandApply: 'Appliquer la commande couleur', colorCommandRestore: 'Restaurer la dernière palette',
colorCommandPlaceholder: '背景=#F8FAFC；卡片=#FFFFFF；主色=#2563EB；強調=#7C3AED',
colorCommandRule: 'Format : 項目=#RRGGBB；項目=#RRGGBB | Clés : 背景、卡片、主色、強調 | Les modifications partielles sont acceptées',
colorCommandApplied: 'Appliqué', colorCommandRestored: 'Dernière palette enregistrée restaurée.',
colorCommandCopied: 'Commande de la palette actuelle copiée.', colorCommandCopyFailed: 'Copie impossible. Autorisez l’accès au presse-papiers.',

// th
colorCommandTitle: 'คำสั่งสี AI', colorCommandShowCurrent: 'แสดงชุดสีปัจจุบัน', colorCommandCopyCurrent: 'คัดลอกคำสั่ง',
colorCommandApply: 'ใช้คำสั่งสี', colorCommandRestore: 'คืนค่าชุดสีที่บันทึกล่าสุด',
colorCommandPlaceholder: '背景=#F8FAFC；卡片=#FFFFFF；主色=#2563EB；強調=#7C3AED',
colorCommandRule: 'รูปแบบ: 項目=#RRGGBB；項目=#RRGGBB | คีย์: 背景、卡片、主色、強調 | ระบุเฉพาะรายการที่ต้องการแก้ได้',
colorCommandApplied: 'ใช้แล้ว', colorCommandRestored: 'คืนค่าชุดสีที่บันทึกล่าสุดแล้ว',
colorCommandCopied: 'คัดลอกคำสั่งชุดสีปัจจุบันแล้ว', colorCommandCopyFailed: 'คัดลอกไม่ได้ โปรดอนุญาตการเข้าถึงคลิปบอร์ด',
```

- [ ] **步驟 3：建立 ColorCommandBar**

建立 `src/components/ColorCommandBar.tsx`：

```tsx
import { useEffect, useState } from 'react';
import { Check, Clipboard, RotateCcw } from 'lucide-react';
import type { EffectiveTheme, ThemeCoreTokens } from '../lib/theme';
import type { PersonalizationStrings } from '../lib/personalizationStrings';
import {
  THEME_COMMAND_FIELDS,
  formatThemeCommandError,
  parseThemeCommand,
  serializeThemeCommand,
} from '../lib/themeCommand';

interface Props {
  mode: EffectiveTheme;
  tokens: ThemeCoreTokens;
  strings: PersonalizationStrings;
  onApply: (patch: Partial<ThemeCoreTokens>) => void;
  onRestore: () => void;
}

type CommandStatus = { kind: 'success' | 'error'; text: string } | null;

export default function ColorCommandBar({ mode, tokens, strings, onApply, onRestore }: Props) {
  const [command, setCommand] = useState('');
  const [status, setStatus] = useState<CommandStatus>(null);

  useEffect(() => {
    setCommand('');
    setStatus(null);
  }, [mode]);

  const applyCommand = () => {
    const result = parseThemeCommand(command);
    if (!result.ok) {
      setStatus({ kind: 'error', text: formatThemeCommandError(result.error) });
      return;
    }
    onApply(result.patch);
    const labels = THEME_COMMAND_FIELDS
      .filter(field => Object.hasOwn(result.patch, field.token))
      .map(field => field.label);
    setStatus({ kind: 'success', text: `${strings.colorCommandApplied}：${labels.join('、')}` });
  };

  const copyCurrent = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard_unavailable');
      await navigator.clipboard.writeText(serializeThemeCommand(tokens));
      setStatus({ kind: 'success', text: strings.colorCommandCopied });
    } catch {
      setStatus({ kind: 'error', text: strings.colorCommandCopyFailed });
    }
  };

  const restore = () => {
    onRestore();
    setStatus({ kind: 'success', text: strings.colorCommandRestored });
  };

  return (
    <div className="color-command" data-testid="theme-command">
      <div className="color-command__header">
        <span className="color-command__title">{strings.colorCommandTitle}</span>
        <div className="color-command__links">
          <button type="button" data-testid="theme-command-show" onClick={() => {
            setCommand(serializeThemeCommand(tokens));
            setStatus(null);
          }}>
            {strings.colorCommandShowCurrent}
          </button>
          <button type="button" data-testid="theme-command-copy" onClick={() => void copyCurrent()}>
            <Clipboard aria-hidden="true" />
            {strings.colorCommandCopyCurrent}
          </button>
        </div>
      </div>
      <div className="color-command__input-row">
        <input
          type="text"
          className="input font-mono color-command__input"
          data-testid="theme-command-input"
          value={command}
          placeholder={strings.colorCommandPlaceholder}
          aria-describedby="theme-command-rule theme-command-status"
          spellCheck={false}
          autoComplete="off"
          onChange={event => {
            setCommand(event.target.value);
            setStatus(null);
          }}
          onKeyDown={event => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            applyCommand();
          }}
        />
        <button
          type="button"
          className="color-command__icon-button"
          data-testid="theme-command-apply"
          aria-label={strings.colorCommandApply}
          title={strings.colorCommandApply}
          onClick={applyCommand}
        >
          <Check aria-hidden="true" />
        </button>
        <button
          type="button"
          className="color-command__icon-button"
          data-testid="theme-command-restore"
          aria-label={strings.colorCommandRestore}
          title={strings.colorCommandRestore}
          onClick={restore}
        >
          <RotateCcw aria-hidden="true" />
        </button>
      </div>
      <p id="theme-command-rule" data-testid="theme-command-rule" className="color-command__rule">
        {strings.colorCommandRule}
      </p>
      <p
        id="theme-command-status"
        data-testid="theme-command-status"
        role={status?.kind === 'error' ? 'alert' : 'status'}
        aria-live="polite"
        className="color-command__status"
        data-kind={status?.kind ?? 'idle'}
      >
        {status?.text ?? ''}
      </p>
    </div>
  );
}
```

- [ ] **步驟 4：把部分 patch 與 savedSnapshot 接入 SettingsModal**

新增 import：

```ts
import ColorCommandBar from './ColorCommandBar';
```

在 `updateCustomColor` 旁加入：

```ts
const applyColorCommand = (patch: Partial<ThemeCoreTokens>) => {
  previewAppearance(setCustomTheme(draftAppearance, editorMode, { ...coreTokens, ...patch }));
};

const restoreSavedColors = () => {
  previewAppearance({
    ...draftAppearance,
    [editorMode]: savedSnapshot.appearance[editorMode],
  });
};
```

在自訂配色標題和四個 `ColorField` 網格之間加入：

```tsx
<ColorCommandBar
  mode={editorMode}
  tokens={coreTokens}
  strings={copy}
  onApply={applyColorCommand}
  onRestore={restoreSavedColors}
/>
```

不得改 `handleSave`、`contrastIssues`、`isDirty` 或 `requestClose` 的既有資料語義。

- [ ] **步驟 5：執行型別建置並修正只屬於本功能的問題**

執行：

```bash
npm run build
```

預期：`tsc -b` 與 Vite build PASS；如果失敗，錯誤只能透過上述三個檔案內的型別／匯入修正，不順手重構其他元件。

- [ ] **步驟 6：執行功能測試**

執行：

```bash
npx playwright test tests/color-command-ui.spec.ts --project=chromium --retries=0 --grep "applies partial|shows and copies|restore uses|valid low contrast|saved command|clipboard denial"
```

預期：六個功能案例 PASS。

- [ ] **步驟 7：建立任務 checkpoint**

執行：

```bash
git diff --check -- src/components/ColorCommandBar.tsx src/components/SettingsModal.tsx src/lib/personalizationStrings.ts
```

預期：exit 0。不要 commit 或 push。

### 任務 4：響應式版面與可及性

**文件：**
- 修改：`src/index.css`
- 測試：`tests/color-command-ui.spec.ts`

- [ ] **步驟 1：先執行響應式案例取得紅燈**

執行：

```bash
npx playwright test tests/color-command-ui.spec.ts --project=chromium --retries=0 --grep "command controls stay reachable"
```

預期：FAIL；原因為尚未建立指令列專屬 grid、44px 按鈕或窄螢幕 overflow 保護。

- [ ] **步驟 2：備份 CSS**

執行：

```bash
cp -a src/index.css src/index.css.bak-20260723-color-command
```

- [ ] **步驟 3：加入沿用現有設計變數的指令列樣式**

把以下 component styles 放在現有 `.theme-color-picker` 後方：

```css
.color-command {
  min-width: 0;
  margin-bottom: 1rem;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--secondary) 42%, var(--card));
}

.color-command__header {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.color-command__title {
  color: var(--foreground);
  font-size: 0.75rem;
  font-weight: 800;
}

.color-command__links {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
}

.color-command__links button {
  min-height: 2.25rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--primary);
  font-size: 0.75rem;
  font-weight: 700;
}

.color-command__links svg {
  width: 0.875rem;
  height: 0.875rem;
}

.color-command__input-row {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 2.75rem 2.75rem;
  align-items: center;
  gap: 0.375rem;
}

.color-command__input {
  width: 100%;
  min-width: 0;
  height: 2.75rem;
  font-size: clamp(0.7rem, 1.8vw, 0.8125rem);
}

.color-command__icon-button {
  width: 2.75rem;
  height: 2.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--foreground);
  background: var(--card);
  transition: color 150ms ease, border-color 150ms ease, background-color 150ms ease, transform 150ms ease;
}

.color-command__icon-button:hover {
  color: var(--primary);
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, var(--card));
}

.color-command__icon-button:active {
  transform: scale(0.96);
}

.color-command__links button:focus-visible,
.color-command__icon-button:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.color-command__rule,
.color-command__status {
  overflow-wrap: anywhere;
  font-size: 0.6875rem;
  line-height: 1.45;
}

.color-command__rule {
  margin-top: 0.5rem;
  color: var(--muted);
}

.color-command__status {
  min-height: 1rem;
  margin-top: 0.25rem;
  color: var(--success);
  font-weight: 700;
}

.color-command__status[data-kind="error"] {
  color: var(--danger);
}
```

在現有 `@container settings-content` 區域加入：

```css
@container settings-content (max-width: 24rem) {
  .color-command {
    padding: 0.625rem;
  }

  .color-command__header {
    align-items: flex-start;
  }

  .color-command__links {
    width: 100%;
  }
}
```

在短橫式 media query 內加入：

```css
.color-command {
  padding-block: 0.5rem;
}

.color-command__rule {
  margin-top: 0.375rem;
}
```

- [ ] **步驟 4：重跑響應式與可及性案例**

執行：

```bash
npx playwright test tests/color-command-ui.spec.ts --project=chromium --retries=0 --grep "command controls stay reachable"
```

預期：320、390、430、844×390、768、1024、1440 全部 PASS；兩個圖標按鈕 bounding box 均至少 44×44。

- [ ] **步驟 5：回歸既有設定固定列與 320px 版面**

執行：

```bash
npx playwright test tests/settings-personalization.spec.ts --project=chromium --retries=0 --grep "header tabs and preview stay fixed|tabs and maximum scales do not overflow"
```

預期：兩個既有案例 PASS。

### 任務 5：完整功能回歸與持久化界線

**文件：**
- 測試：`tests/color-command-ui.spec.ts`
- 回歸：`tests/theme.spec.ts`
- 回歸：`tests/settings-personalization.spec.ts`
- 回歸：`tests/backup.spec.ts`

- [ ] **步驟 1：跑完整色彩指令 UI 套件**

執行：

```bash
npx playwright test tests/color-command-ui.spec.ts --project=chromium --retries=0
```

預期：七個案例全部 PASS。

- [ ] **步驟 2：驗證既有主題儲存、取消與對比閘門**

執行：

```bash
npx playwright test tests/theme.spec.ts --project=chromium --retries=0
```

預期：全部 PASS，包含 preset reload、discard rollback、低對比禁止儲存與手機設定可用性。

- [ ] **步驟 3：驗證設定快照與未儲存保護**

執行：

```bash
npx playwright test tests/settings-personalization.spec.ts --project=chromium --retries=0 --grep "saving keeps settings open|dirty x exit|discard restores"
```

預期：三個案例 PASS；指令文字本身不應改變 `isDirty`，實際配色變更仍會觸發確認。

- [ ] **步驟 4：確認備份格式沒有被擴充**

執行：

```bash
npx playwright test tests/backup.spec.ts --project=chromium --retries=0
```

預期：既有 v1 migration 與 v2 round-trip 全部 PASS；備份只保存外觀結果，不包含指令草稿。

### 任務 6：使用說明與變更紀錄

**文件：**
- 修改：`README.md`
- 修改：`docs/i18n/README-en.md`
- 修改：`CHANGELOG.md`

- [ ] **步驟 1：備份文件**

執行：

```bash
cp -a README.md README.md.bak-20260723-color-command
cp -a docs/i18n/README-en.md docs/i18n/README-en.md.bak-20260723-color-command
cp -a CHANGELOG.md CHANGELOG.md.bak-20260723-color-command
```

- [ ] **步驟 2：更新繁中 README 外觀說明**

把第二步「外觀」補成包含以下完整資訊：

```markdown
2.  **外觀**:在「設定 → 外觀」選擇跟隨系統、淺色或深色模式,再套用推薦主題;也可自訂品牌色、強調色、背景色與卡片色。自訂配色上方的 AI 色彩指令列接受 `背景=#RRGGBB；卡片=#RRGGBB；主色=#RRGGBB；強調=#RRGGBB`,可只填要修改的項目;打勾只更新即時預覽,仍須按頂部「儲存」才會寫入本機。可顯示／複製目前完整配置,回復按鈕則回到最近一次儲存的目前模式配色。
```

- [ ] **步驟 3：更新英文 README**

把 Appearance 項目補成：

```markdown
2.  **Appearance**: In **Settings → Appearance**, choose system, light, or dark mode and apply a recommended theme. Brand, accent, background, and card colors can be customized. The AI color command bar accepts the strict Chinese-key protocol `背景=#RRGGBB；卡片=#RRGGBB；主色=#RRGGBB；強調=#RRGGBB`; a command may contain only the fields to change. Apply updates the live preview, while the fixed top **Save** button remains the only persistence action. The current full command can be shown or copied, and restore returns the active mode to its most recently saved palette.
```

- [ ] **步驟 4：更新 Unreleased changelog**

在 `[Unreleased] → [新增]` 加入：

```markdown
- 外觀自訂配色新增嚴格 AI 色彩指令列,支援全部／部分項目原子套用、目前配置標準化顯示與一鍵複製、即時對比預覽,以及回復目前模式最近一次已儲存配色;指令草稿不另行持久化。
```

- [ ] **步驟 5：檢查文件格式**

執行：

```bash
git diff --check -- README.md docs/i18n/README-en.md CHANGELOG.md
```

預期：exit 0。

### 任務 7：完整驗證、計畫證據與清理

**文件：**
- 修改：`/home/shuaichi/Projects/04_Management/plan/[Running]SRS_Web_App_Mobile_UI_Icon_Profiles-v1.md`
- 檢查：本計畫列出的所有程式、測試與文件

- [ ] **步驟 1：執行 lint**

執行：

```bash
npm run lint
```

預期：0 errors；若仍只有任務前已知的 `src/App.tsx` 與 `src/components/LearningView.tsx` Hook dependency warnings，逐項原樣記錄，不宣稱零 warnings。

- [ ] **步驟 2：執行 TypeScript 與 production build**

執行：

```bash
npm run build
```

預期：`tsc -b`、Vite build 與 PWA 產出成功。`package.json` 沒有獨立 `typecheck` script，必須在交付說明中明列由 `npm run build` 的 `tsc -b` 覆蓋。

- [ ] **步驟 3：執行 targeted suites**

執行：

```bash
npx playwright test tests/theme-command.spec.ts tests/color-command-ui.spec.ts tests/theme.spec.ts tests/settings-personalization.spec.ts --project=chromium --retries=0
```

預期：全部 PASS。

- [ ] **步驟 4：執行完整 Playwright 回歸**

執行：

```bash
npx playwright test --project=chromium --retries=0
```

預期：完整套件全部 PASS，記錄實際案例數與耗時，不沿用舊數字。

- [ ] **步驟 5：檢查 diff、禁止項目與儲存鍵**

執行：

```bash
git diff --check
rg -n "wordforge_.*command|localStorage.*command|sessionStorage.*command" src
git status --short
```

預期：`git diff --check` exit 0；搜尋不得出現新的 command storage key；status 只新增／修改本計畫檔案及任務前既有變更，沒有被重設或刪除的使用者檔案。

- [ ] **步驟 6：備份並更新共享 Running 計畫**

執行：

```bash
cp -a /home/shuaichi/Projects/04_Management/plan/'[Running]SRS_Web_App_Mobile_UI_Icon_Profiles-v1.md' /home/shuaichi/Projects/04_Management/plan/'[Running]SRS_Web_App_Mobile_UI_Icon_Profiles-v1.md.bak-20260723-color-command'
```

在 Roadmap 加入 Stage 10，逐項記錄：解析器、指令列、模式隔離、savedSnapshot 回復、clipboard、對比、持久化、responsive、文件與 fresh verification 的實際結果。Windows 人工驗收仍維持未完成，計畫不得改名 Resolved。

- [ ] **步驟 7：清理測試暫存**

若 `/home/shuaichi/Projects/03_Production/SRS_Web_App/test-results` 存在，使用可回復方式移到 Trash：

```bash
gio trash /home/shuaichi/Projects/03_Production/SRS_Web_App/test-results
```

保留 `.bak-20260723-color-command` 到 Windows 驗收通過；不刪除其他日期的備份。

- [ ] **步驟 8：提供本機預覽方式**

執行：

```bash
npm run dev -- --host 0.0.0.0
```

預期：Vite 顯示 `http://localhost:5173/`；Windows Chrome／Edge 可開啟後進入「設定 → 外觀 → 自訂配色」驗收。若 5173 已有本專案 server，沿用該 server，不啟動第二份。

## 規格覆蓋對照

| 規格要求 | 實作／驗證任務 |
|:---|:---|
| 嚴格固定語法、部分更新、原子錯誤 | 任務 1、2、3 |
| 顯示目前配置、一鍵複製且不覆蓋草稿 | 任務 2、3 |
| 打勾／Enter 即時預覽 | 任務 2、3 |
| 回到最近一次儲存、儲存後更新基準 | 任務 2、3、5 |
| 淺色／深色隔離與切換清空指令 | 任務 2、3 |
| 對比不足可預覽但禁止儲存 | 任務 2、3、5 |
| 指令不持久化、結果沿用既有儲存／備份 | 任務 2、3、5 |
| 44px、ARIA、focus、mobile／landscape／desktop 無溢位 | 任務 2、4 |
| 不新增後端、dependency 或 schema | 任務 5、7 |
| lint、typecheck、test、build 與本機預覽 | 任務 7 |

## 交付條件

- 解析器與 UI 測試均以 fresh `--retries=0` 通過。
- 完整 Playwright、lint、build 與 `git diff --check` 有本輪原始輸出證據。
- README、英文 README、CHANGELOG 與 Running 計畫記錄實際功能及限制。
- 沒有新的 storage key、schema migration、npm dependency、後端或 AI API。
- 沒有覆蓋或清除任務前既有未提交變更。
- 開發伺服器可由 Windows 透過 `http://localhost:5173/` 進行人工驗收。
