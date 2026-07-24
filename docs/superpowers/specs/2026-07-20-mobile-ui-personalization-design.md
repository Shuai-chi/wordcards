# WordForge 行動版 UI 與圖標設定設計

日期：2026-07-20  
狀態：使用者已核准  
實作者：Codex

## 1. 目標

在不改動牌組選取、學習佇列、SRS 計算與報表統計的前提下，改善 WordForge 在手機直式／橫式、平板及桌面的練習入口與統計卡，並擴充現有設定 modal：

- 練習模式卡的圖標與主標題水平並列，主標題成為主要視覺資訊。
- 統計卡固定為左側圖標＋中文標籤、右側單一放大數字。
- 外觀頁籤提供受限制的字體與圖標倍率，即時預覽並可重設。
- 圖標頁籤提供三個可重新命名的使用者圖片設定檔；每組可保存六個圖標。
- 自訂圖片可在方形框內選擇完整適應／填滿、拖曳定位及縮放，且不變形。
- 設定與圖片重新整理後仍保留，並納入本地備份。

## 2. 非目標

- 不重寫 Home、Dashboard 或 SettingsModal 的資料邏輯。
- 不更換 Lucide、色彩 token、圓角或整體主題。
- 不新增後端、帳號或 Google Drive 實際串接。
- 不依 User-Agent 分別維護 iOS、Android、Windows CSS。
- 不接受任意 CSS 數值或無限制縮放。
- 第一版不接受 SVG 上傳，避免可執行內容與外部資源風險。

## 3. 現況與變更邊界

- `Home.tsx` 已包含兩個模式與 Lucide fallback icon，只調整其 markup、class 與接收自訂圖標的 props。
- `Dashboard.tsx` 已計算四項統計，只替換統計卡 presentation，不修改 `cTotal/cHard/cGood/cEasy` 來源。
- `SettingsModal.tsx` 已有主題即時預覽、儲存／取消與本地備份；將既有 section 分到頁籤並加入字體與圖標編輯器。
- `App.tsx` 延續目前的單一狀態擁有者模式，載入／預覽／保存 UI 偏好並把目前圖標傳給 Home、Dashboard。
- `theme.ts` 仍只負責色彩；新建 `uiPreferences.ts` 管理尺寸倍率，避免把不同責任塞入主題模組。
- `db.ts` 的 `SRS_DB` 由 version 1 升到 version 2，只新增 `iconAssets` store，不搬移或重寫 `decks/cards/reports`。

## 4. 集中式設定 schema

`wordforge_ui_preferences_v1` 存在 `localStorage`：

```ts
type UiScaleKey =
  | 'base'
  | 'pageHeading'
  | 'cardTitle'
  | 'cardBody'
  | 'statNumber'
  | 'icon';

interface UiPreferencesV1 {
  schemaVersion: 1;
  scales: Record<UiScaleKey, number>;
  iconProfiles: [
    { id: 'profile-1'; name: string },
    { id: 'profile-2'; name: string },
    { id: 'profile-3'; name: string },
  ];
  activeIconProfileId: 'profile-1' | 'profile-2' | 'profile-3';
  updatedAt: string;
}
```

單一 constraint map 同時供 normalize、滑桿與測試使用：

| 設定 | min | max | step | default |
|:---|---:|---:|---:|---:|
| 基礎文字 | 0.90 | 1.15 | 0.05 | 1 |
| 頁面主標題 | 0.90 | 1.25 | 0.05 | 1 |
| 卡片主標題 | 0.90 | 1.25 | 0.05 | 1 |
| 卡片說明 | 0.90 | 1.15 | 0.05 | 1 |
| 統計數字 | 0.90 | 1.30 | 0.05 | 1 |
| 卡片圖標 | 0.80 | 1.25 | 0.05 | 1 |

讀取時對每個數值執行 finite check、步距正規化與 min/max clamp；缺失、非法 schema、`NaN`、Infinity 或錯誤 profile ID 回復安全預設。應用時寫入：

- `--font-scale-base`
- `--font-scale-heading`
- `--font-scale-card-title`
- `--font-scale-card-body`
- `--font-scale-stat-number`
- `--icon-scale`

元件的基準尺寸先用 `clamp()` 計算，再以 `calc(... * var(--font-scale-*)))` 套用倍率。

## 5. 三組圖標設定與圖片框編輯

六個固定 slot：`vocab`、`phrase`、`practiced`、`hard`、`good`、`easy`。三個 profile 永遠存在，可改名但不可新增第四組；名稱 trim 後限制 1–24 個 Unicode 字元，空值回復「設定 1／2／3」。

圖片與框內 transform 存在 IndexedDB `iconAssets`：

```ts
interface IconAssetRecord {
  id: `${IconProfileId}:${IconSlot}`;
  profileId: IconProfileId;
  slot: IconSlot;
  blob: Blob;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  fileName: string;
  fit: 'contain' | 'cover';
  zoom: number;       // 0.5–3，step 0.05
  offsetX: number;    // -50–50，百分比
  offsetY: number;    // -50–50，百分比
  updatedAt: string;
}
```

