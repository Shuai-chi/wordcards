# WordForge 固定設定工具列、雙預覽與雲端指南補強設計

**日期：** 2026-07-22  
**狀態：** 已經使用者核准，等待書面規格複核  
**範圍：** 設定視窗互動與版面、即時預覽、未儲存保護、`WordForge_雲端同步驗證指南.html`；不實作 Google Drive OAuth 或真正雲端供應者。

## 1. 目標

1. 設定標題、全域儲存、關閉圖標與頁籤固定在設定視窗頂端，不隨內容捲動。
2. 儲存成功後設定視窗保持開啟，並讓當下資料成為新的已儲存基準。
3. 使用者透過 X、視窗外側或 Escape 離開時，若有未儲存變更，必須先選擇回到編輯或捨棄變更。
4. 外觀與圖標分頁提供固定、緊湊且與草稿即時連動的雙預覽。
5. 修正基礎文字倍率沒有可辨識預覽、練習卡倍率缺少完整即時預覽的問題。
6. 將八個尺寸控制縮成依容器自適應的 3／2／1 欄網格，同時維持安全倍率與觸控可用性。
7. 把雲端同步驗證指南補成可逐步照做的本機測試與 Google Cloud 前置設定手冊，並提供每個官方入口的直接連結。

## 2. 已確認的產品決策

- 採用 A「固定雙預覽列」。
- 儲存成功後不關閉設定視窗，顯示「已儲存」。
- 外觀分頁顯示網站介面／練習卡預覽；圖標分頁顯示練習模式／統計圖標預覽；一般與備份不顯示預覽。
- 尺寸控制：桌面與平板 3 欄、一般手機 2 欄、320px 或容器不足時 1 欄。
- 頂部儲存一次保存所有分頁草稿；切換分頁不儲存、不關閉、不提示。
- 所有離開入口共用同一套未儲存保護。

## 3. 設定視窗結構

`SettingsModal` 改為三層內部結構：

1. `settings-header`：固定頂部，包含標題、儲存狀態／按鈕、X 與頁籤。
2. `settings-preview-dock`：只在外觀或圖標分頁顯示，固定在 header 下方。
3. `settings-scroll-region`：唯一可捲動區，只放目前頁籤內容。

外層 overlay 不捲動。設定 panel 使用固定的 viewport 上限，並讓 scroll region 以 `min-height: 0` 和 `overflow-y: auto` 取得剩餘空間。header 與 preview dock 不依賴頁面層 `position: fixed`，避免 safe area、手機鍵盤與多 modal 疊層問題。

### 3.1 固定頂部

- 第一列：設定標題、儲存按鈕／狀態、只有圖標的 X。
- 第二列：外觀、圖標、一般與備份三個 ARIA tabs。
- 儲存鈕是全域儲存；沒有變更時停用並顯示已儲存狀態，有變更時顯示儲存。
- 儲存中顯示 busy 狀態並避免重複提交；儲存失敗時不關閉 modal，錯誤置於固定頂部且可被輔助科技讀取。
- X 具可見 focus 狀態與本地化 `aria-label`。

## 4. 草稿、儲存基準與離開保護

### 4.1 單一交易

設定視窗持有完整草稿：

- 每日上限
- 定義顯示偏好
- 外觀主題
- UI 尺寸與圖標 profile metadata
- 圖標 Blob records 與 transform

開啟 modal 時建立 `saved snapshot`。儲存成功後，以實際正規化並成功持久化的資料更新草稿和 snapshot；modal 保持開啟。後續任何修改再與新 snapshot 比較。

### 4.2 Dirty 比較

新增集中式純函式比較，不用容易漏掉 Blob 的 `JSON.stringify`：

- 純資料欄位比較正規化後的值。
- 圖標 records 比較 id、profile、slot、MIME、大小、fit、zoom、offsetX、offsetY，以及 Blob 物件身分。
- records 先依穩定 id 排序，避免無意義的陣列順序差異。
- `updatedAt` 不作為使用者內容差異的唯一判準。

### 4.3 離開入口

以下入口都呼叫 `requestClose()`：

- X
- overlay 外側點擊
- Escape

規則：

- clean：立即回復任何 transient preview reference 並關閉。
- dirty：開啟內層離開確認，不關閉設定。
- 「回到編輯」：關閉確認，保留草稿與預覽。
- 「捨棄變更並離開」：先把 App 層即時預覽還原為最後已儲存狀態，再關閉設定。
- 確認視窗開啟時按 Escape 等同「回到編輯」，不允許鍵盤操作意外捨棄。

