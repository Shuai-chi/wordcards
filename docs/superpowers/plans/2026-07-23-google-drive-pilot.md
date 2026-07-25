# WordForge Google Drive 純前端 Pilot 實作計畫

> **面向 AI 代理的工作者：** 必需子技能：使用 `executing-plans` 逐任務實作。每個行為遵守 TDD 紅燈—綠燈—重構，並使用本文件的核取方塊追蹤。依共享 dirty worktree 與目前多 Agent 限制，不啟動 subagent。

**目標：** 在不新增後端的前提下，讓使用者以最小權限連結 Google Drive `appDataFolder`，同步 WordForge 的版本化備份快照，並在離線、token 過期及雙裝置分岔時保留資料。

**架構：** 沿用既有 `LocalSyncStore`、`SyncProvider` 與 `synchronize()` 核心。Google Identity Services 僅負責取得記憶體內短效 access token；Drive REST transport 負責 HTTP、重試與錯誤映射；Google Drive provider 以不可變 snapshot DAG 實作 revision 前置條件，避免依賴未明確保證的 last-write-wins 或裝置時間。

**技術棧：** React 19、TypeScript 6、Vite 8、Google Identity Services token model、Google Drive REST API v3、`drive.appdata`、IndexedDB、localStorage、Playwright。

**架構依據：** `/home/shuaichi/Projects/04_Management/decisions/ADR-020-wordforge-cloud-sync.md`

**工作區例外：** `feature/wordforge-local-backup` 含已驗收但尚未提交的前置修改。不得建立分叉 worktree、commit、push、reset 或清理使用者變更；每個任務以 targeted test、`git diff --check` 與狀態檢查點取代 commit。

---

## 1. 檔案與責任

### 建立

- `.env.example`：公開的 Vite 設定鍵範例，不含真實 ID 或秘密。
- `.env.local`：只放使用者提供的公開 Web Client ID；由 `.gitignore` 排除。
- `src/lib/browserSyncStore.ts`：將現有本機備份 API 接到 `LocalSyncStore`，同步 metadata 單獨存入 localStorage。
- `src/lib/googleIdentity.ts`：GIS script loader、token client、scope 與過期管理；token 僅存在物件記憶體。
- `src/lib/googleDriveTransport.ts`：Drive `appDataFolder` REST/CORS adapter、multipart JSON upload、下載、永久刪除、重試與錯誤分類。
- `src/lib/googleDriveSyncProvider.ts`：不可變 snapshot DAG、operation idempotency、分岔偵測、conflict copy 與 current/previous 保留。
- `src/lib/cloudSyncController.ts`：連結、立即同步、debounce、online/foreground 重試、斷開與刪除雲端資料的狀態機。
- `src/lib/cloudSyncStrings.ts`：八語雲端同步 UI 字串。
- `src/components/CloudSyncPanel.tsx`：設定頁的連結狀態、最後同步、立即同步、重新連結、斷開與永久刪除控制。
- `tests/browser-sync-store.spec.ts`：metadata 正規化、超界資料回退、本機 snapshot replace rollback 接縫。
- `tests/google-identity.spec.ts`：scope、token 過期、popup error、並行連結與記憶體保存。
- `tests/google-drive-transport.spec.ts`：REST URL/header/body、401/403/429/5xx、指數退避與永久刪除。
- `tests/google-drive-provider.spec.ts`：首次上傳、單 head、冪等重試、expected revision、雙 head 分岔、conflict copy、祖先清理。
- `tests/cloud-sync-controller.spec.ts`：狀態轉換、debounce、offline、重新授權、斷開與刪除。
- `tests/cloud-sync-ui.spec.ts`：設定頁可用性與整合流程。

### 修改

