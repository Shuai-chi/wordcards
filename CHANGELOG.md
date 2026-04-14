# Changelog

所有重要變更皆記錄於此文件。本專案遵循 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)。

## [v25.3.0] - 2026-04-14

### Added
- **PWA 支援**: 實作 Progressive Web App 功能，支援安裝至行動裝置/桌面，並提供完全離線的背單字體驗。
- **App 圖標**: 新增高品質 PWA 專用圖標（192px, 512px, Apple Touch Icon）。
- **離線快取**: 新增 Service Worker 處理核心套件快取與導覽回退機制。

---

## [v25.2.0] - 2026-04-14

### Added
- **套牌進度追蹤**: 在每個套牌卡片中新增「已抽卡/總卡片」計數與漸層動畫進度條，進度條顏色隨完成度自動變化（紫→藍→綠）。

---

## [v25.1.0] - 2026-04-14

### Added
- **錯誤診斷機制**: 在 `csv.ts` 中實作逐行診斷訊息，解析失敗時報告具體行號與違規原因（長度、缺欄、空值）。
- **儲存層監控**: 強化 `App.tsx` 與 `db.ts` 的 IndexedDB 錯誤處理，將 DOM `Event` 物件解包為可讀的錯誤訊息（如儲存空間不足、無痕模式封鎖）。

### Fixed
- **UI 互動**: 移除 `LearningView` 中 `<h1>` 元素的 `e.stopPropagation()`，修復點擊卡片中央無法翻面的問題。
- **測試穩定性**: 重構 `wordforge.spec.ts`，以明確的 `waitFor` 取代隱式等待，解決 Playwright 端對端測試的間歇性失敗。

---

## [v25.0.0] - 2026-04-12

### Added
- **框架遷移**: 從原生 JavaScript 重構為 React 19 + TypeScript + Vite SPA 架構。
- **元件化路由**: UI 拆分為獨立元件（`Dashboard`、`LearningView`、各 Modal），由頂層狀態機控制。
- **樣式架構**: 以 Tailwind CSS v3 取代自訂 CSS 變數系統。
- **建置管線**: 新增 `.github/workflows/deploy.yml`，實現 GitHub Pages 自動化 CI/CD 部署。

### Changed
- **儲存層升級**: 從 `localStorage` 遷移至 `IndexedDB`，解除 5MB 容量限制，支援大量套牌管理。
- **演算法初始化**: 更新 SM-2 初始化邏輯，正確追蹤 `introducedDate`，防止提前離開造成狀態重置。
- **CSV 解析規則**: 放寬舊版自訂標頭驗證規則，改以 PapaParse 預設配置處理前後面文字映射。

---

## [v24.1.2] - 2026-04-10

### Added
- **批量匯入**: CSV 上傳支援多檔案選取，透過非同步迴圈依序處理。

---

## [v24.1.1] - 2026-04-10

### Added
- **UX 狀態提示**: 在 Dashboard 元件中嵌入全域/套牌配額標籤說明。

### Fixed
- **狀態型別洩漏**: 修復自訂卡片上限輸入空字串時，`parseInt` 錯誤回退至預設值的問題。

---

## [v24.1.0] - 2026-04-10

### Fixed
- **音訊執行緒洩漏**: 在交易 `catch` 區塊中註冊 `stopGhostVoice()` 執行，攔截未被等待的 DOM Audio 元件。
- **AI Prompt 格式規則**: 修正提示詞中雙引號限制規則，防止 AI 移除多行 CSV 所需的外層雙引號。

---

## [v24.0.0] - 先前架構變更

### Changed
- **彙總記錄結構**: 將指標累計邏輯改為單一事實來源（`uniqueCards` per daily report），優化非同步迭代計數。

### Fixed
- **資料競態**: 統一 IndexedDB `transaction(['decks','cards'])` 結構，實現原子性關聯寫入，解決實體關係孤兒問題。
- **記憶體定址**: 實作嚴格數值型別轉換（`Number(val) || 0 + 1`），原生緩解物件序列化時的 `NaN` 層疊擴散。
- **iOS DOM 事件規則**: 將 Audio 初始化移至使用者事件監聽器（`touchstart`、`click`）中同步觸發，繞過嚴格的音訊封鎖協議。
- **索引損毀**: 在解析層插入 BOM（`0xFEFF`）過濾器，中和 Microsoft Excel 隱形字元編碼。
