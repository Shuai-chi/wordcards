# WordForge SRS

基於 SM-2 間隔重複演算法的純本地端單字記憶系統 (Spaced Repetition System)。

## 功能介紹

WordForge SRS 是一個專為高效記憶設計的數位單字卡工具。它採用科學的 SM-2 演算法，根據您的遺忘曲線動態調整複習時間。

- **SM-2 演算法引擎**: 根據每張卡片的互動歷史（`再次` / `困難` / `良好` / `簡單`）自動計算最佳複習間隔。
- **純本地端儲存**: 所有的單字資料與學習進度均儲存在瀏覽器的 IndexedDB 中，確保隱私且無需網路連接。
- **PWA 支援**: 具備 Service Worker 快取機制，支援安裝至手機或桌面，提供如同原生 App 般的完全離線背單字體驗。
- **強大的匯入功能**: 支援批量 CSV 上傳，並內建嚴格的格式驗證與逐行錯誤診斷機制。
- **靈活的配額管理**: 全域每日新卡上限與單一套牌獨立配額可分別設定。

## 安裝步驟

確保您的系統已安裝 [Node.js](https://nodejs.org/)。

### 本地開發環境設置
1. **複製儲存庫**：
   ```bash
   git clone <repository-url>
   cd wordcards
   ```
2. **安裝依賴套件**：
   ```bash
   npm install
   ```
3. **啟動開發伺服器**：
   ```bash
   npm run dev
   ```

### 測試與驗證
- **執行 Playwright E2E 測試**：
  ```bash
  npx playwright test
  ```

### 部署說明
專案使用 GitHub Actions (`.github/workflows/deploy.yml`)，於推送至 `main` 分支時自動觸發建置，並部署至 GitHub Pages。

## 使用方法

### 匯入單字
WordForge 採用純本地儲存。匯入按鈕位於頁面右上角：
![UI Guide](./public/docs/ui-guide.png)
1. 準備一份 CSV 檔案，格式為 `正面文字,背面文字`。
2. 點擊右上角的 **「匯入 CSV」** 按鈕上傳。

### PWA 安裝指南 (推薦使用 Web App)
為了獲得最佳體驗（如全螢幕模式、更快的啟動速度），建議安裝：
- **iOS (Safari)**: 點擊 **「分享」** 按鈕 📤，選擇 **「加入主畫面」**。
- **Android (Chrome)**: 點擊選單 **(⋮)**，選擇 **「安裝應用程式」** 或 **「新增至主畫面」**。
- **電腦版 (Chrome/Edge)**: 點擊網址列右端的 **「安裝」** 圖示。

## 技術棧

- **前端框架**: React 19, TypeScript
- **建置工具**: Vite
- **UI 樣式**: Tailwind CSS v3, Lucide-React
- **儲存技術**: IndexedDB (原生 API 封裝)
- **資料解析**: PapaParse (客戶端 CSV 解析)
- **離線支援**: Progressive Web App (PWA)
- **部署**: GitHub Actions, GitHub Pages