- `.gitignore`：排除 `.env`／`.env.*`，只允許 `.env.example`。
- `src/lib/sync.ts`：新增可辨識的遠端分岔錯誤，讓既有同步核心回傳 `conflict` 而非覆蓋。
- `src/App.tsx`：建立 controller、傳入設定頁，並在設定、牌組、語言、主題與學習寫入成功後排程同步。
- `src/components/Dashboard.tsx`：牌組選取、批次刪除與每日上限異動成功後通知本機資料已變更。
- `src/components/SettingsModal.tsx`：在「一般與備份」加入 `CloudSyncPanel`；雲端操作不影響現有設定 dirty/save transaction。
- `src/components/LearningView.tsx`：評分 transaction 成功後通知本機資料已變更。
- `src/index.css`：雲端狀態卡與危險操作的既有設計語言樣式。
- `README.md`、`docs/i18n/README-en.md`、`CHANGELOG.md`：opt-in 資料流、限制、斷開／刪除差異與 pilot 說明。
- `/home/shuaichi/Projects/03_Production/WordForge_雲端同步驗證指南.html`：更新為實際 UI、Google Cloud 設定、兩 profile、離線、衝突與撤銷驗收步驟。
- `/home/shuaichi/Projects/04_Management/plan/[Running]SRS_Web_App_Account_Cloud_Sync_Feasibility-v1.md`：Stage 4 進度、驗證證據與真實 OAuth 驗收狀態。

---

## 任務 0：保護現況與建立基準

**檔案：**
- 備份：本計畫會修改的既有檔案，suffix `.bak-20260723-google-drive-pilot`
- 檢查：branch、dirty 狀態、Running plan、現有同步與備份測試

- [x] **步驟 1：確認工作樹與計畫所有權**

執行：

```bash
cd /home/shuaichi/Projects/03_Production/SRS_Web_App
git status --short --branch
find /home/shuaichi/Projects/04_Management/plan -maxdepth 1 -type f -name '[[]Running[]]*.md' -printf '%f\n'
```

預期：branch 是 `feature/wordforge-local-backup`；雲端計畫由 Codex 執行；沒有其他計畫宣告同時修改本 App 檔案。

- [x] **步驟 2：建立精確備份**

逐一以 `cp -a` 備份 `.gitignore`、`src/lib/sync.ts`、`src/App.tsx`、`src/components/SettingsModal.tsx`、`src/components/LearningView.tsx`、`src/index.css`、`README.md`、`docs/i18n/README-en.md`、`CHANGELOG.md`、雲端驗證 HTML 與 Running plan。

預期：所有來源檔與備份都存在；不覆蓋 2026-07-19～2026-07-22 的既有備份。

- [x] **步驟 3：跑既有核心基準**

執行：

```bash
npx playwright test tests/backup.spec.ts tests/sync.spec.ts tests/settings-personalization.spec.ts --project=chromium --retries=0
```

預期：現有備份、同步與設定測試全部通過。若失敗，先依 INCIDENT_LOG 與 `systematic-debugging` 處理，不得開始新功能。

---

## 任務 1：本機同步 store 與公開設定邊界

**檔案：**
- 建立：`.env.example`
- 建立：`.env.local`
- 建立：`src/lib/browserSyncStore.ts`
- 建立：`tests/browser-sync-store.spec.ts`
- 修改：`.gitignore`

- [x] **步驟 1：寫 browser store 紅燈測試**

測試固定 API：

```ts
export const SYNC_METADATA_STORAGE_KEY = 'wordforge_sync_metadata_v1';

export function createBrowserSyncStore(
  storage: Storage,
  adapter?: {
    readSnapshot: () => Promise<BackupEnvelopeV1>;
    replaceSnapshot: (snapshot: BackupEnvelopeV1) => Promise<void>;
  },
): LocalSyncStore;
```

測試證明：缺失或無效 metadata 回傳 `null`；合法 schema round-trip；`replaceSnapshot` 先經 `validateBackupText()`；同步 metadata 不出現在 `prepareLocalBackup()` 的 payload。

- [x] **步驟 2：執行測試確認正確失敗**

執行：

```bash
npx playwright test tests/browser-sync-store.spec.ts --project=chromium --retries=0
```

預期：FAIL，原因為 `src/lib/browserSyncStore.ts` 不存在。

