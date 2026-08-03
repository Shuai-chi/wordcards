# High_Quality 單字卡雙語 Definition 實作計畫

> **面向 AI 代理的工作者：** 依序執行本計畫；以工作清單核銷進度，嚴禁跳過備份、AGY 唯讀審核或雙副本驗證。

**目標：** 將 High_Quality 的 21 份正式單字牌組全部轉為 `英文解釋｜繁體中文解釋`，僅新增缺少的一側解釋，並同步到 WordForge 的 sample-decks 後推送 GitHub。

**架構：** 以 CSV 結構化讀寫維持 UTF-8 BOM、欄位順序、列順序與所有非 `definition` 欄位逐位元組不變。建立不可混淆的 manifest（原始雜湊／列數／每列原 definition），再以受限 translation map 寫入 definition；AGY 只讀審核產生報告，主代理根據報告做外科修正與最終機械驗證。

**技術棧：** Python 3 標準庫 `csv`／`hashlib`、srs-flashcard `delivery_gate.py`、AGY sandbox 唯讀審核、WordForge npm scripts。

---

## 範圍與不可變條件

- 來源：`/home/shuaichi/Projects/03_Production/SRS_Outputs/High_Quality/` 下 21 份正式牌組 CSV。
- 排除：`TOEFL/0620_L2_v4_4source_audit_report.csv`（稽核報告，不是牌組）。
- 目標檔案：GRE 4 份、High School 14 份、TOEFL 3 份；WebApp 對應 `sample-decks/GRE`、`sample-decks/High_School`、`sample-decks/TOEFL`。
- 唯一可變欄位為 `definition`；不得重排資料列、變更 header、修改 `word`、`ipa`、`pos`、`inflections`、`derivatives`、`example`、`collocations` 或 `context_type`。
- 雙語格式唯一合法形式為：`{English definition}｜{繁體中文 definition}`（U+FF5C）。每側 trim 後均不可為空，且不得含換行。
- 備份在驗收前保留；完成所有驗證、WebApp 同步與使用者確認可交付後才刪除。

## 任務 1：建立受保護備份與基線 manifest

**檔案：**

- 建立：`/home/shuaichi/Projects/_temp_scripts/high_quality_bilingual_definitions_v1/backup/`
- 建立：`/home/shuaichi/Projects/_temp_scripts/high_quality_bilingual_definitions_v1/baseline.json`
- 建立：`/home/shuaichi/Projects/_temp_scripts/high_quality_bilingual_definitions_v1/create_baseline.py`

- [ ] 解除 21 份目標檔案的使用者唯讀旗標；不可改變非目標檔案或目錄權限。
- [ ] 使用 `cp -a` 將所有目標 CSV 保存到 backup，保留 metadata。
- [ ] 以 Python 讀取每個 CSV，寫出 manifest：相對路徑、檔案 SHA-256、列數、header、所有非 definition 欄位的逐列 SHA-256、原 definition 值。
- [ ] 立即從 backup 讀回並驗證檔案 SHA-256 與原檔一致；任一不一致即停止，不可寫入來源。

## 任務 2：受限雙語補齊

**檔案：**

- 建立：`/home/shuaichi/Projects/_temp_scripts/high_quality_bilingual_definitions_v1/translate_definitions.py`
- 建立：`/home/shuaichi/Projects/_temp_scripts/high_quality_bilingual_definitions_v1/translation-work/`
- 修改：21 份 High_Quality 正式牌組的 `definition` 欄位。

- [ ] 將每份牌組切成不超過 100 張卡的 translation work items，保留 `relative_path`、`word`、`pos`、原 definition、example，避免詞義脫離語境。
- [ ] 對原英文 definition 僅補繁體中文；對原中文 definition 僅補英語。不得改寫或刪除原有一側的文字。
- [ ] 對每個譯文執行欄位檢查：非空、無換行、不含 `｜`、另一語言字元存在、CSV 可回讀。
- [ ] 以 `English｜繁體中文` 形式寫入來源，保持 BOM、header、列數、欄位順序、資料列順序不變。
- [ ] 從 manifest 比對：每張卡的八個非 definition 欄位雜湊完全相同，且每張卡均恰有一個合法 separator。

