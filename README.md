# WordForge - 高品質英語單字學習系統

## 功能介紹
WordForge 是一個專為進階英語學習者設計的單字卡系統。它結合了真實世界語料（YouTube 訪談、科技評論）與 AI 教材化加工，提供最道地的語感練習。
- **真實語料驅動**：例句取材自 Lex Fridman, Jensen Huang 等專業人士的訪談。
- **視覺同步高亮**：自動識別例句中的單字變體並進行顏色標記。
- **完整詞彙屬性**：展示 IPA 音標、屈折變化 (Inflections)、衍生詞與語境標籤。
- **離線學習**：支援高品質 CSV 匯入與本地 SRS 複習。

## 安裝步驟
1. 複製本專案至本地環境。
2. 執行 `npm install` 安裝相依套件。
3. 執行 `npm run dev` 啟動開發伺服器。

## 使用方法
1. 使用後端 `srs-generator` 產出符合 v9.0 標準的 CSV 檔案。
2. 在網頁介面點擊「匯入」，選擇產出的 CSV。
3. 系統將自動解析標題列，並開始顯示單字卡。

## 技術棧
- **Frontend**: React (TypeScript), Vite, TailwindCSS.
- **Icons**: Lucide-React.
- **Data**: PapaParse (CSV Processing), IndexedDB (Local Storage).