- [x] **步驟 3：實作最小 browser store**

預設 adapter：

```ts
{
  readSnapshot: async () => (await prepareLocalBackup(storage)).envelope,
  replaceSnapshot: async snapshot => {
    await validateBackupText(JSON.stringify(snapshot));
    await importLocalBackup(JSON.stringify(snapshot), storage);
  },
}
```

`readMetadata()` 僅接受 `schemaVersion === 1` 且 `baseRevision`、`basePayloadHash` 為非空字串；其餘回傳 `null`。`writeMetadata()` 只寫 schema 的三個欄位。

- [x] **步驟 4：建立公開設定防線**

`.gitignore` 加入：

```gitignore
.env
.env.*
!.env.example
```

`.env.example` 內容固定為：

```dotenv
VITE_GOOGLE_CLIENT_ID=
```

`.env.local` 只寫公開 Web Client ID；不得寫入 client secret、refresh token 或 access token。

- [x] **步驟 5：重跑測試與 secret 邊界檢查**

執行：

```bash
npx playwright test tests/browser-sync-store.spec.ts --project=chromium --retries=0
git check-ignore .env.local
git diff --check -- .gitignore .env.example src/lib/browserSyncStore.ts tests/browser-sync-store.spec.ts
```

預期：測試 PASS；`.env.local` 被忽略；diff 無 whitespace error。

---

## 任務 2：Google Identity Services 記憶體 token client

**檔案：**
- 建立：`src/lib/googleIdentity.ts`
- 建立：`tests/google-identity.spec.ts`

- [x] **步驟 1：寫 token client 紅燈測試**

公開介面固定為：

```ts
export const GOOGLE_DRIVE_APPDATA_SCOPE =
  'https://www.googleapis.com/auth/drive.appdata';

export interface GoogleAccessToken {
  value: string;
  expiresAt: number;
  scope: string;
}

export class GoogleIdentityClient {
  connect(): Promise<GoogleAccessToken>;
  getValidAccessToken(): string;
  hasValidAccessToken(): boolean;
  disconnect(): void;
}
```

以注入的 `loadScript`、`now` 與 fake `google.accounts.oauth2` 測試：`requestAccessToken()` 必須由 `connect()` 呼叫；缺 scope 拒絕；到期前 60 秒視為失效；popup 關閉映射為 `GooglePopupError`；同時兩次 connect 共用同一 Promise；disconnect 後 token 不可取得。

- [x] **步驟 2：執行測試確認正確失敗**

執行：

```bash
npx playwright test tests/google-identity.spec.ts --project=chromium --retries=0
```

預期：FAIL，原因為 `src/lib/googleIdentity.ts` 不存在。

- [x] **步驟 3：實作 script loader 與 token lifecycle**

script URL 固定為 `https://accounts.google.com/gsi/client`。loader 以 module-level Promise 保證只插入一次 `<script async defer>`；callback 僅保存 `access_token`、`expiresAt` 與 `scope` 到 class private field，不讀寫任何 Storage、cookie 或 IndexedDB。

- [x] **步驟 4：重跑 identity 測試**

執行：

```bash
npx playwright test tests/google-identity.spec.ts --project=chromium --retries=0
git diff --check -- src/lib/googleIdentity.ts tests/google-identity.spec.ts
```

預期：所有 token、scope、popup 與過期測試 PASS。

---

## 任務 3：Drive REST transport

**檔案：**
- 建立：`src/lib/googleDriveTransport.ts`
- 建立：`tests/google-drive-transport.spec.ts`

- [x] **步驟 1：寫 HTTP contract 紅燈測試**

公開介面固定為：

```ts
export interface DriveAppDataFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  size: number;
  appProperties: Record<string, string>;
}

export interface DriveAppDataTransport {
  listFiles(): Promise<DriveAppDataFile[]>;
  downloadText(fileId: string): Promise<string>;
  createJsonFile(input: {
    name: string;
    appProperties: Record<string, string>;
    text: string;
  }): Promise<DriveAppDataFile>;
  deleteFile(fileId: string): Promise<void>;
}
```

