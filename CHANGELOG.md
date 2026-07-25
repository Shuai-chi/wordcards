# Changelog

本檔記錄專案的重要變更。格式依循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/),版本遵循 [語意化版本](https://semver.org/lang/zh-TW/)。

## [Unreleased]

### [新增]
- 新增唯讀連續聆聽模式:單字／片語與例句可各朗讀 0～5 次,支援播放／暫停／上一張／下一張、今日／全部清單、依序／穩定隨機、整份循環、可及播放清單與上次位置保存;播放不寫入卡片或報表。
- 連續聆聽加入 320～1440px、手機橫式、safe-area、44px 觸控目標與瀏覽器語音中斷偵測;背景／鎖屏能力依平台而異,回到前景不會自動重新發聲。
- 連續聆聽新增音訊設定 bottom sheet、0.5×～2× 八段固定倍速、裝置 voice 選擇、相容語言篩選、首選 voice 遺失提示、試聽與一鍵重設。
- 倍速與首選 voice 保存於 `wordforge_listening_preferences_v1`,並納入可攜備份 schema v3;舊 localStorage 與 v1／v2／舊 v3 備份會補入 0.85×／自動 voice 安全預設。
- 可攜備份升級為 schema v3,保存連續聆聽偏好並嚴格驗證 0～5 次安全範圍;schema v1／v2 備份會遷移到安全預設,匯入寫入失敗仍完整回滾。
- 外觀自訂配色新增嚴格 AI 色彩指令列,採 `background`／`card`／`primary`／`accent` 四個語系無關英文鍵,支援全部／部分項目原子套用、目前配置標準化顯示與一鍵複製、即時對比預覽,以及回復目前模式最近一次已儲存配色;指令草稿不另行持久化。
- 備份 UUID、SHA-256 與配色複製加入非安全來源 fallback;經 WSL IP 開啟時即使 `crypto.randomUUID`、`crypto.subtle` 或 Clipboard API 不可用,仍可匯出並驗證備份、複製配色指令。
- 新增 3 組淺色與 3 組深色推薦主題、跟隨系統模式與個別模式重設。
- 新增品牌色、強調色、背景色與卡片色調色盤／HEX 自訂,支援即時預覽與取消回復。
- 新增版本化 `wordforge_appearance_v1` 本機設定格式與舊 `srs_theme` 安全遷移。
- 新增 WCAG 對比閘門、損壞設定 fallback、手機版設定視窗與主題／學習流程 Playwright 測試。
- 新增版本化 JSON 資料備份,涵蓋設定、套牌、卡片 SRS 進度與報表;匯入前驗證 schema、SHA-256 hash、筆數、ID 與資料關聯。
- 新增匯入 dry-run 摘要、25 MiB 上限與原子 IndexedDB 取代;設定寫入失敗時會回復匯入前資料。
- 新增供應商中立 `SyncProvider` 同步核心與 in-memory provider,以共同 base revision／payload hash 判定本機或雲端單邊更新。
- 新增雙邊變更衝突副本、離線重連、冪等重試與雲端下載 rollback 測試;供應商中立核心繼續作為 Google Drive adapter 的安全邊界。
- 新增純前端 Google Identity Services token flow,僅要求 `drive.appdata` 最小權限;access token 只存在記憶體,不使用 Client Secret、refresh token 或新增後端。
- 新增 Google Drive REST transport 與 `appDataFolder` provider,以不可變 snapshot DAG、operation idempotency、current／previous 保留與多 head 分岔偵測避免靜默 last-write-wins。
- 設定「一般與備份」新增八語 Google Drive 狀態卡、連結／重新連結、立即同步、斷開與永久刪除雲端備份;斷開與刪除維持不同語意。
- 新增本機變更 debounce、恢復連線／回到前景重試、401 重新授權、離線續用及衝突時先匯出本機備份的逃生路徑。
- 重整行動版「背單字／片語」入口卡：圖標與放大標題水平並列，說明與牌組數移至一致的輔助區；短高度橫式與 320–1440px 寬度皆採受限響應式尺寸。
- 重整四張學習統計卡為左 1/3、右 2/3；左欄再以 2/3 圖標、1/3 中文標籤垂直排列，右側只放放大數字；1000 以上顯示 `999+`，但保留真實統計值。
- 設定新增外觀／圖標／一般與備份頁籤，以及八項 80%–130% 安全倍率控制；控制改為「−／可輸入百分比／＋」並提供統一即時預覽，非法本機設定會依集中式 schema clamp。
- 練習卡新增主詞／片語與答案內容兩組獨立倍率；採響應式 `clamp()` 基準乘受限比例，評分控制維持安全尺寸。
- 圖標設定名稱允許輸入期間暫時空白；只有儲存時仍為空白才恢復預設名稱。
- 新增三組可命名圖標設定，每組支援六張 PNG／JPG／WebP 圖片、512 KiB 上限、完整適應／填滿、50%–300% 縮放、拖曳定位與個別移除。
- 圖標 Blob 儲存在 IndexedDB `iconAssets`，設定名稱與倍率儲存在 `wordforge_ui_preferences_v1`；備份升級為 schema v2 並保留 v1 匯入 migration。
- 新增安全區、`viewport-fit=cover`、container query 與多 viewport／直橫向 Playwright 回歸；所有倍率最小／最大值都檢查無水平溢位或欄位重疊。
- 新增 `03_Production/WordForge_雲端同步驗證指南.html`,涵蓋本機備份、同步核心、Google Cloud 設定、安全界線與兩 Profile 驗收矩陣。
- 設定視窗改為固定頂部工具列與頁籤、分頁專屬固定預覽、內容獨立捲動；儲存後保持開啟，未儲存時透過 X／外側／Escape 離開會先顯示捨棄確認。
- 外觀頁新增網站介面與練習卡並排即時預覽，補齊基礎文字、練習主詞與答案倍率連動；圖標頁新增目前 profile 六圖標與 transform 即時預覽。
- 倍率控制依內容寬度採桌面 3 欄、一般手機 2 欄、320px 1 欄；短高度橫式縮減固定區高度，保存按鈕與關閉按鈕維持可操作。
- 雲端同步驗證指南更新為已接線 Pilot 的實際 UI／環境變數步驟,補充 WSL2 origin 限制、外洩 Client Secret 撤銷、真實帳號、離線、衝突、撤銷與刪除驗收;跨裝置實機結果仍等待使用者驗收。

### [變更]
- 連續聆聽的倍速與 voice 變更從下一遍正式朗讀開始生效,不取消目前 utterance;手動試聽會中止目前這一遍、完成後保持暫停。正式播放遇到遺失或語言不相容的首選 voice 時會自動使用相容備援。

## [1.1.0] - 2026-07-18

### [新增]
- 新增單字／片語入口頁,依牌組類型分流至各自的學習中心。
- 新增片語卡版面:正面片語與 TTS;背面依序顯示例句與 TTS、片語解釋、例句翻譯。
- 新增 5 欄片語 CSV 匯入格式、牌組類型自動偵測,以及 12 筆日常片語範例牌組。
- 入口與片語卡新增文案均支援繁中、英、日、韓、德、西、法、泰 8 種介面語言。

## [1.0.2] - 2026-07-09

### [新增]
- 彈窗鍵盤焦點鎖定（focus trap）：設定/編輯牌組/批次編輯三個彈窗開啟時，Tab 焦點循環鎖定於彈窗內，不再逸出到背景（`useFocusTrap` hook）。

## [1.0.1] - 2026-07-08

### [修正]
- PWA manifest 雙鏈與舊路徑 start_url
- 殘留 sw.js
- de/es/fr CSV 表頭誤判為英文
- 'jp'/'ja' 語系代碼不一致
- IndexedDB 交易錯誤被吞
- 評分死鎖防護
- 例句高亮 regex 狀態污染
- 批次刪除二次確認
- TTS 計時器清理
- CSV 匯入驗證強化（validateCard/Papa errors/greedy）
- TypeScript strict 啟用
- Playwright baseURL
- CI Setup Pages 順序

## [1.0.0] - 2026-06-16

首個公開發行版本。

### [新增]
- **SRS 學習引擎**:改進型 SM-2 演算法,四按鈕評分(Again / Hard / Good / Easy)與每日防重複統計。
- **多語系架構**:8 種介面語言(繁中、英、日、韓、德、西、法、泰)即時切換,並為各語系提供專屬卡片排版(假名/漢字、文法性、聲調等)。
- **自動語言偵測**:匯入 CSV 時依 Unicode 字元與標題列自動辨識牌組語言,並於學習中心提供語言篩選。
- **設計系統與深/淺色模式**:暖石灰搭配深赭石琥珀色系,DM Sans / DM Mono 字型,支援系統偏好與手動切換。
- **語音朗讀 (TTS)**:單字與例句皆可朗讀;對不支援的語系提供提示。
- **PWA 離線支援**:可安裝至手機/桌面,Service Worker 快取核心資源,離線可用。
- **本地儲存 (IndexedDB)**:所有牌組與學習進度僅存於瀏覽器本地。

### [變更]
- 確立 9 欄位 CSV 標準(`word, ipa, pos, inflections, derivatives, definition, example, collocations, context_type`),其中 `context_type` 採 CEFR 等級。詳見 [docs/SPEC.md](./docs/SPEC.md)。
- 隨附範例牌組 `sample-decks/`(GRE、TOEFL、高中 CEFR 分級)。
- 重整中英文 README 與資料規格,並移除內部開發檔案。
