# WordForge (Vocabulary SRS) 🧠

WordForge 是一套基於 SM-2 間隔重複演算法 (Spaced Repetition System) 開發的純本地端單字記憶系統。
它標榜 **「無帳號登入、無伺服器連線、100% 本地硬體儲存」** 的極致隱私體驗。您可以在任何現代瀏覽器、甚至是手機上無縫體驗如同原生 App 般順暢的閃卡複習。

## 🌟 核心特色 (Features)

- **強大演算法引擎 (SM-2)**：系統會針對每一張卡片的困難度與答對履歷，精確計算出下次最適合複習的記憶節點，將大腦的遺忘曲線撫平。
- **全端純本地端 (IndexedDB)**：資料完完全全儲存在您的瀏覽器內（支援多達數百 MB 的儲存），無懼網路斷線或隱私外洩。
- **靈活配置的每日上限 (Daily Limits)**：支援跨套牌的「全域每日新卡上限」與單一獨立套牌配額切分。
- **完美中斷的嚴謹記憶體**：即便在學習途中跳出，當日尚未背熟的痛苦卡片（Learning Cards）依然會嚴格鎖定在您的待處理佇列並忽視全域配額，直到您真正克服它為止。
- **防禦性匯入 (Defensive Bulk Import)**：能夠一次性匯入大量 CSV，系統將以隔離的狀態驗證每一張閃卡，不合規矩的壞資料不會拖慢或摧毀您珍貴的資料庫。
- **RWD 行動裝置優先 (Mobile-First)**：透過 Tailwind CSS v3 強力編譯，版面於任何設備尺寸（包含極小尺寸的 iPhone SE）均能呈現最優美的 UI/UX 操作流暢度。

## 🚀 現代化技術棧 (Tech Stack)

WordForge 經過無數次硬核的實戰迭代，已將原始腳本完全剝離，進化成現代化工程矩陣：
*   **前端框架**: React 19 + TypeScript + Vite
*   **UI 樣式**: Tailwind CSS v3 
*   **Icon**: Lucide-React
*   **本地資料庫**: 原生 IndexedDB API 封裝 (No ORMs overhead)
*   **檔案解析**: PapaParse

## ✅ 部署至手機端 (Deployment)

WordForge 支援 **GitHub Pages** 免費無伺服器託管！
只需將專案推送到 GitHub 上，專案內建的 `deploy.yml` 腳本便會自動觸發 GitHub Actions，幫您建置發佈。

未來只要用手機瀏覽器打開 `https://[你的帳號].github.io/wordcards/`，點選「加入主畫面」，它就會以 PWA 的形態變成您專屬的背單字神器！

## 📜 更新歷程
請查閱 [CHANGELOG.md](./CHANGELOG.md) 以瞭解這套系統是如何從一個簡單的邏輯腳本，被極限測試演化至現今毫無破綻的穩健狀態。 
