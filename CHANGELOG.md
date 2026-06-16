# Changelog

本檔記錄專案的重要變更。格式依循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/),版本遵循 [語意化版本](https://semver.org/lang/zh-TW/)。

## [1.0.0] - 2026-06-16

首個公開發行版本。

### 功能
- **SRS 學習引擎**:改進型 SM-2 演算法,四按鈕評分(Again / Hard / Good / Easy)與每日防重複統計。
- **多語系架構**:8 種介面語言(繁中、英、日、韓、德、西、法、泰)即時切換,並為各語系提供專屬卡片排版(假名/漢字、文法性、聲調等)。
- **自動語言偵測**:匯入 CSV 時依 Unicode 字元與標題列自動辨識牌組語言,並於學習中心提供語言篩選。
- **設計系統與深/淺色模式**:暖石灰搭配深赭石琥珀色系,DM Sans / DM Mono 字型,支援系統偏好與手動切換。
- **語音朗讀 (TTS)**:單字與例句皆可朗讀;對不支援的語系提供提示。
- **PWA 離線支援**:可安裝至手機/桌面,Service Worker 快取核心資源,離線可用。
- **本地儲存 (IndexedDB)**:所有牌組與學習進度僅存於瀏覽器本地。

### 資料規格
- 確立 9 欄位 CSV 標準(`word, ipa, pos, inflections, derivatives, definition, example, collocations, context_type`),其中 `context_type` 採 CEFR 等級。詳見 [docs/SPEC.md](./docs/SPEC.md)。
- 隨附範例牌組 `sample-decks/`(GRE、TOEFL、高中 CEFR 分級)。

### 文件
- 重整中英文 README 與資料規格,並移除內部開發檔案。
