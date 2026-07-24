# WordForge 連續聆聽模式設計

**日期：** 2026-07-23  
**狀態：** 使用者已於 2026-07-23 核准  
**範圍：** 在本機優先的 WordForge Web App 新增獨立聆聽模式，以瀏覽器 Web Speech API 連續朗讀卡片主詞／片語與例句；不評分、不改動 SRS 進度、不新增後端或付費 TTS。

## 1. 目標

1. 提供播放、暫停、上一張與下一張控制。
2. 依使用者設定，按「主詞／片語 N 遍 → 例句 M 遍 → 下一張」自動連續播放。
3. 支援今日清單與所選牌組全部卡片。
4. 支援依序、固定隨機順序與整份清單循環。
5. 保存聆聽偏好與上一張卡片，但重新開頁後保持暫停，必須由使用者再次按播放。
6. 保證頁面前景播放；背景與鎖屏只做最佳努力，並誠實呈現平台限制。
7. 完全隔離聆聽與正式 SRS 練習，播放不算看過、不產生評分或報表。

## 2. 已核准的產品決策

- 聆聽是獨立模式，不嵌入正式評分流程。
- 進入時可選「今日清單」或「全部卡片」。
- 可切換「依序／隨機」，並記住上次選擇。
- 提供「循環整份清單」開關；關閉時停在最後一張。
- 主詞／片語與例句重播次數各為 0～5，`0` 表示略過，預設都是 1。
- 同內容重播之間固定等待 0.5 秒，換到下一張前固定等待 1 秒。
- 暫停後優先從句中原位置繼續；瀏覽器不支援或背景中斷時，從目前這一遍的開頭重播。
- 前景播放必須可靠；背景／鎖屏屬最佳努力，不承諾所有平台持續播放。
- 採 Web Speech API 播放佇列，不預先生成音訊檔，也不建立付費 TTS 或後端。
- 介面採獨立全頁播放器，手機底部控制列固定；完整播放清單以抽屜開啟。
- 保存來源、順序、循環、重播次數、隨機 seed 與上一張 card ID；不保存自動播放狀態或句中時間點。

## 3. 範圍與非目標

### 3.1 本次範圍

- 單字與片語兩種牌組模式。
- 現有八種卡片語言與現有 BCP-47 TTS 語言設定。
- 所選牌組中的 `card.front` 與 `card.example`。
- 手機、平板、桌面及 PWA 前景播放。
- 本機偏好、JSON 備份與既有 Google Drive 完整快照相容。
- 無障礙標籤、鍵盤操作、焦點狀態與響應式版面。

### 3.2 非目標

- 不朗讀定義、翻譯、音標、詞性、搭配詞或衍生詞。
- 不加入語速、音調、音量或 voice 選擇介面；沿用目前 `rate=0.85`、`pitch=1.0` 與語音選擇規則。
- 不保證鎖屏、切換 App 或瀏覽器被系統休眠後持續播放。
- 不產生 MP3／AAC、不串接雲端 TTS、不建立 Media Session 鎖屏控制。
- 不更新卡片 `state`、`interval`、`easeFactor`、`todayRating`、`lastReviewedDate` 或報表。
- 不在本次實作逐筆合併播放器偏好或修改 Google Drive provider。

## 4. 使用者流程與介面

### 4.1 入口

- 在單字或片語的學習中心主要練習按鈕下方加入「進入聆聽模式」次要按鈕。
- 入口明示「只播放語音，不會改動學習進度」。
- 沒有選取牌組時停用入口並沿用「請先選擇牌組」語意。
- 只要所選牌組有卡片即可進入；不受今日 SRS 任務是否為零限制。
- 若瀏覽器沒有 `speechSynthesis`，入口保留但顯示不支援狀態，不能進入假播放。

### 4.2 全頁播放器

畫面依序包含：

1. 返回、頁名與播放清單抽屜按鈕。
2. 「今日清單／全部卡片」來源選擇。
3. 「依序／隨機」順序選擇。
4. 目前牌組、卡片索引、總數與循環開關。
5. 目前主詞／片語、例句，以及「正在朗讀主詞／例句・第 X / N 遍」。
6. 主詞／片語與例句重播次數控制。
7. 清單進度條。
8. 固定底部的上一張、播放／暫停、下一張。

桌面內容最大寬度與現有 App 一致並置中；手機不因固定控制列遮住內容，須納入 safe-area bottom padding。

### 4.3 播放清單抽屜