離開確認需有 `role="alertdialog"`、焦點限制、初始焦點在「回到編輯」，危險按鈕文字明確為「捨棄變更並離開」。

## 5. 固定雙預覽

### 5.1 外觀分頁

雙預覽並排：

1. **網站介面**：明確包含使用 `--font-scale-base` 的基礎文字示例、頁面標題、練習模式圖標／標題／說明與統計數字。
2. **練習卡**：包含單字或片語主詞、主要答案與次要答案／例句。

每個 UI scale 都必須至少有一個可觀察對象：

| Scale | 預覽對象 |
|---|---|
| `base` | 基礎文字示例 |
| `pageHeading` | 網站介面標題 |
| `cardTitle` | 模式卡主標題 |
| `cardBody` | 模式卡說明／統計標籤 |
| `statNumber` | 統計數字 |
| `icon` | 模式卡與統計圖標 |
| `studyPrompt` | 練習卡主詞／片語 |
| `studyContent` | 定義、例句或翻譯 |

這修正目前 `base` 只影響 body、但預覽子元素全有明確尺寸，因此使用者看不出變化的根因。

### 5.2 圖標分頁

雙預覽改為：

1. 背單字與片語模式卡的目前圖標組。
2. 今日已練習、困難、良好、輕鬆的目前統計圖標組。

預覽使用既有 `CustomIcon` renderer 與 active profile 草稿，因此上傳、移除、fit、縮放、拖曳或切換 profile 時立即更新。各 `IconImageEditor` 仍保留精細裁切／定位預覽；固定 dock 只負責呈現實際卡片使用情境。

### 5.3 高度與方向

- preview dock 高度由內容與 clamp 控制，不用無上限 viewport 百分比。
- 一般直式手機將 header＋dock 控制在合理高度，scroll region 仍保有可操作空間。
- `orientation: landscape` 且高度不足時切換 compact 樣式：縮小 padding／gap，隱藏非必要說明，但保留所有倍率與圖標的可觀察示例。
- 一般與備份分頁不建立空 dock。

## 6. 緊湊尺寸控制

每張 scale control 包含：

- 名稱
- 範圍提示
- 單項重設
- `−／百分比輸入／＋`

沿用集中式 `UI_SCALE_CONSTRAINTS`，不建立第二份 min／max／step。輸入期可暫時空白；blur／Enter 時正規化、clamp 並吸附合法 step。按鈕與輸入維持至少 44px 觸控尺寸。

網格以設定內容容器寬度為主：

- 寬容器：3 欄。
- 一般手機容器：2 欄。
- 320px 或控制元件最低寬度不足：1 欄。

優先使用 container query；若現有瀏覽器目標不適合，使用等價 media query。任何寬度皆需 `min-width: 0`、合理換行、無水平捲動。

## 7. 雲端同步驗證指南

更新 `/home/shuaichi/Projects/03_Production/WordForge_雲端同步驗證指南.html`，保留單檔、離線可讀、核取狀態 localStorage 與列印功能。

### 7.1 先分清可用範圍

首頁必須明確分成：

- 現在可操作：本地備份與還原。
- 現在可執行：provider-neutral 同步核心自動化測試。
- 尚不可操作：Google Drive 登入、上傳、下載與真正跨裝置同步；須等 Stage 4 provider 完成。

### 7.2 同步核心傻瓜式流程

逐步列出：

1. 開啟 WSL2 Ubuntu。
2. `cd /home/shuaichi/Projects/03_Production/SRS_Web_App`。
3. 檢查 `node --version`、`npm --version` 與 dependencies。
4. 缺少依賴或 Chromium 時的安裝指令與何時才需要執行。
5. 執行 `npx playwright test tests/sync.spec.ts --project=chromium --retries=0`。
6. 顯示預期通過數量與輸出範例。
7. 用白話逐條解釋 local-only upload、cloud-only download、雙邊衝突、首次連線分歧、離線後補傳、寫入後斷線收斂、部分下載 rollback。
8. 明確警告：測試使用模擬 provider，不會要求 Google 登入，也不會讀寫 Google Drive。
9. 提供 Chromium 缺失、port 衝突、node_modules 缺失與測試失敗的對應處理。

### 7.3 Google Cloud 直接入口與欄位

每一步旁直接放官方入口：

