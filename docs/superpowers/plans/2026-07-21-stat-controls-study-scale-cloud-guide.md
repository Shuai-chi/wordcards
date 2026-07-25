# WordForge 統計卡、尺寸控制與雲端指南實作計畫

> **面向 AI 代理的工作者：** 使用 `executing-plans` 依序執行；每項功能遵守 TDD 紅—綠—重構。依使用者要求與 workspace 多 Agent 規則，不建立 subagent。

**目標：** 實作 1/3＋2/3 統計卡、儲存時才 fallback 的 profile 名稱、A 型尺寸步進器與練習卡兩組倍率，並交付可離線閱讀的雲端同步驗證 HTML。

**架構：** 延伸既有集中式 `UI_SCALE_CONSTRAINTS` 與 CSS variables；`Dashboard` 只做顯示格式化；Settings draft 與 persisted normalization 分離；LearningView 只新增語意 class。雲端指南不接 API、不建立 OAuth 資源。

**技術棧：** React 19、TypeScript 6、Vite 8、CSS Grid／clamp、Playwright、靜態 HTML。

---

## 任務 1：統計卡比例與 999+

**檔案：**
- 修改：`tests/responsive-ui.spec.ts`
- 修改：`src/components/Dashboard.tsx`
- 修改：`src/index.css`

- [x] 新增測試：390px 下左欄寬約卡片 1/3、數字欄約 2/3；左欄 icon／label 高度約 2:1。
- [x] 新增顯示格式單元或 DOM 測試：999 保留、1000 顯示 `999+`。
- [x] 執行 targeted test，確認舊 55/45 與水平 label markup 造成預期 FAIL。
- [x] 將 label 容器改為左側 stack，CSS 改 1fr/2fr 與 2fr/1fr；加入唯一 display formatter。
- [x] 重跑 responsive tests 至 PASS。

## 任務 2：Profile 名稱延遲 fallback

**檔案：**
- 修改：`tests/ui-preferences.spec.ts`
- 修改：`tests/settings-personalization.spec.ts`
- 修改：`src/lib/uiPreferences.ts`
- 修改：`src/components/IconProfilesPanel.tsx`
- 必要時修改：`src/components/SettingsModal.tsx`、`src/App.tsx`

- [x] 新增測試：清空名稱後 input 保持空白；輸入「小狗」可直接得到「小狗」；空白儲存才恢復「設定 1」。
- [x] 執行 targeted tests，確認現有 `renameIconProfile → normalizeProfileName` 造成預期 FAIL。
- [x] 分離 draft rename 與 persisted normalization；保存／取消沿用 Settings 現有 transaction boundary。
- [x] 重跑 UI preferences 與 settings tests 至 PASS。

## 任務 3：A 型尺寸步進器與即時預覽

**檔案：**
- 修改：`tests/settings-personalization.spec.ts`
- 修改：`src/components/ScaleControls.tsx`
- 建立：`src/components/AppearancePreview.tsx`
- 修改：`src/components/SettingsModal.tsx`
- 修改：`src/index.css`
- 修改：`src/lib/personalizationStrings.ts`

- [x] 新增測試：−／輸入／＋、min/max disabled、空白輸入期、blur/Enter clamp、預覽 computed style 即時更新。
- [x] 執行 targeted test，確認舊 range-only UI 預期 FAIL。
- [x] 以每列 local input draft 實作步進器；所有 step/min/max 讀 constraint map。
- [x] 建立共用 CSS-variable preview，加入 Appearance tab。
- [x] 在 320px 與最大倍率驗證無橫向溢位，重跑至 PASS。

## 任務 4：練習卡兩組倍率

**檔案：**
- 修改：`tests/ui-preferences.spec.ts`
- 修改：`tests/learning-smoke.spec.ts`
- 修改：`src/lib/uiPreferences.ts`
- 修改：`src/components/LearningView.tsx`
- 修改：`src/index.css`
- 修改：`src/lib/personalizationStrings.ts`

- [x] 新增 `studyPrompt` 90–125% 與 `studyContent` 90–120% 的 schema／hostile normalization 測試。
- [x] 新增 learning DOM test：主詞／答案倍率改變 computed font-size，rating controls 不套新 class。
- [x] 執行 targeted tests，確認 keys/classes 尚不存在而 FAIL。
- [x] 新增 CSS variables 與語意 classes，將 front／definition／example／translation／support fields 接到對應倍率。
- [x] 重跑 UI settings、learning smoke 與 responsive tests 至 PASS。

## 任務 5：雲端同步驗證 HTML

**檔案：**
- 建立：`/home/shuaichi/Projects/03_Production/WordForge_雲端同步驗證指南.html`

- [x] 只查 Google 官方文件，核對 2026-07-21 Console／Drive API／GIS token model／`drive.appdata` 最新流程。
- [x] 撰寫現況、前置資源、現在可驗證步驟、pilot 完成後矩陣、安全與故障排查。
- [x] 加入目錄、步驟核取框、可複製命令、狀態警示與官方來源連結。
- [x] 以 HTML parser／browser 開啟驗證無結構錯誤、無橫向溢位、外部連結存在；不得放 secret 或假的 Client ID。

## 任務 6：文件、完整驗證與 Cleanup

**檔案：**
- 修改：`README.md`
- 修改：`docs/i18n/README-en.md`
- 修改：`CHANGELOG.md`
- 修改：`04_Management/plan/[Running]SRS_Web_App_Mobile_UI_Icon_Profiles-v1.md`

- [x] 更新使用說明、兩個新倍率、999+ 與 profile 名稱保存行為。
- [x] 執行 `git diff --check`。
- [x] 執行 `npm run lint`；如有既存 warning，列出檔案與行號。
- [x] 執行 `npm run build`（含 `tsc -b`）。
- [x] 執行 `npx playwright test --project=chromium --retries=0`。
- [x] 清理 Playwright `test-results/` 與本輪 visual companion temp；保留治理要求的 `.bak-20260721-stat-controls`。
- [x] 更新管理計畫為等待使用者 Windows 人工驗收；不得在未核准前標記 Resolved。

## 最終驗證證據（2026-07-21）

- `git diff --check`：exit 0。
- `npm run lint`：exit 0，0 errors；保留 2 個既存 Hook dependency warnings。
- `npm run build`：`tsc -b`、Vite production build、PWA Service Worker 全部成功。
- `npx playwright test --project=chromium --retries=0`：55/55 PASS（23.8 秒）。
- 瀏覽器檢查：320／390px 設定與預覽、390px 統計與練習畫面無橫向溢位；雲端指南在 320／1440px 均無橫向溢位，核取狀態重整後保留。

## 計畫自檢

- 所有規格需求都有測試或文件驗證步驟。
- 任務依賴順序正確：schema／元件 → 練習卡 → 完整回歸。
- 不需要新 npm dependency、後端、OAuth secret 或資料庫 migration。
- 因現有 feature branch 包含必要且未提交的前置變更，不建立 worktree、不 commit、不 push；此例外避免遺失或混入既有工作。
