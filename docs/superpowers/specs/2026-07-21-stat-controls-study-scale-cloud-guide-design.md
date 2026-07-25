# WordForge 統計卡、尺寸控制與雲端驗證指南設計

## 目標

在不改變學習資料與統計計算的前提下，修訂上一輪行動版 UI：統計卡改為 1/3 左資訊區與 2/3 數字區；圖標設定名稱允許輸入期空白；所有尺寸控制改為可輸入百分比的步進器並提供即時預覽；練習卡新增兩組受限倍率。另於 `03_Production` 根目錄交付獨立 HTML 雲端驗證指南。

## 1. 統計卡

- 卡片使用兩欄 Grid：左欄 `1fr`、右欄 `2fr`。
- 左欄使用兩列 Grid：圖標區 `2fr`、中文標籤區 `1fr`。
- 圖標、標籤、數字均各自在所屬區域水平與垂直置中。
- 今日已練習、困難、良好、輕鬆共用同一 markup 與 CSS。
- `0–999` 顯示真實數值；大於等於 `1000` 顯示 `999+`。資料來源與真實值不變。
- 數字使用 tabular numerals；320px、最大倍率與三位數／`999+` 都不得重疊或產生水平捲動。

## 2. 圖標設定名稱草稿

- 輸入事件只更新 draft name，不做空字串 fallback。
- draft 最多保存 24 個 Unicode code points；輸入期間允許空字串與暫時空白。
- 按下設定「儲存」時才 trim；若結果為空，回復該 profile 的預設名稱「設定 1／2／3」。
- 取消設定時捨棄草稿；切換 profile 時保留同一次設定視窗內各 profile 的 draft。
- 從 localStorage／備份載入時仍使用既有 fail-closed normalization，空名自動修復。

## 3. 尺寸步進器與預覽

- 每項控制為 `[−] [可輸入百分比] [＋]`，不再顯示 range slider。
- 加減按鈕每次使用 schema 的 step（目前為 5%）；到 min/max 後停用。
- 百分比輸入允許打字期間暫時為空；有效數值即時預覽，blur／Enter 時 clamp 並 snap 到最近 step；無效或空白則回復上一個合法值。
- 所有限制只存在 `UI_SCALE_CONSTRAINTS`，元件不得重複硬編碼。
- 外觀頁頂部加入即時預覽，包含頁面標題、模式卡、說明、練習卡主詞／答案及三位數統計卡。
- 預覽使用與正式元件相同 CSS variables，不寫第二套尺寸邏輯。

## 4. 練習卡比例

新增兩個 scale key 與 CSS variables：

- `studyPrompt` / `--font-scale-study-prompt`：90%–125%，step 5%，預設 100%。控制練習卡主單字或片語。
- `studyContent` / `--font-scale-study-content`：90%–120%，step 5%，預設 100%。控制定義、例句、翻譯、詞形、搭配詞與衍生詞。

元件以 `clamp(最小值, 響應式值, 最大值) × 倍率` 計算。評分按鈕、進度、語言標籤與操作提示不受這兩項倍率影響。長字與長句由 `min-width: 0`、合理換行及現有卡片垂直捲動保護，不截斷重要內容。

## 5. 儲存與相容

- 仍使用 `wordforge_ui_preferences_v1`；缺少新增 scale keys 的舊資料由 normalization 補 100%。
- 儲存前 normalize，手動竄改 localStorage 的空名稱、非法倍率、非 5% step 數值均安全修復。
- 既有 backup schema v2 不變；其 UI preferences normalization 自動涵蓋新增 keys。

## 6. 雲端驗證指南

輸出：`/home/shuaichi/Projects/03_Production/WordForge_雲端同步驗證指南.html`。

指南必須區分「現況可驗證」與「Google Drive pilot 完成後才可驗證」，並包含：

- 本機備份匯出／全新 browser profile 匯入。
- provider-neutral 自動化測試指令與七類同步情境。
- Google Cloud Project、Drive API、OAuth consent screen、test user、`drive.appdata` scope、Web Client ID 與 Authorized JavaScript origins 的官方步驟。
- 明示只需 Client ID，禁止將 client secret、refresh token 或 Apple 私鑰交給前端。
- 未來兩 browser profiles 的首次上傳、下載、離線→上線、雙邊衝突、token 過期／撤銷、刪除雲端備份與 scope 查核矩陣。
- Google Console 名稱與流程以交付日官方文件重新核對，附官方連結；不得把 Stage 4 未完成項目寫成已可操作。

## 7. 驗證

- TDD：每個行為先新增或修改 Playwright 測試並觀察預期失敗。
- viewport：320、390、430、768、1024、1440，以及 844×390、932×430。
- 統計卡驗證欄寬約 1:2、左欄列高約 2:1、三位數與 `999+` 無溢位。
- 設定驗證空 profile 名輸入期保留、儲存時 fallback、步進器／直接輸入／預覽／重載。
- 學習 smoke 驗證主詞與答案倍率生效，評分按鈕仍可用。
- 完整執行 Playwright、lint、build、`git diff --check`；專案沒有獨立 `test`／`typecheck` script 時如實說明。

## 規格自檢

- 無 TODO、待定或未定義輸出路徑。
- 所有新增倍率皆有預設、上下限、step、持久化與 hostile-data fallback。
- `999+` 僅改 display，不更動報表與 SRS 資料。
- 雲端文件不宣稱未完成的 Google provider 已可使用。

