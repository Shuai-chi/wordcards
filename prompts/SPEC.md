# WordForge 單字卡格式與產出規範 📋

為了確保 WordForge 系統能正確解析並提供最佳的視覺化效果，匯入的 CSV 必須符合以下規範。

## 1. CSV 欄位規範 (v9.0 標準)

CSV 必須包含以下 9 個核心欄位（順序建議如下）：

| 欄位名稱 | 說明 | 範例 |
| :--- | :--- | :--- |
| **Word** | 單字原型 | `discreet` |
| **Phonetic** | IPA 音標 | `/dɪˈskriːt/` |
| **Part of Speech** | 詞性 (縮寫) | `adj` |
| **Inflections** | 屈折變化 (複數、時態) | `discreeter, discreetest` |
| **Derivatives** | 衍生詞 (與詞性) | `discretion (n), discreetly (adv)` |
| **Definition** | 中文解釋 | `謹慎的` |
| **Example** | 完整例句 (推薦包含單字變體) | `They are very good assistants, very discreet.` |
| **Collocations** | 常用搭配詞 | `be discreet about, discreet inquiry` |
| **ContextType** | 語境標籤 | `General/Social` |

## 2. AI 產出最佳實踐 🤖

當您使用網頁端 AI (如 Claude, ChatGPT, Gemini) 產出單字卡時，請遵守以下原則：

### 💡 批次產出建議
*   **批次量控制**：每批次請求建議限制在 **20-25 個單字** 以內。
*   **原因**：這能確保 AI 對於「例句真實性」、「變體識別」與「衍生詞校驗」維持最高品質，避免因內容過長導致欄位遺漏或格式崩潰。

### 🚀 專業工具 (大批量產出)
對於數百個單字的批量處理，建議使用：
*   **Gemini CLI / Claude Code**：透過腳本自動化處理。
*   **方法說明**：(詳細工具鏈與腳本將在日後補充於此)。

## 3. 檔名命名建議
建議 CSV 檔名包含分類資訊，例如：
`[Technology] AI_Terminology.csv`
系統會自動識別方括號內的內容作為 **分類群組**。
