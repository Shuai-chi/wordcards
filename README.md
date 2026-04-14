# WordForge SRS

基於 SM-2 間隔重複演算法的純本地端單字記憶系統 (Spaced Repetition System)。

## 功能介紹

WordForge SRS 是一個專為高效記憶設計的數位單字卡工具。它採用科學的 SM-2 演算法，根據您的遺忘曲線動態調整複習時間。

- **SM-2 演算法引擎**: 根據每張卡片的互動歷史（`again` / `hard` / `good` / `easy`）動態計算最佳複習間隔。
- **純本地端儲存**: 所有 CRUD 操作均在瀏覽器內完成，無需建立伺服器通訊，確保資料隱私與零依賴持久化。
- **PWA 離線應用**: 具備 Service Worker 快取機制，支援安裝至桌面與完全離線背單字。
- **防禦性資料匯入**: 支援批量 CSV 上傳，內建格式驗證系統，不合規資料不會影響資料庫穩定性。
- **雙層配額控制**: 全域每日新卡上限與單一套牌獨立配額可分別設定。

## 安裝步驟

為了獲得最佳的使用體驗（如全螢幕模式、更快的啟動速度），建議將本應用安裝為 **Web App (PWA)**。

### 📲 PWA 安裝指南
#### 🍎 iPhone / iPad (iOS)
- **Safari 瀏覽器**: 
    1. 點擊瀏覽器底部的 **「分享」** 按鈕 📤。
    2. 在選單中向上滑動，找到並點擊 **「加入主畫面」**。
    3. 點擊右上角的「新增」，即可在桌面看到 WordForge 圖示。
#### 🤖 Android 手機
- **Google Chrome**:
    1. 點擊右上角的三個點 **(⋮)** 選單。
    2. 選擇 **「安裝應用程式」** 或 **「新增至主畫面」**。
#### 💻 電腦版 (Desktop)
- **Chrome / Edge**: 
    1. 在瀏覽器網址列的最右端，點擊 **「安裝」** 圖示 (螢幕與箭頭的小圖標)。
    2. 點擊「安裝」後，WordForge 將會以獨立視窗開啟。

---

### 🚀 開發者建置說明 (選用)
如果您是開發者並想在本地執行本專案：
```bash
npm install     # 安裝依賴
npm run dev     # 啟動開發伺服器
npx playwright test # 執行測試
```

## 使用方法

### 📤 如何匯入單字
WordForge 採用純本地儲存。匯入按鈕位於頁面右上角。
![UI Guide](./public/docs/ui-guide.png)
1. 準備一份 CSV 檔案，格式為 `正面文字,背面文字`。
2. 點擊標示處的 **「匯入 CSV」** 按鈕進行上傳。

### 核心操作
- **套牌選取**: 支援「全選」、「取消全選」、「反向全選」，方便快速調整學習計畫。
- **學習佇列**: Learning 狀態卡片強制留存，不受每日上限約束，直到學習完畢。

## 技術棧

- **架構**: Single Page Application (SPA)，Mobile-First 響應式設計
- **前端框架**: React 19, TypeScript, Vite
- **UI 樣式**: Tailwind CSS v3, Lucide-React
- **儲存層**: IndexedDB（原生 API 封裝）
- **資料解析**: PapaParse（客戶端 CSV 解析）
- **CI/CD**: GitHub Actions, GitHub Pages