- 顯示卡片索引與 `front`。
- 標示目前卡片。
- 點選任意卡片會取消目前 utterance，切到該卡第一遍主詞。
- 原本為播放中時切換後繼續播放；原本暫停時保持暫停。
- 抽屜在手機覆蓋主畫面，在桌面可使用同一抽屜模式，不另做常駐側欄。

### 4.4 控制行為

- 播放中按上一張／下一張：取消當前語音與等待 timer，從目標卡第一遍主詞開始播放。
- 暫停時按上一張／下一張：只切卡並保持暫停。
- 第一張按上一張：循環開啟時跳到最後一張；循環關閉時停在第一張。
- 最後一張按下一張：循環開啟時跳到第一張；循環關閉時進入完成狀態並停在最後一張。
- 完成狀態再次按播放：從第一張第一遍主詞重新開始。
- 修改重播次數不打斷當前 utterance；當前 utterance 結束後以最新設定決定下一步。
- 降低次數至小於目前遍數時，當前 utterance 結束後立即進入下一階段。
- 來源或順序變更會重建清單；目前 card ID 仍存在時維持該卡，否則回到第一張並保持原本播放／暫停狀態。
- 離開播放器立即取消語音與 timer，只保存偏好及最後 card ID。

## 5. 播放清單語意

### 5.1 牌組範圍

- 使用學習中心目前選取的牌組。
- 單字學習中心只包含 `deckType=vocab`；片語學習中心只包含 `deckType=phrase`。
- 每張卡以所屬牌組的語言設定決定 TTS 語言，因此同一清單可安全包含多種語言。

### 5.2 今日清單

- 沿用目前正式練習的資格與預算語意：
  - `learning`／`relearning` 卡優先。
  - 已到期的 `graduated` 卡。
  - 每個牌組剩餘新卡上限。
  - 全域每日新卡預算。
  - 若沒有待學卡，退回今天已複習的卡片。
- 必須抽出可測試的共同 eligibility／budget helper，避免聆聽與 `Dashboard.handleStart()` 各自維護一份規則。
- 共同 helper 只回傳候選桶與可取數量；正式練習仍可沿用目前隨機抽取，不因本功能改變既有排程。
- 聆聽清單以保存的 seed 決定超出預算時取哪些候選，確保重新開啟後同一日、同一牌組選取與同一 seed 得到相同集合。

### 5.3 全部卡片

- 包含目前所選牌組的所有卡片，不考慮 SRS 狀態、到期日或每日上限。
- 卡片沒有例句仍可播放主詞。

### 5.4 依序與隨機

- 依序：先依學習中心牌組顯示順序，再依卡片 ID 尾端的匯入數字索引排序；無法解析索引時以完整 card ID 穩定排序。
- 隨機：使用保存的 seed 做確定性 Fisher–Yates，不使用每次 render 都變化的 `Math.random()`。
- 切換來源或牌組選取集合時才產生新 seed；單純重新整理不改變 seed。本次不提供「重新洗牌」按鈕。
- 清單中每個 card ID 只出現一次；重播由播放段落控制，不複製卡片項目。

## 6. 單張卡片播放序列

對每張卡片建立邏輯段落，而不是一次把所有文字塞進同一 utterance：

1. `front` 第 1～N 遍，每遍獨立 utterance。
2. 每次 `front` 重播之間等待 500 ms。
3. 若 `example` 非空且例句次數大於 0，播放第 1～M 遍，每遍獨立 utterance。
4. 主詞最後一遍與例句第一遍之間等待 500 ms。
5. 例句重播之間等待 500 ms。
6. 卡片內容完成後等待 1,000 ms，再切換下一張。

若主詞與例句次數都為 0，該卡從有效播放清單中排除。若整份清單沒有任何可播放段落，播放按鈕停用並提示至少把一項次數調整為 1。

每一遍只有收到目前 session generation 的 `onend` 才能前進。`onerror`、取消、上一張、下一張、跳卡、重建清單與卸載都會使舊 callback 失效。

## 7. 模組與責任

### 7.1 `listeningPreferences`

純函式與 storage adapter，負責：

- schema、預設值與限制。
- localStorage 讀寫。
- 非法、缺失或超界值修復。
- 固定 seed 建立與每種牌組模式的最後 card ID。
- 備份 migration 所需的 normalize 入口。

不得依賴 React、SpeechSynthesis 或 IndexedDB。

### 7.2 `listeningPlaylist`

純函式與資料查詢組合器，負責：

- 今日／全部來源。
- 共用 eligibility／budget 結果。
- 依序排序與 seed 隨機。
- 找回最後 card ID。
- 清單重建與無效卡片排除。

不得寫入卡片、報表或任何 SRS 欄位。

