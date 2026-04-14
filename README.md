# WordForge SRS

基於 SM-2 間隔重複演算法的純本地端單字記憶系統 (Spaced Repetition System)。

## 📌 技術規格

- **架構**: Single Page Application (SPA)，Mobile-First 響應式設計
- **前端框架**: React 19, TypeScript, Vite
- **UI 樣式**: Tailwind CSS v3, Lucide-React
- **儲存層**: IndexedDB（原生 API 封裝），零依賴本地持久化
- **資料解析**: PapaParse（客戶端 CSV 解析）
- **離線支援**: Progressive Web App (PWA)，支援安裝至桌面與完全離線背單字
- **部署**: GitHub Actions CI/CD → GitHub Pages

## ✨ 核心功能

- **SM-2 演算法引擎**: 根據每張卡片的互動歷史（`again` / `hard` / `good` / `easy`）動態計算最佳複習間隔。
- **零後端架構**: 所有 CRUD 操作均在瀏覽器內完成，無需建立伺服器通訊。
- **防禦性資料匯入**: 支援批量 CSV 上傳，內建格式驗證系統，不合規資料不會影響資料庫穩定性。
- **批量選取控制**: 支援「全選」、「取消全選」、「反向全選」，方便快速調整學習計畫。
- **雙層配額控制**: 全域每日新卡上限與單一套牌獨立配額可分別設定。
- **PWA 離線應用**: 具備 Service Worker 快取機制，安裝後即可在無網路環境下穩定運行。
- **未完成佇列隔離**: Learning 狀態卡片強制留存，不受每日上限約束，直到學習完畢。

## 📲 PWA 安裝指南 (Web App)
為了獲得最佳的使用體驗（如全螢幕模式、更快的啟動速度），建議將本應用安裝為 Web App。

### 🍎 iPhone / iPad (iOS)
- **Safari 瀏覽器**: 
    1. 點擊瀏覽器底部的 **「分享」** 按鈕 📤。
    2. 在選單中向上滑動，找到並點擊 **「加入主畫面」**。
    3. 點擊右上角的「新增」，即可在桌面看到 WordForge 圖示。
- **Chrome 瀏覽器**:
    1. 點擊網址列右側的 **「分享」** 圖示。
    2. 同樣選擇 **「加入主畫面」** 並依照提示完成。

### 🤖 Android 手機
- **Google Chrome**:
    1. 點擊右上角的三個點 **(⋮)** 選單。
    2. 選擇 **「安裝應用程式」** 或 **「新增至主畫面」**。
    3. 依照跳出的對話框提示完成安裝。

### 💻 電腦版 (Desktop)
- **Chrome / Edge**: 
    1. 在瀏覽器網址列的最右端，點擊 **「安裝」** 圖示 (螢幕與箭頭的小圖標)。
    2. 點擊「安裝」後，WordForge 將會以獨立視窗開啟。

## 📤 如何匯入單字
WordForge 採用純本地儲存。由於介面採用極簡設計，匯入按鈕位於頁面右上角。

![UI Guide](./public/docs/ui-guide.png)
*上圖標示處即為 **匯入 CSV** 按鈕位置。*

## 🚀 建置與執行

安裝依賴：
```bash
npm install
```

啟動開發伺服器：
```bash
npm run dev
```

執行測試：
```bash
npx playwright test
```

## 🏗️ CI/CD 部署

專案使用 `.github/workflows/deploy.yml`，於推送至 `main` 分支時自動觸發建置。
靜態資源會以 `/wordcards/` 為 base path 進行打包。

## 📜 文件

- 更新歷程：[CHANGELOG.md](./CHANGELOG.md)
- English version: [README.en.md](./README.en.md)
