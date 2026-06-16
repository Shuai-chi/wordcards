# WordForge — 高品質單字學習系統 🚀

[![README](https://img.shields.io/badge/README-English-blue.svg)](./docs/i18n/README-en.md)
[![Data Spec](https://img.shields.io/badge/Data%20Spec-v1.0-green.svg)](./docs/SPEC.md)
[![PWA](https://img.shields.io/badge/PWA-offline%20ready-5a67d8.svg)](#-安裝與存取)

一個為進階學習者設計的極簡單字卡系統,具備精確的 SRS(間隔重複)演算法、多語系介面,以及隱私優先的離線體驗。

## ✨ 核心功能
*   **多語系架構與介面**:支援 8 種介面語言(繁中、英、日、韓、德、西、法、泰),並為各語言提供專屬卡片排版(如日語假名/漢字、德語文法性、泰語聲調)。
*   **完整語音朗讀 (TTS)**:單字與**例句**皆可朗讀,強化聽力。
*   **設計系統與深/淺色模式**:採暖石灰(warm stone gray)搭配深赭石琥珀(ochre amber)色系,字型使用 DM Sans 與 DM Mono;支援系統偏好與手動切換。
*   **漸進式網頁應用 (PWA)**:可安裝到手機與桌面,提供全螢幕、離線的原生體驗。
*   **隱私與離線 (IndexedDB)**:所有牌組與學習進度僅存於你的瀏覽器本地,無需連線、不上傳任何伺服器。
*   **高品質 CSV 匯入**:支援符合 [資料規格](./docs/SPEC.md) 的 9 欄位 CSV,並能自動偵測語系。

## 📲 安裝與存取

### 1. 網頁版直接使用(最快)
[開啟 WordForge Web App](https://shuai-chi.github.io/wordcards/)
*   純前端應用,載入後即可離線使用;資料只存在瀏覽器的 IndexedDB。

### 2. 手機安裝(建議 PWA)
*   **iOS (Safari)**:點「分享」→「加入主畫面」。
*   **Android (Chrome)**:點選單 →「安裝應用程式」。

### 3. 本地開發
```bash
git clone https://github.com/Shuai-chi/wordcards.git
cd wordcards
npm install
npm run dev
```

## 🛠️ 使用教學

### 第一步:準備與匯入
1.  **取得單字卡**:可直接使用 [`sample-decks/`](./sample-decks) 內的範例牌組(GRE / TOEFL / 高中 CEFR 分級),或依 [資料規格](./docs/SPEC.md) 自行產生 CSV。
2.  **匯入**:在首頁點右上角的「上傳」圖示並選擇 CSV;系統會自動偵測語系。

### 第二步:設定
1.  **全域每日上限**:在「設定」中設定每日跨所有牌組的新卡上限。
2.  **單牌組上限**:也可為各牌組單獨設定每日新卡數。

### 第三步:練習(SRS 機制)
系統依你的反饋安排下次複習:
*   **Again (1)**:完全忘記。卡片進入重學,稍後再次出現。
*   **Hard (2)**:想得起來但很慢。縮短下次間隔。
*   **Good (3)**:順利想起。以標準間隔成長。
*   **Easy (4)**:輕鬆答對。大幅延長間隔。

### 第四步:重練今日卡片
完成每日任務後,開始按鈕會變成「**重複練習今日**」,可在不影響長期 SRS 排程下鞏固當天所學。

## 📂 專案結構
*   `src/components/`:UI 組件(Dashboard、LearningView 等)。
*   `src/lib/`:核心邏輯(SRS 演算法、CSV 解析、語言偵測、IndexedDB)。
*   `docs/`:多語系 README 與 [資料規格](./docs/SPEC.md)。
*   `prompts/`:用 AI 產生單字卡的提示詞與格式說明。
*   `sample-decks/`:可直接匯入的範例 CSV 牌組。

## 🛡️ 隱私聲明
WordForge 是隱私優先(Privacy-First)的工具,你的資料永遠不離開瀏覽器。請注意:清除瀏覽器資料會一併刪除牌組與進度,**建議保留你匯入用的原始 CSV 檔作為備份**。

---
© 2026 WordForge Project