### 7.3 `SpeechEngine`

Web Speech API adapter，負責：

- 等待及監聽 `voiceschanged`。
- 沿用目前完全相符、Natural、Online、Google、同語系 fallback 的語音優先順序。
- 建立單一 `SpeechSynthesisUtterance`。
- `onend`、`onerror`、pause、resume、cancel。
- 偵測 `speechSynthesis` 不存在。

現有 `LearningView` 的手動單字／例句朗讀應改用同一個底層 adapter 或共用 voice resolver，避免兩套語音選擇規則漂移；不得順便重寫卡片畫面。

### 7.4 `PlaybackController`

播放器唯一狀態真相，負責：

- `idle`、`ready`、`playing`、`paused`、`waiting`、`completed`、`interrupted`、`error`。
- card index、`front`／`example` phase、目前遍數。
- generation token、timer、循環與前進規則。
- 來源／順序／次數變更。
- 暫停、恢復、切卡、背景恢復及錯誤降級。

控制器不 import DB，也不產生 UI。

### 7.5 `ListeningMode`

React 呈現與互動層，負責：

- 顯示控制器狀態與已批准的全頁版面。
- 提供所有按鈕、抽屜、狀態訊息及可及性。
- 在進入時取得播放清單，在離開時 dispose controller。
- 將偏好變更寫入集中式 preferences adapter。

不得呼叫 `DB.commitReview()`、`onCardSeen()` 或正式練習的資料變更 callback；偏好儲存成功後，只能呼叫 App 既有的 `cloudSyncController.notifyLocalChange()` 通知設定快照已變更。

## 8. 暫停、背景與跨平台

### 8.1 一般暫停

- 支援時呼叫 `speechSynthesis.pause()`，狀態記為 native paused。
- 恢復時優先呼叫 `resume()`，嘗試從句中接續。
- 若 adapter 判定原 utterance 已不存在、瀏覽器取消或回到前景時 `speaking`／`pending` 都為 false，狀態改為 `interrupted`。
- `interrupted` 再按播放會從目前 phase、目前遍數的開頭建立新 utterance。

### 8.2 背景與鎖屏

- 頁面隱藏時不主動取消；若瀏覽器繼續觸發 `onend`，可最佳努力推進。
- 返回前景時檢查控制器與 SpeechSynthesis 是否一致。
- 控制器認為正在播放、瀏覽器卻沒有 speaking／pending 時，不自動猜測已完成，改為中斷並暫停。
- UI 與說明文件必須標示 iOS／Android 背景與鎖屏不保證持續。
- 不以無限靜音 utterance、Wake Lock 或高頻 timer 繞過平台限制。

## 9. 錯誤處理

- 沒有 `speechSynthesis`：不建立 controller session，顯示不支援。
- voices 尚未載入：等待 `voiceschanged`，最多 3,000 ms；逾時後以瀏覽器預設 voice 嘗試一次，若仍失敗才顯示錯誤。
- 沒有完全相符 voice：使用現有同語系 fallback。
- utterance `onerror`：以 fallback voice 自動重試目前這一遍一次。
- fallback 仍失敗：暫停並顯示「重試目前這一遍／跳過此卡／返回」。
- 自動重試次數只屬於目前這一遍，不得形成無限迴圈。
- 缺少例句：略過例句階段，不顯示錯誤。
- 播放中卡片被刪除：重建清單並移到下一張有效卡；無卡時完成。
- 所選牌組清空：取消播放並顯示空清單。
- dispose：取消 utterance、timer、事件監聽與舊 callback。

## 10. 持久化、備份與同步

### 10.1 本機 schema

使用 `wordforge_listening_preferences_v1`：

```ts
interface ListeningPreferencesV1 {
  schemaVersion: 1;
  source: 'today' | 'all';
  order: 'sequential' | 'shuffle';
  loopPlaylist: boolean;
  frontRepeats: number;
  exampleRepeats: number;
  shuffleSeedByMode: Partial<Record<'vocab' | 'phrase', string>>;
  lastCardIdByMode: Partial<Record<'vocab' | 'phrase', string>>;
  updatedAt: string;
}
```

規則：

- `frontRepeats`、`exampleRepeats` 為整數 0～5，預設 1。
- 未知 schema、錯誤 JSON 或非法 enum 完整回到安全預設。
- 數值超界 clamp 到最近合法值。
- card ID 找不到時只清該模式位置，不破壞其他偏好。
- 不保存 `playing`、目前 phase／遍數、utterance、voice、timer 或句中位置。

### 10.2 備份 schema