測試斷言：

- list 使用 `/drive/v3/files`、`spaces=appDataFolder`、`trashed=false` 與精確 fields。
- download 使用 `alt=media`。
- create 使用 `/upload/drive/v3/files?uploadType=multipart`，metadata 含 `parents:["appDataFolder"]`、`mimeType:"application/json"`。
- 所有 request 使用 `Authorization: Bearer <memory token>`，不得把 token 放 query/body。
- network、429、500、502、503、504 最多三次指數退避；401 丟 `GoogleAuthorizationRequiredError`；非 quota 的 403 丟 `GoogleDrivePermissionError`；DELETE 成功接受 204。

- [x] **步驟 2：執行測試確認正確失敗**

執行：

```bash
npx playwright test tests/google-drive-transport.spec.ts --project=chromium --retries=0
```

預期：FAIL，原因為 transport module 不存在。

- [x] **步驟 3：實作最小 REST adapter**

`GoogleDriveTransport` constructor 注入：

```ts
{
  getAccessToken: () => string;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
}
```

退避基準為 250、500、1000ms 加 0～100ms jitter；只有明確 rate limit 的 403 才重試。response body 的 OAuth token 與完整備份內容不得寫入 error message 或 console。

- [x] **步驟 4：重跑 transport 測試**

執行：

```bash
npx playwright test tests/google-drive-transport.spec.ts --project=chromium --retries=0
git diff --check -- src/lib/googleDriveTransport.ts tests/google-drive-transport.spec.ts
```

預期：URL、headers、multipart、錯誤與重試測試全部 PASS。

---

## 任務 4：不可變 snapshot DAG provider

**檔案：**
- 建立：`src/lib/googleDriveSyncProvider.ts`
- 建立：`tests/google-drive-provider.spec.ts`
- 修改：`src/lib/sync.ts`

- [x] **步驟 1：寫 DAG 與分岔紅燈測試**

Drive snapshot document 固定為：

```ts
interface DriveSnapshotDocumentV1 {
  schemaVersion: 1;
  kind: 'snapshot';
  revision: string;
  parentRevision: string | null;
  operationId: string;
  envelope: BackupEnvelopeV1;
}
```

appProperties 固定鍵：`wordforgeKind=snapshot`、`wordforgeRevision`、`wordforgeParent`、`wordforgeOperation`。revision 由 `operationId + payloadHash` 的 SHA-256 前 24 hex 產生。

測試涵蓋：

- 空雲端建立 root。
- 單 head 建立 child，`parentRevision` 等於 expected revision。
- 相同 operation 重試回傳既有 revision，不重複建立。
- expected revision 不符丟 `SyncPreconditionError`。
- 兩個 child 指向同一 parent 時丟 `SyncRemoteDivergenceError`，兩個檔都保留。
- 一般成功後只保留 current 與 previous 兩個 snapshot。
- `saveConflictCopy()` 以 operationId 冪等建立完整 local/remote conflict 文件。
- 壞 schema、hash 不符、重複 revision 內容不一致全部 fail-closed。

- [x] **步驟 2：執行測試確認正確失敗**

執行：

```bash
npx playwright test tests/google-drive-provider.spec.ts --project=chromium --retries=0
```

預期：FAIL，原因為 provider 與 divergence error 尚不存在。

- [x] **步驟 3：擴充同步核心的安全錯誤**

在 `src/lib/sync.ts` 新增：

```ts
export class SyncRemoteDivergenceError extends Error {
  constructor(readonly conflictId: string) {
    super('sync_remote_divergence');
  }
}
```

`synchronize()` catch 此錯誤時回傳 `{ status: 'conflict', conflictId }`；其他錯誤行為不變。

- [x] **步驟 4：實作 DAG provider**

`GoogleDriveSyncProvider` 僅依 revision graph 找 head，不比較 `modifiedTime`。若 head 數量大於一，使用排序後 head revisions 的穩定 hash 產生 conflictId 並停止讀寫。建立 child 後重新讀 graph；若並行寫入形成雙 head，回報 conflict 且不刪任何 head。

