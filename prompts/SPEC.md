# WordForge 單字卡格式與產出規範 (v13.0 SRS-Expert) 📋

為了確保 WordForge 系統能正確解析並提供最佳的視覺化效果，匯入的 CSV 必須嚴格符合以下 9 欄位規範。單一 CSV 檔案嚴禁超過 500 個單字。

## 1. CSV 欄位規範

| 序號 | 欄位名稱 | 說明 | 範例 |
| :--- | :--- | :--- | :--- |
| 1 | **Word** | 單字原型。若為片語則保留完整片語。 | `discreet` 或 `vying for` |
| 2 | **Phonetic** | IPA 音標 (必填) | `/dɪˈskriːt/` |
| 3 | **Part of Speech** | 詞性 (**小寫帶點，空格分隔**)。嚴禁 `n. v.` 合併，必須拆分。 | `n.` 或 `adj.` |
| 4 | **Inflections** | 屈折變化 (**逗號分隔**)。**不可數名詞標示 [U] 且填寫 No inflectional changes** | `discreeter, discreetest` 或 `No inflectional changes` |
| 5 | **Derivatives** | 衍生詞 (格式：`單字 (詞性.)`)。若無則填寫 `None` | `discretion (n.), discreetly (adv.)` |
| 6 | **Definition** | 自然繁體中文解釋 (**全型分號分隔**) | `謹慎的；輕描淡寫的` |
| 7 | **Example** | **黃金長度 60-120 字元**，必須包含目標單字或變化型。 | `They are very good assistants, very discreet.` |
| 8 | **Collocations** | 獨立且限 **2 到 3 個**搭配詞。嚴禁使用樣板（如 system）。 | `be discreet about, discreet inquiry` |
| 9 | **ContextType** | 語境類型 (**固定三選一**) | `General / Daily`, `Campus Life`, `Academic / Tech` |

## 2. 嚴格格式規則 (防禦性規範)
- **強制包裹**：**所有欄位內容必須用雙引號 `"` 包裹**（無論內容是否包含逗號）。
- **引號處理**：內容內部禁止使用雙引號 `"`，一律改用單引號 `'`。
- **絕對零換行**：所有欄位內容禁止出現換行符號。
- **語境縮寫政策**：
    - `Academic / Tech`: **嚴禁縮寫** (如用 `do not` 而非 `don't`)。
    - `General / Daily`: **優先使用縮寫** (如用 `I'm`, `don't`)。
- **單一化原則**：一個單字不同詞性必須拆分為獨立行，嚴禁共用完全相同的例句。

## 3. AI 產出策略
- **批次量 (Micro-Batching)**：網頁端建議每批次 **嚴格限制不超過 30 個單字**。
- **定義分隔**：中文義項統一使用全型分號 **`；`**。
- **欄位完整性**：9 個欄位缺一不可，Derivatives 空值填 `None`，不可數 Inflections 填 `No inflectional changes`。