- Portable backup 從 schema v2 升為 v3，在 `settings` 加入正規化後的 `listeningPreferences`。
- v1／v2 匯入時自動補預設聆聽偏好；v3 嚴格驗證。
- 匯入 rollback 必須連同聆聽偏好回復。
- `STORAGE_KEYS` 納入聆聽偏好 key。
- Google Drive provider 不需修改；它同步完整 portable backup，因此 v3 偏好會自然進入雲端 snapshot。
- Access token、播放 session 與 timer 永不進入備份。

## 11. 響應式與可用性

- 320、360、390、430、768、1024、1440 px 與手機橫式皆不得水平溢位。
- 桌面播放器限制最大寬度並置中。
- 底部控制列使用 safe-area inset，內容加足夠 bottom padding。
- 上一張、播放／暫停、下一張至少 44×44 CSS px；主播放鍵可更大。
- 所有圖標按鈕有 `aria-label`、tooltip、hover、active、disabled 與 focus-visible。
- 播放狀態、錯誤與目前遍數使用 `aria-live`，但不能每個 timer tick 都重複打擾讀屏。
- 清單抽屜具 focus trap、Escape 關閉及返回原觸發按鈕。
- 系統 `prefers-reduced-motion` 時停用不必要的播放動畫。
- 字體沿用既有受限倍率與 `clamp()` 基準；最大倍率仍不得遮蔽固定控制列。

## 12. 測試與驗收

### 12.1 純函式與狀態機

- 精確驗證主詞 3 遍、例句 2 遍的序列與等待。
- 0～5 clamp、缺例句、兩者皆 0。
- 第一張／最後一張、循環開關、完成後重播。
- 上一張、下一張、跳卡、來源與順序變更。
- 依序穩定排序與固定 seed Fisher–Yates。
- 重播次數播放中增加、降低。
- generation token 阻擋舊 `onend`／`onerror`。
- dispose 後不再觸發狀態變更。

### 12.2 Fake SpeechSynthesis 整合

- play、native pause／resume、cancel、onend。
- mobile／background interruption 從目前這一遍重播。
- 完全 voice、同語系 fallback、voiceschanged timeout。
- onerror 自動重試一次，再進 error。
- 不支援 SpeechSynthesis 的 UI。
- 重載後顯示最後 card ID 並保持暫停。

### 12.3 資料守恆

播放前後逐欄比較：

- `state`
- `interval`
- `easeFactor`
- `failCount`
- `hardCount`
- `introducedDate`
- `lastReviewedDate`
- `todayRating`
- today report

並以 spy／fake 證明沒有呼叫 `DB.commitReview()` 或 `onCardSeen()`。

### 12.4 備份與回歸

- v3 偏好匯出、驗證、匯入與 rollback。
- v1／v2 匯入補預設。
- 非法 localStorage 正規化。
- 完整 Playwright、lint、typecheck／build。
- 現有正式練習、手動 TTS、備份、設定、響應式與雲端同步核心回歸。

### 12.5 真實裝置

- Windows Chrome／Edge：前景連播、暫停、切卡、重播次數。
- Android Chrome／PWA：使用者手勢後前景連播、返回前景恢復。
- iPhone Safari／PWA：前景連播、fallback 重播與版面。
- 離線：裝置語音存在時可用；只有線上 voice 時清楚提示。
- 背景／鎖屏結果只記錄實際表現，不列為必須通過。

## 13. 完成標準

1. 所選清單可依「主詞／片語 N 遍 → 例句 M 遍 → 下一張」連續播放。
2. 播放、暫停、上一張、下一張、依序、隨機、循環、保存與恢復符合本規格。
3. 前景播放在目標平台通過；背景限制有明確提示。
4. 所有倍率與目標 viewport 無遮蔽、重疊或水平溢位。
5. 資料守恆測試證明聆聽不改動 SRS 或報表。
6. 備份 v3 能保存偏好，v1／v2 向後相容。
7. 現有完整自動化、lint 與 production build 通過。

## 14. 可行性結論

此功能適合目前架構，因為現有卡片已具備 `front`、`example`、牌組語言與 Web Speech 語音挑選能力。主要工程難點不是朗讀本身，而是可取消的非同步狀態機、行動瀏覽器背景限制、舊 callback 競態與證明不碰 SRS。

採獨立 `PlaybackController` 與 `SpeechEngine` 可把風險限制在清楚模組中，無需新增後端。只要接受「前景保證、背景最佳努力」，這個 Pilot 具備良好可行性；若未來把可靠鎖屏播放改為硬性需求，才應另案評估預生成音訊或原生 App。