cleanup 只在 post-write graph 確認單 head 後執行，僅刪除 current 的 parent 以前的 snapshot；所有 `kind=conflict` 檔不自動刪除。

- [x] **步驟 5：重跑 provider 與既有 sync matrix**

執行：

```bash
npx playwright test tests/google-drive-provider.spec.ts tests/sync.spec.ts --project=chromium --retries=0
git diff --check -- src/lib/sync.ts src/lib/googleDriveSyncProvider.ts tests/google-drive-provider.spec.ts
```

預期：新增 provider 測試與既有 7 個 provider-neutral 情境全部 PASS。

---

## 任務 5：Controller、設定 UI 與自動觸發

**檔案：**
- 建立：`src/lib/cloudSyncController.ts`
- 建立：`src/lib/cloudSyncStrings.ts`
- 建立：`src/components/CloudSyncPanel.tsx`
- 建立：`tests/cloud-sync-controller.spec.ts`
- 建立：`tests/cloud-sync-ui.spec.ts`
- 修改：`src/App.tsx`
- 修改：`src/components/Dashboard.tsx`
- 修改：`src/components/SettingsModal.tsx`
- 修改：`src/components/LearningView.tsx`
- 修改：`src/index.css`

- [x] **步驟 1：寫 controller 狀態紅燈測試**

狀態固定為：

```ts
type CloudSyncStatus =
  | 'unconfigured'
  | 'disconnected'
  | 'connecting'
  | 'ready'
  | 'syncing'
  | 'offline'
  | 'reauthorize'
  | 'conflict'
  | 'error';
```

測試：空 Client ID 為 unconfigured；connect 成功後立刻 sync；401 轉 reauthorize；provider offline 轉 offline 且本機資料不變；conflict 保留 conflictId；`notifyLocalChange()` 在 1500ms debounce 內合併；disconnect 只清 token/計時器；`deleteCloudData()` 刪除 WordForge appData 檔後保留本機資料與 metadata reset。

- [x] **步驟 2：執行 controller 測試確認正確失敗**

執行：

```bash
npx playwright test tests/cloud-sync-controller.spec.ts --project=chromium --retries=0
```

預期：FAIL，原因為 controller module 不存在。

- [x] **步驟 3：實作 controller 與 browser events**

controller 對外方法：

```ts
connect(): Promise<void>;
syncNow(): Promise<void>;
notifyLocalChange(): void;
handleOnline(): void;
handleForeground(): void;
disconnect(): void;
deleteCloudData(): Promise<void>;
subscribe(listener: (state: CloudSyncState) => void): () => void;
```

只有有效 token 時，`online`、`visibilityState === 'visible'` 與 local change debounce 會自動 sync。同步進行中收到新變更只設 pending flag，結束後再跑一次，不允許平行同步。

- [x] **步驟 4：寫 UI 紅燈測試**

Playwright 測試以注入 fake controller 驗證：

- 「一般與備份」顯示 Google Drive 區塊。
- 未設定 client ID 時顯示建置設定缺失，不載入 GIS。
- connect、sync now、reconnect、disconnect 都有文字標籤與 busy/disabled 狀態。
- conflict 狀態明示沒有自動覆蓋，並保留手動匯出按鈕。
- 永久刪除需要第二次確認；disconnect 不出現刪除語意。
- 320px～1440px 無水平 overflow，鍵盤 focus 可見。

- [x] **步驟 5：執行 UI 測試確認正確失敗**

執行：

```bash
npx playwright test tests/cloud-sync-ui.spec.ts --project=chromium --retries=0
```

預期：FAIL，原因為 `CloudSyncPanel` 或設定頁 cloud section 不存在。

- [x] **步驟 6：實作 UI 與 App 接縫**

`CloudSyncPanel` 接收 state/actions，不直接 import Google API。`App.tsx` 持有 controller 生命週期，設定視窗關閉不會清 token；remote download 成功後 reload 以重新載入 IndexedDB、語言、主題與 icon object URLs。

