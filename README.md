# WordForge SRS

基於 SM-2 間隔重複演算法的純本地端單字記憶系統 (Spaced Repetition System)。

## 功能介紹

WordForge SRS 是一個專為高效記憶設計的數位單字卡工具。它採用科學的 SM-2 演算法，根據您的遺忘曲線動態調整複習時間。

- **SM-2 演算法引擎**: 根據每張卡片的互動歷史（`再次` / `困難` / `良好` / `簡單`）自動計算最佳複習間隔。
- **純本地端儲存**: 所有的單字資料與學習進度均儲存在瀏覽器的 IndexedDB 中，確保隱私且無需網路連接。
- **PWA 支援**: 支援安裝至手機或桌面，提供如同原生 App 般的離線使用體驗。
- **強大的匯入功能**: 支援批量 CSV 上傳，並內建嚴格的格式驗證機制。
- **靈活的配額管理**: 可分別設定全域每日新卡上限與各別套牌的獨立配額。

## 安裝步驟

確保您的系統已安裝 [Node.js](https://nodejs.org/)，然後執行以下指令：

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

## 使用方法

### 匯入單字
1. 準備一份 CSV 檔案，格式為 `正面文字,背面文字`。
2. 點擊頁面右上角的 **「匯入 CSV」** 按鈕進行上傳。

### 開始學習
1. 在儀表板選擇想要學習的套牌。
2. 根據記憶狀況選擇互動按鈕，系統會自動安排下一次複習時間。

### PWA 安裝 (推薦)
- **iOS**: 使用 Safari 開啟，點擊「分享」並選擇「加入主畫面」。
- **Android**: 使用 Chrome 開啟，點擊選單並選擇「安裝應用程式」。

## 技術棧

- **前端框架**: React 19, TypeScript
- **建置工具**: Vite
- **UI 樣式**: Tailwind CSS v3, Lucide-React
- **儲存技術**: IndexedDB (原生 API 封裝)
- **資料解析**: PapaParse
- **測試工具**: Playwright (E2E 測試)
- **部署**: GitHub Actions, GitHub Pages
