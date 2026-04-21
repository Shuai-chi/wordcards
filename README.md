# WordForge - Vocabulary

## 功能介紹
WordForge 是一款專為高品質單字學習設計的 SRS (間隔重複) 系統。本系統支援從 CSV 檔案匯入單字卡，並具備以下特色：
- **學術與生活雙軌語境**：自動識別單字屬性，提供最貼切的例句（托福講座/閱讀 vs 道地生活對話）。
- **結構化 8 欄位資料**：提供音標、時態變化、詞性、解釋、例句與搭配詞。
- **美式道地語言**：例句嚴格排除 AI 體，並正確套用縮寫（Contractions）。
- **離線學習**：基於瀏覽器的 LocalStorage，隨時隨地複習。

## 安裝步驟
1. 複製本倉庫至本地：
   ```bash
   git clone https://github.com/Shuai-chi/wordcards.git
   ```
2. 安裝依賴套件：
   ```bash
   npm install
   ```
3. 啟動開發伺服器：
   ```bash
   npm run dev
   ```

## 使用方法
1. **產出單字卡**：參考 `prompts/` 目錄下的提示詞規範，利用 AI 生成 8 欄位 CSV。
2. **匯入 CSV**：在 Dashboard 點擊「匯入」，選擇您的 CSV 檔案。
3. **開始學習**：系統會自動根據 SRS 演算法排程複習任務。

## 技術棧
- **Frontend**: React (TypeScript), Tailwind CSS
- **Icons**: Lucide React
- **CSV Parsing**: PapaParse
- **State Management**: React Hooks + LocalStorage