- Project：<https://console.cloud.google.com/projectcreate>
- Drive API：<https://console.cloud.google.com/apis/library/drive.googleapis.com>
- Auth Overview：<https://console.cloud.google.com/auth/overview>
- Branding：<https://console.cloud.google.com/auth/branding>
- Audience：<https://console.cloud.google.com/auth/audience>
- Data Access：<https://console.cloud.google.com/auth/scopes>
- OAuth Clients：<https://console.cloud.google.com/auth/clients>

指南需逐欄說明：

- Project name、Organization／Location 在個人帳號的處理。
- Drive API 的 Enable 與如何確認 Enabled。
- Branding 的 App name、support email、developer contact；Pilot 可省略與正式發佈才需要的欄位要分清楚。
- Audience 選 External、維持 Testing、加入實際測試 Google 帳號。
- Data Access 只加入 `https://www.googleapis.com/auth/drive.appdata`。
- 建立 Web application client。
- Authorized JavaScript origins 至少加入 `http://localhost` 與 `http://localhost:5173`；部署來源另列 `https://shuai-chi.github.io`。
- 目前採 browser token popup 模型，前置 Pilot 不填假的 redirect URI。
- 前端只使用 Client ID；Client Secret 不得放入前端、HTML、localStorage、repo 或對話內容。

官方說明連結必須與操作步驟相鄰，頁尾另保留來源索引。所有外部連結使用 `target="_blank" rel="noreferrer"`。

## 8. 錯誤處理

- 儲存失敗：保留 modal、草稿與 dirty 狀態，顯示可讀錯誤。
- 對比度不合法：儲存維持停用，固定頂部需能指出原因，不因使用者捲離警告而無法理解。
- 圖標持久化失敗：沿用現有 IndexedDB rollback，不能把失敗內容設為新 snapshot。
- 備份匯入：維持現有二次確認與 reload 行為，因為它是資料庫級替換，不納入一般設定 dirty transaction。
- 未儲存捨棄：確保 App 層 theme／scale／icon preview 都回到最後成功儲存值。

## 9. 驗收測試

### 9.1 自動化

- 儲存後 dialog 仍可見，狀態改為已儲存。
- 儲存後直接關閉不顯示確認；再修改後才顯示。
- X、overlay、Escape 在 dirty 時都開啟 alertdialog。
- 回到編輯保留草稿；捨棄並離開還原 root CSS variables 與圖標 preview。
- dirty comparison 能辨識圖標 Blob 與 transform 變更。
- 捲動到內容底部後，header／tabs／save／X 與 preview dock 的 viewport 位置不變。
- `base`、`studyPrompt`、`studyContent` 更改會造成對應預覽 computed font-size 改變。
- 圖標上傳、transform 與 profile 切換更新固定圖標預覽。
- 控制項網格依容器呈現 3／2／1 欄。
- 320、390、430、768、1024、1440px 與矮橫式無水平溢位、遮蔽或不可達按鈕。
- 雲端指南具有七個直接 Console URL、完整同步測試指令、預期通過數量、故障排查與 Stage 4 警示。

### 9.2 人工驗收

- Windows Chrome／Edge 從 WSL2 localhost 開啟設定，實際捲動三個分頁。
- 確認頂部與預覽固定、輸入框不被手機鍵盤遮蔽、橫式仍能到達所有控制。
- 照雲端指南從全新瀏覽器分頁進入每個 Google Cloud Console 入口，確認步驟名稱與當前介面一致。

## 10. 非目標

- 不實作 Google OAuth、Sign in with Google、Drive provider 或 Apple iCloud。
- 不新增後端服務或 npm dependency。
- 不改 SRS、牌組、統計計算、備份格式或同步核心演算法。
- 不把所有 modal 一併重構；只修改 SettingsModal 所需邊界。

## 11. 變更範圍

預期主要修改：

- `src/components/SettingsModal.tsx`
- `src/components/AppearancePreview.tsx`
- `src/components/ScaleControls.tsx`
- 新增圖標固定預覽與離開確認的小型元件／純函式模組（名稱由實作計畫定義）
- `src/index.css`
- `src/lib/personalizationStrings.ts`
- `src/App.tsx`（儲存成功不關閉、close rollback 介面）
- `tests/settings-personalization.spec.ts` 與必要純函式測試
- `/home/shuaichi/Projects/03_Production/WordForge_雲端同步驗證指南.html`
- README／CHANGELOG／管理計畫證據

不複製多套相似 CSS，不建立第二份 UI scale schema，不變更現有資料儲存位置。
