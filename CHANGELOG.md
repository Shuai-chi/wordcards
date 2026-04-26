# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