以下 transaction 成功後呼叫 `notifyLocalChange()`：

- 主題切換、介面語言切換、設定 save。
- CSV 匯入、單一／批次刪除、套牌編輯。
- 牌組選取、全選／反選與批次每日上限。
- `LearningView` 的 `DB.commitReview()`。

- [x] **步驟 7：重跑 controller、UI 與既有設定／學習回歸**

執行：

```bash
npx playwright test tests/cloud-sync-controller.spec.ts tests/cloud-sync-ui.spec.ts tests/settings-personalization.spec.ts tests/learning-smoke.spec.ts --project=chromium --retries=0
git diff --check -- src/App.tsx src/components/SettingsModal.tsx src/components/LearningView.tsx src/components/CloudSyncPanel.tsx src/lib/cloudSyncController.ts src/lib/cloudSyncStrings.ts src/index.css
```

預期：新狀態／UI 測試與既有設定、學習流程全部 PASS。

- [x] **步驟 8：補齊首次連結的明確衝突選擇**

文件交接檢查發現：第二個乾淨 Profile 仍含預設設定，因此會正確進入首次連結衝突；若只有匯出逃生按鈕，跨裝置下載驗收無法繼續。以新增紅燈測試補上：

- `resolveSyncConflict(..., 'remote')` 只有在使用者明確選擇後才下載，並沿用 rollback。
- `resolveSyncConflict(..., 'local')` 只有在使用者明確選擇後才建立新雲端 child。
- controller 僅對 `local-remote` 衝突顯示／執行兩種選擇；遠端多 head 分岔維持停止寫入與人工保全。
- 設定 UI 新增「採用雲端資料／以這台裝置為準」八語按鈕；衝突快照不因選擇而自動刪除。

驗證：

```bash
npx playwright test tests/sync.spec.ts tests/cloud-sync-controller.spec.ts tests/cloud-sync-ui.spec.ts --project=chromium --retries=0
```

結果：`24 passed`，涵蓋兩種明確選擇、遠端多 head 不提供破壞性解法與 320px 無水平溢位。

---

## 任務 6：隱私文件、操作指南與安全掃描

**檔案：**
- 修改：`README.md`
- 修改：`docs/i18n/README-en.md`
- 修改：`CHANGELOG.md`
- 修改：`/home/shuaichi/Projects/03_Production/WordForge_雲端同步驗證指南.html`
- 修改：`/home/shuaichi/Projects/04_Management/plan/[Running]SRS_Web_App_Account_Cloud_Sync_Feasibility-v1.md`

- [x] **步驟 1：更新雙語資料流揭露**

文件必須明列：

- 功能完全 opt-in，資料上傳至使用者自己的 Google Drive `appDataFolder`。
- 同步內容含設定、套牌、卡片原文、SRS 進度、報表及自訂圖標。
- access token 只在當前頁面記憶體；沒有 client secret、refresh token 或 WordForge 帳號後端。
- token 過期需重新連結；斷開不刪雲端資料；永久刪除不刪本機資料。
- Apple/CloudKit 與真正背景同步後端不在此 pilot。

- [x] **步驟 2：更新傻瓜式真實驗收 HTML**

HTML 依序提供：

1. 撤銷先前暴露的 client secret。
2. 啟用 Drive API、設定 OAuth consent/test user、加入 exact Authorized JavaScript origins。
3. 建立 `.env.local`、重啟 Vite。
4. 使用 Windows 可開啟且已登錄的 `http://localhost:5173`，或 GitHub Pages HTTPS origin；WSL IP 的純 HTTP origin 不作 Google OAuth 驗收。
5. Profile A 首次連結／上傳，Profile B 下載，離線修改、online sync、雙邊修改衝突。
6. token 過期／撤銷、popup 被擋、offline、401/403/429 的畫面判讀。
7. disconnect、永久刪除、Google 帳戶授權撤銷與測試資料 cleanup。

- [x] **步驟 3：執行秘密掃描**

執行：