## 任務 3：AGY 唯讀語意審核與外科修正

**檔案：**

- 建立：`/home/shuaichi/Projects/_temp_scripts/high_quality_bilingual_definitions_v1/agy-review/`
- 建立：`/home/shuaichi/Projects/_temp_scripts/high_quality_bilingual_definitions_v1/agy-review-prompt.md`
- 建立：`/home/shuaichi/Projects/_temp_scripts/high_quality_bilingual_definitions_v1/agy-review-report.md`

- [ ] 使用 `agy --sandbox --mode plan --add-dir /home/shuaichi/Projects --print`；提示明定不得使用寫入、不得執行修改指令，輸出僅存 temp 報告。
- [ ] 以每批最多 100 張卡逐批交給 AGY，要求逐卡檢查英文／繁中是否互譯、詞性與例句是否支撐該義、`｜` 兩側是否誤放或遺漏內容。
- [ ] 報告每一個問題時必須給 `relative_path`、`word`、`pos`、完整 definition、問題類型與建議修正；未具備完整定位的項目視為資訊不足，不直接修改。
- [ ] 主代理只對 AGY 報告內、且重新人工核對為真問題的 definition 進行外科修正；重跑欄位保護比對。
- [ ] 產出「接受／駁回」裁決表，記錄每個 AGY issue 的最終處置與理由。

## 任務 4：確定性品質驗證與雙副本同步

**檔案：**

- 修改：`/home/shuaichi/Projects/03_Production/SRS_Web_App/sample-decks/GRE/*.csv`
- 修改：`/home/shuaichi/Projects/03_Production/SRS_Web_App/sample-decks/High_School/*.csv`
- 修改：`/home/shuaichi/Projects/03_Production/SRS_Web_App/sample-decks/TOEFL/*.csv`

- [ ] 對每一份來源牌組執行 `python3 .gemini/skills/srs-flashcard/scripts/delivery_gate.py <file>`；失敗時保留輸出並停止後續同步。
- [ ] 以明確對照表同步 21 份來源 CSV 到 sample-decks；不觸及片語牌組。
- [ ] 再執行 `delivery_gate.py --sync-root 03_Production/SRS_Web_App/sample-decks <file>`，確認每對檔案逐位元組一致。
- [ ] 在 WebApp 目錄執行 `npm run lint`、`npm run build`，並執行既有 Playwright 匯入／學習 smoke 測試；實測雙語 CSV 解析與 `definitionLang='zh'`。

## 任務 5：交付、清理與 GitHub

**檔案：**

- 修改：上述 21 份來源牌組與 21 份 WebApp sample deck。
- 建立：`/home/shuaichi/Projects/_temp_scripts/high_quality_bilingual_definitions_v1/final-report.md`

- [ ] final report 列出每檔列數、雙語覆蓋率、非 definition 欄位不變結果、AGY issue 裁決、delivery gate 結果、WebApp 驗證輸出。
- [ ] 在使用者確認驗收前保留 backup；確認後刪除整個 temp 任務資料夾及暫時 AGY 報告，不刪除正式交付資料。
- [ ] 檢查 WebApp repository `git status`，只 stage 本任務 21 份 sample-decks 與必要文件；不得納入既有無關變更。
- [ ] 建立含來源資料與 WebApp sample decks 的可追溯 commit，推送目前分支到 GitHub；回報 commit SHA、遠端分支與驗證證據。

## 驗收標準

1. 21 份正式單字卡牌組的每張卡均為有效 `英文｜繁體中文` definition，且 separator 為 U+FF5C。
2. 每張卡原先有的那一側 definition 原文完整保留；只有缺少的另一語言被新增。
3. 卡片數、CSV header、排序與所有非 definition 欄位均與 baseline 完全一致。
4. AGY 以 sandbox 唯讀執行，產出可定位的審核報告；主代理保留問題裁決。
5. 21 份 WebApp sample decks 與 High_Quality 來源逐位元組一致；片語 deck 不變。
6. delivery gates、WebApp lint、build 與既有匯入／學習 smoke tests 有實際 PASS 證據。
7. 使用者確認交付後才移除臨時備份；GitHub push 僅包含本任務內容。
