# WordForge 單字卡格式與產出規範 (v10.0 SRS-Expert) 📋

為了確保 WordForge 系統能正確解析並提供最佳的視覺化效果，匯入的 CSV 必須嚴格符合以下 9 欄位規範。

## 1. CSV 欄位規範

| 序號 | 欄位名稱 | 說明 | 範例 |
| :--- | :--- | :--- | :--- |
| 1 | **Word** | 單字原型 | `discreet` |
| 2 | **Phonetic** | IPA 音標 (必填) | `/dɪˈskriːt/` |
| 3 | **Part of Speech** | 詞性 (**小寫帶點，空格分隔**) | `n. v.` |
| 4 | **Inflections** | 屈折變化。**不可數名詞填寫 [U]** | `[U]` 或 `discreeter, discreetest` |
| 5 | **Derivatives** | 衍生詞 (格式：`單字 (詞性.)`) | `discretion (n.), discreetly (adv.)` |
| 6 | **Definition** | 自然繁體中文解釋 (**全型分號分隔**) | `謹慎的；輕描淡寫的` |
| 7 | **Example** | **100% 道地美式英語**例句 (**Academic 禁縮寫**) | `They are very good assistants, very discreet.` |
| 8 | **Collocations** | 常用搭配詞 | `be discreet about, discreet inquiry` |
| 9 | **ContextType** | 語境類型 (**固定三選一**) | `General / Daily`, `Campus Life`, `Academic / Tech` |

## 2. 嚴格格式規則 (防禦性規範)
- **強制包裹**：**所有欄位內容必須用雙引號 `"` 包裹**（無論內容是否包含逗號）。
- **引號處理**：內容內部禁止使用雙引號 `"`，一律改用單引號 `'`。
- **絕對零換行**：所有欄位內容禁止出現換行符號。
- **語境縮寫政策**：
    - `Academic / Tech`: **嚴禁縮寫** (如用 `do not` 而非 `don't`)。
    - `General / Daily`: **優先使用縮寫** (如用 `I'm`, `don't`)。
- **單一化原則**：一個單字合併為一張卡片。多詞性衍生詞格式為 `word (n.) (v.)`。

## 3. AI 產出策略
- **批次量**：網頁端建議每批次 **20-25 字**。
- **定義分隔**：中文義項統一使用全型分號 **`；`**。
- **欄位完整性**：9 個欄位缺一不可，若無內容請填寫空值 `""`（仍須保留引號）。
