# WordForge SRS

基於 SM-2 間隔重複演算法的純本地端單字記憶系統 (Spaced Repetition System)。

## 📌 技術規格

- **架構**: Single Page Application (SPA)，Mobile-First 響應式設計
- **前端框架**: React 19, TypeScript, Vite
- **UI 樣式**: Tailwind CSS v3, Lucide-React
- **儲存層**: IndexedDB（原生 API 封裝），零依賴本地持久化
- **資料解析**: PapaParse（客戶端 CSV 解析）
- **部署**: GitHub Actions CI/CD → GitHub Pages

## ✨ 核心功能

- **SM-2 演算法引擎**: 根據每張卡片的互動歷史（`again` / `hard` / `good` / `easy`）動態計算最佳複習間隔。
- **零後端架構**: 所有 CRUD 操作均在瀏覽器內完成，無需建立伺服器通訊。
- **防禦性資料匯入**: 支援批量 CSV 上傳，內建格式驗證系統，不合規資料不會影響資料庫穩定性。
- **雙層配額控制**: 全域每日新卡上限與單一套牌獨立配額可分別設定。
- **未完成佇列隔離**: Learning 狀態卡片強制留存，不受每日上限約束，直到學習完畢。

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
