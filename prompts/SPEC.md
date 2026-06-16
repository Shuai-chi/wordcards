# WordForge 單字卡產出規範 📋

本檔是用 AI 產生英文單字卡 CSV 的指引。**欄位格式的權威定義見 [`docs/SPEC.md`](../docs/SPEC.md)**;本檔僅補充產出策略與常見錯誤。

## 1. 欄位速查(英文 9 欄)

固定順序,小寫標題:

```
word, ipa, pos, inflections, derivatives, definition, example, collocations, context_type
```

| 欄位 | 重點 | 範例 |
| :--- | :--- | :--- |
| `word` | 頭詞,標題式首字母大寫,最小語義單位 | `Discreet` |
| `ipa` | 標準 IPA(必填) | `/dɪˈskriːt/` |
| `pos` | 小寫帶點,多詞性須拆成獨立行 | `adj.` / `n. [U]` |
| `inflections` | 依詞性呈現;動詞**五態**;無變化填 `no changes` | `walk, walks, walked, walked, walking` |
| `derivatives` | `token (pos.)`,逗號分隔;無則 `None` | `discretion (n.), discreetly (adv.)` |
| `definition` | 5–300 bytes;雙語用 `｜`(U+FF5C) | `謹慎的｜careful and prudent` |
| `example` | 30–200 bytes,須含頭詞或其變化形 | `She made a discreet exit.` |
| `collocations` | **恰好 3 項**,以 `; ` 分隔 | `a discreet silence; discreet inquiries; act discreetly` |
| `context_type` | **CEFR 等級**:A1 / A2 / B1 / B2 / C1 / C2 | `B1` |

## 2. 嚴格格式規則
- **雙引號包裹**:所有欄位內容以 `"` 包裹。
- **引號處理**:內容內部勿用雙引號,改用單引號 `'`。
- **零換行**:單一欄位內不得有換行。
- **動詞五態**:即使規則動詞(過去式 = 過去分詞)兩者仍各列一次,且不可省略單三。
- **真實詞形**:不規則變化須查證,嚴禁機械加 `-s/-ed/-ing` 捏造。
- **搭配詞**:必須是母語者真實使用的自然搭配;避免「程度副詞 + 動詞」「詞性標籤滲入」「口語填充詞」。

## 3. AI 產出策略
- **微批次 (Micro-Batching)**:每批次嚴格限制不超過 **30 個單字**,以維持品質。
- **輸出**:僅輸出一個 ```csv 程式碼塊(含標題列),勿夾雜對話文字。
- **唯一性**:同一單字的不同詞性須拆成獨立行,且不得共用完全相同的例句。

## 4. 範例輸出
```csv
"word","ipa","pos","inflections","derivatives","definition","example","collocations","context_type"
"Discreet","/dɪˈskriːt/","adj.","discreet, more discreet, most discreet","discreetly (adv.), discretion (n.)","謹慎的;考慮周到的","To avoid attention, the diplomat made a discreet exit through the back door.","a discreet silence; discreet inquiries; act discreetly","B1"
```
