# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-05-04

### [全新功能與視覺升級]
- **高質感設計系統**：全面翻新色彩系統，採用暖石灰底色搭配深赭石琥珀 (`oklch(52% 0.12 42)`)，捨棄生冷的科技感；字型升級為 DM Sans 與 DM Mono，並完整實作深淺色模式（支援系統偏好、手動切換與 `data-theme` 屬性）。
- **多語系架構**：新增 8 種介面語言（繁中、英、日、韓、德、西、法、泰）即時切換。
- **語言智能偵測**：匯入 CSV 時可依據 Unicode 字元與 Header 自動識別該套牌語言，並於 Dashboard 提供按語言過濾套牌的專屬標籤。
- **動態單字卡適配**：為不同語系提供專屬的卡片渲染邏輯（如：日語支援假名與漢字並列、德語標示文法性、泰語標示聲調與專屬字型放大）。

### [文件與規範更新]
- **更新 README**：大幅更新說明文件，聚焦於網頁端的多語系支援與設計系統升級。
- **升級單字卡規範 (v13.0 Ultimate)**：根據最新的 `srs-expert` 技能標準，更新了 `prompts/SPEC.md` 以及所有的 AI 提示詞範本 (`*-cards_zh-tw.txt`)。
  - 引入了**微批次處理 (Micro-Batching)** 限制（每批次不超過 30 個單字）。
  - 新增針對各語系的專屬規範與防退化條款，確保產出品質。
  - 實施**系統級雙軌制**，加強動名詞同形防呆與例句唯一性。
- **TTS 容錯機制**：在全域設定中增加泰語等特定語系可能缺乏瀏覽器語音合成支援的提示說明。

## [1.3.0] - 2026-04-25

### [新增]
- **WordForge v10.0 數據標準化**：支援「小寫帶點 + 空格分隔」的詞性格式。
- **語境感知 UI**：卡片背面左上角新增「美化版語境標籤」（Academic / Tech, Campus Life, General / Daily）。
- **紫色標籤引擎**：全面升級詞性標籤視覺效果，支援多詞性自動拆分渲染。

### [優化]
- **Academic 語言政策**：在 Academic / Tech 語境下強制執行「禁縮寫」規範，還原所有 `do not` 等完整形式。
- **環境淨化**：優化 `.gitignore` 並清理測試緩存。

## [1.2.0] - 2026-04-23

### [新增]
- 新增 `Inflections` (屈折變化) 顯示區塊於單字卡背面。
- 支援顯示 CSV 中的 `morphology` 欄位資料。

### [修正]
- 修正高亮引擎在處理單字變體（如 ed, ing 結尾）時無法正確命中的問題。
- 優化發音邏輯，過濾 `front` 欄位中的非法字元以提高 TTS 穩定性。

### [變更]
- 更新 CSV 匯入邏輯，自動識別並跳過以 "word" 開頭的標準化標題列。
- 調整卡片背面 UI 排版，提升衍生詞與變化形的視覺層級。