上傳檢查：

- 僅 PNG、JPEG、WebP。
- 單檔最多 512 KiB；18 張理論上限 9 MiB。
- 同時檢查 MIME、檔頭 signature 與瀏覽器解碼。
- 寬高必須為 16–4096 px，總像素不得超過 16,777,216。
- 檢查未通過時不覆蓋既有圖片並顯示可辨識錯誤。

編輯器使用正方形、`overflow: hidden` 的實際 icon 容器預覽：

- 初次上傳為 `contain / zoom 1 / offset 0,0`，完整顯示且不變形。
- 「完整適應」切換到 contain；「填滿」切換到 cover；「重設」還原 contain 與置中。
- zoom slider 為 50%–300%。滑鼠、觸控與觸控筆使用 Pointer Events 拖曳，位移限制在 -50%–50%。
- Home 與 Dashboard 共用 `CustomIcon` renderer，確保預覽與正式畫面使用同一 transform。
- 個別移除只刪除目前 profile 的該 slot，立即回到原本 Lucide icon。
- modal 內變更即時預覽；只有按「儲存」才以單一 IndexedDB transaction 寫入變更。取消會撤銷 draft 並釋放 object URL。

## 6. 元件版型

### 6.1 練習模式卡

每張 `mode-card` 是同一份元件版型：

- 使用 grid rows `minmax(..., 2fr) auto` 表示主要區約 2/3、輔助區約 1/3，不設 viewport 百分比高度。
- 主要區水平排列圖標容器與主標題，兩者垂直置中。
- 輔助區顯示原說明與牌組數量。
- 手機單欄；容器足夠寬時雙欄。
- 保留 hover 上浮、active 壓下與清楚 focus ring。

### 6.2 統計卡

- `stat-card` 使用 `grid-template-columns: minmax(0,55fr) minmax(0,45fr)`。
- 左欄為小圖標＋中文標籤；右欄只有數字。
- 移除「張卡片／Hard／Good／Easy」。
- 四張卡使用相同 min-height、padding 與欄比例；四種數字保留現有 token 色。
- 320px 仍先維持 2×2，透過較小 gap/padding、允許標籤合理換行及 `min-width: 0` 防溢位；只有低於 300px 才降單欄。

## 7. 設定頁籤與可用性

`SettingsModal` 使用三個 ARIA tabs：

1. 外觀：主題、色盤、六個倍率控制、單項與全部重設。
2. 圖標：三個可命名 profile、六個 slot、上傳／預覽／編輯／移除。
3. 一般與備份：每日上限、定義語言與現有匯出／匯入。

頁籤支援點擊、Tab 聚焦、左右方向鍵切換；手機採三等分 grid，不產生橫向捲動。所有 file input 都有可見 label。

## 8. 響應式與直橫向

主要判斷是元件可用寬度，不是平台名稱：

- Home 外層使用 container；支援時以 container query 決定兩欄，media query 作 fallback。
- 320／390／430px：模式卡單欄、統計 2×2。
- 768px：依容器是否達雙欄 threshold 決定模式卡排列。
- 1024／1440px：內容維持既有 `max-w-4xl`／`max-w-3xl` 並置中，尺寸到 clamp 上限停止。
- 橫式且高度小於 600px：減少主內容上下 padding、取消 Home 的強制垂直置中、縮小非必要 gap；不變更使用者倍率。
- 根容器使用 `100dvh`，header／modal 加上 `env(safe-area-inset-*)`；適用 iOS 瀏海、Android system bars、PWA standalone 與桌面。
- 不鎖 orientation；螢幕旋轉後純 CSS reflow，既有 React／資料狀態不重建。

## 9. 備份相容性

備份 schema 升為 v2，增加 normalized UI preferences 與 icon assets（blob 轉 base64，含 MIME、transform 與 profile/slot）。匯入 v1 時補入預設 UI preferences 與空圖標；匯入 v2 時先驗 schema、hash、數量、每張大小、MIME 與 profile/slot 唯一性，再套用。資料庫與 localStorage 套用失敗時一起 rollback。

此變更遵循 ADR-020「可恢復 UI 偏好納入供應商中立快照」；不啟動 Google OAuth。

## 10. 驗證

- 純函式測試：倍率 clamp、非法 schema、profile 名稱與 transform clamp。
- IndexedDB 測試：三組資產保存、切換、刪除、重新整理還原。
- 上傳負面測試：錯誤 MIME、錯誤 signature、超過 512 KiB、解碼失敗、超大像素。
- UI 測試：即時預覽、取消回滾、儲存持久化、單項／全部重設、三組重新命名與切換。
- 備份測試：v1 migration、v2 round-trip、圖片 hash/rollback。
- 版面測試：320、390、430、768、1024、1440px；390×844/844×390 與 430×932/932×430；最大與最小倍率都檢查 `scrollWidth <= clientWidth`、卡片不重疊、重要標題可見。
- 回歸：原本模式選擇、牌組選取、開始練習與統計資料不變。