```bash
rg -n --hidden --glob '!node_modules/**' --glob '!dist/**' --glob '!.env.local' \
  'GOCSPX-|\"client_secret\"[[:space:]]*:|ya29\\.|BEGIN (RSA |EC )?PRIVATE KEY'
```

預期：production source、文件、測試與 tracked config 沒有實際秘密格式。一般安全說明中的 `client secret`／`refresh token` 字樣及測試固定字串 `test-access-token` 不屬於秘密，不應用過寬規則誤報。

- [x] **步驟 4：更新 Running plan 證據**

Stage 4 只勾選已由程式測試證明的項目；真實 Google OAuth、兩 profile 與 exact scope 仍須保留未勾選，直到使用者在合法 origin 完成驗收。

---

## 任務 7：完整自動化與真實瀏覽器交接

**檔案：**
- 檢查：所有本計畫檔案與 build artifact

- [x] **步驟 1：執行完整 Playwright**

執行：

```bash
npx playwright test --project=chromium --retries=0
```

結果：修正 lint 後重新執行，`134 passed (40.1s)`，0 failed。

- [x] **步驟 2：執行 lint 與 production build**

執行：

```bash
npm run lint
npm run build
```

結果：lint 0 errors；保留任務前既有的 2 個 Hook dependency warnings。build exit 0；TypeScript、Vite 8 production build 與 PWA service worker 均成功。

- [x] **步驟 3：掃描 build artifact**

執行：

```bash
rg -n 'GOCSPX-|client_secret|refresh_token|BEGIN PRIVATE KEY' dist
```

結果：實際秘密格式 0 matches。公開 Client ID 出現在 bundle 屬預期；任何 client secret、refresh token 或私鑰 match 都視為失敗。

- [x] **步驟 4：執行 diff 與範圍檢查**

執行：

```bash
git diff --check
git status --short
```

預期：無 whitespace error；只新增／修改本計畫列出的檔案與任務前既有 dirty 內容。

- [x] **步驟 5：啟動可供 Windows 驗收的伺服器**

執行：

```bash
npm run dev -- --host 0.0.0.0
```

Google OAuth 驗收必須使用 Google Cloud 已登錄的 exact origin。若 Windows `localhost` 轉送仍失效，改以已部署的 GitHub Pages HTTPS origin 驗收；`http://<WSL-IP>:5173` 可看 UI，但不作正式 OAuth 判定。

2026-07-23 檢查：既有 Vite process 正在專案根以 `--host 0.0.0.0` 監聽 5173；HTTP 回應成功，轉譯後的 App module 已載入 `.env.local` 公開 Client ID。WSL IP UI 位址為 `http://172.17.150.67:5173`；Windows localhost OAuth 仍需使用者依 HTML 的系統管理員 PowerShell portproxy 步驟處理。

- [ ] **步驟 6：等待使用者真實 Google 驗收**

使用者依 HTML 完成兩 profile、離線、衝突、重新授權、disconnect 與永久刪除。驗收前不得宣稱 Stage 4 完成，也不得把 Running plan 移入 `resolved/`。

---

## 自檢結果

- 規格覆蓋：OAuth 最小權限、token 記憶體、Drive appData、完整資料範圍、current/previous/conflict、離線、重新授權、兩 profile、刪除與文件均有對應任務。
- 安全邊界：前端只使用公開 Client ID；秘密與長效 token 均禁止進入 source、Storage 與 build artifact。
- 型別一致：`GoogleIdentityClient` 提供 token；`GoogleDriveTransport` 只處理 REST；`GoogleDriveSyncProvider` 實作既有 `SyncProvider`；controller 組合 provider 與 `LocalSyncStore`；UI 僅接 state/actions。
- 衝突安全：revision graph 以 parent edge 判斷 head；雙 head 停止同步並保留兩個不可變 snapshot，不使用 `modifiedTime` 或不明確的 `If-Match` 保證。
- 執行方式：依使用者已核准 Stage 4、共享 dirty worktree 與禁止 subagent 的現況，採目前會話內聯執行。
