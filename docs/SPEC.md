# WordForge 資料規格 (Data Specification v1.0)

本文件定義 WordForge Web App 匯入 CSV 的欄位格式與 SRS 排程演算法,是 App 解析邏輯 (`src/lib/csv.ts`、`src/lib/srs.ts`) 的事實對照來源。

---

## 1. CSV 通用規則

- **編碼**:`utf-8-sig`(含 BOM,確保中文在 Excel / 各平台正常顯示)。
- **分隔符**:逗號 `,`。
- **包裹**:建議所有欄位以雙引號 `"` 包裹;欄位內若需引號,改用單引號 `'`。
- **無換行**:單一欄位內不得含換行字元。
- **標題列**:第一列為欄位名;App 會自動偵測並略過(判斷依據:首欄含 `word`/`単語`/`단어` 等關鍵字)。

---

## 2. 英文 9 欄位標準 (The 9-Column Standard)

匯入英文牌組時,欄位順序固定如下:

| # | 欄位 (key) | 必填 | 說明 |
|:--:|:-----------|:--:|:-----|
| 1 | `word` | ✅ | 頭詞(headword),標題式首字母大寫,最小獨立語義單位 |
| 2 | `ipa` | ✅ | 標準 IPA 音標,例 `/dɪˈskriːt/` |
| 3 | `pos` | ✅ | 詞性(小寫帶點),見 §3 |
| 4 | `inflections` | | 屈折變化,依詞性呈現,見 §3 |
| 5 | `derivatives` | | 衍生詞 `token (pos.)`,逗號分隔;無則填 `None` |
| 6 | `definition` | ✅ | 定義,5–300 bytes,見 §4 |
| 7 | `example` | ✅ | 例句,30–200 bytes,須含頭詞或其變化形 |
| 8 | `collocations` | | 搭配詞,**恰好 3 項**,以 `; ` 分隔 |
| 9 | `context_type` | | CEFR 等級:`A1` / `A2` / `B1` / `B2` / `C1` / `C2` |

> 標題列範例:
> `"word","ipa","pos","inflections","derivatives","definition","example","collocations","context_type"`

### 範例資料列

```csv
"Discreet","/dɪˈskriːt/","adj.","discreet, more discreet, most discreet","discreetly (adv.), discretion (n.)","謹慎的;考慮周到的","To avoid unwanted attention, the diplomat made a discreet exit through the back door.","a discreet silence; discreet inquiries; act discreetly","B1"
"Abase","/əˈbeɪs/","v.","abase, abases, abased, abased, abasing","abasement (n.)","降低…的地位;貶抑","He refused to abase himself by apologizing for something he didn't do.","abase oneself; abase one's pride; abase one's dignity","C2"
```

---

## 3. 詞性與屈折規則 (POS & Inflections)

`pos` 允許值:`n.`、`n. [U]`(不可數)、`v.`、`adj.`、`adv.`、`prep.`、`conj.`、`phr. v.`。
不可數標記 `[U]` 寫在 `pos` 欄(如 `n. [U]`),**不是**寫在 `inflections`。

| 詞性 | `inflections` 內容 | 範例 |
|:-----|:-------------------|:-----|
| `n.`(可數) | 單數, 複數 | `cat, cats` |
| `n. [U]`(不可數) | `no changes` | `information, no changes` |
| `v.`(動詞) | **五態**:原形, 單三, 過去式, 過去分詞, 現在分詞 | `walk, walks, walked, walked, walking` |
| `adj.`(形容詞) | 原級, 比較級, 最高級 | `tall, taller, tallest` / `beautiful, more beautiful, most beautiful` |
| `adj.`(不可分級) | `no changes` | `dead, no changes` |
| `adv.`(副詞) | 原級, 比較級, 最高級 | `quickly, more quickly, most quickly` |
| `prep.` / `conj.` | `no changes` | `through, no changes` |
| `phr. v.`(片語動詞) | 動詞本體五態變位 + 保留 particle | `harp on, harps on, harped on, harped on, harping on` |

> 動詞即使規則(過去式 = 過去分詞)兩者仍須各列一次,且**不可省略單三**。
> 不規則變化須查證真實形式,嚴禁機械加 `-s/-ed/-ing` 捏造詞形。

---

## 4. 定義格式 (Definition)

`definition` 支援三種模式:

| 模式 | 寫法 | 範例 |
|:-----|:-----|:-----|
| 純英文 | 全英文 | `a state of complete happiness` |
| 純中文 | 全中文 | `極度幸福的心理狀態` |
| 雙語 | `英文｜中文` | `a state of complete happiness｜極度幸福的心理狀態` |

- 雙語分隔符**必須**為 `｜`(**U+FF5C** FULLWIDTH VERTICAL LINE),嚴禁使用 `;`、`/`、`,` 或半形 `|`。
- 前端 `parseDefinitionBilingual` 以**最後一個** `｜` 切分;兩側 trim 後皆非空才視為雙語,否則退為單語。
- 同一份檔案內若有多個中文義項,以全形分號 `;` 分隔。

---

## 5. SRS 排程演算法 (改進型 SM-2)

對應 `src/lib/srs.ts`。每張卡片初始:`easeFactor = 2.5`、`interval = 0`、`state = 'new'`。
`interval` 單位為**天**(四捨五入);卡片狀態:`new` → `learning` / `relearning` → `graduated`。

| 按鈕 | Ease Factor (EF) | 學習階段中(new/learning/relearning) | 已畢業(graduated) |
|:-----|:-----------------|:------------------------------------|:------------------|
| **Again (1)** | `EF = max(1.3, EF − 0.2)` | `interval = 0`,回到 `learning`/`relearning` | 同左,回到 `relearning` |
| **Hard (2)** | `EF = max(1.3, EF − 0.15)` | `interval = 1`,維持 `learning` | `interval = round(interval × 1.2)` |
| **Good (3)** | 不變 | `interval = 1`,畢業 (`graduated`) | `interval = round(interval × EF)` |
| **Easy (4)** | `EF = EF + 0.15` | `interval = 4`,畢業 (`graduated`) | `interval = round(interval × EF × 1.3)` |

- **下次複習日** = `lastReviewedDate + interval` 天。
- **每日防重複**:同一天第一次評分會記錄 `baselineStats`;當天再次複習同一張卡時,會先還原到當日基準再計算,確保**只有當天第一次評分**影響長期統計。

---

*本規格隨 `src/lib/` 程式碼維護;欄位語義上游來自 srs-flashcard 單字卡產線。*
