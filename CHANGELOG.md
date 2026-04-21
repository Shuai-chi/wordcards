# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-04-21

### [新增]
- 支援高品質 8 欄位單字卡結構：`Word`, `IPA`, `POS`, `Inflections`, `Definition`, `Example`, `Collocations`, `Context_Type`。
- 新增學術 (TOEFL/Academic) 與生活 (Daily/Casual) 語境標籤支援。
- 新增單字形態變化 (Inflections) 的顯示邏輯。

### [修正]
- 修正 CSV 解析器 (CSV Parser) 的欄位對應順序，以匹配高品質單字生成規範。
- 修正 `Definition` 欄位中詞性前綴重複顯示的問題（現在詞性標記由系統動態生成）。
- 解決 PapaParse 解析包含特殊符號或亂碼之 CSV 時數量不正確的問題。

### [變更]
- 更新 `README.md` 以反映最新的 8 欄位結構與使用規範。
- 更新 `prompts/` 提示詞規範，建議改用「每批次 30 字」以確保例句品質。
- 強化對美式口語縮寫 (Contractions) 的支援。

## [1.0.0] - 2026-04-14
- 初始版本發布。
- 基本 SRS 功能與 CSV 匯入。
