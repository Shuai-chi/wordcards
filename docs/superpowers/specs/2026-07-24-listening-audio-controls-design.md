# WordForge 連續聆聽：倍速與首選語音設計

**日期：** 2026-07-24  
**狀態：** 使用者已核准  
**關聯規格：** `2026-07-23-continuous-listening-mode-design.md`

## 1. 目標

在既有連續聆聽模式加入全站共用的播放倍速與首選聲音，維持純前端、離線優先、無後端服務及不改動 SRS 進度的架構。

成功條件：

- 倍速提供 `0.5／0.75／0.85／1／1.25／1.5／1.75／2×` 八個固定值。
- 預設顯示與語音引擎實際值皆為 `0.85`。
- 播放中變更倍速不打斷目前語音，從下一遍開始生效。
- 全站只保存一個首選聲音；不相容或不存在時自動使用目前內容語言的最佳聲音。
- 使用者可試聽目前卡片主內容；播放中試聽會中止目前這一遍，試聽後保持暫停。
- 新偏好可重新整理保存、備份還原及透過既有 Google Drive 完整備份同步。
- 正式播放與試聽都不得寫入 cards、reports 或任何 SRS 評分資料。

## 2. 非目標

- 不串接 Google Cloud TTS、Azure Speech、ElevenLabs 或其他外部 TTS API。
- 不提供可下載或內建的跨裝置語音包。
- 不保證不同作業系統存在相同聲音，也不保證背景／鎖屏持續播放。
- 不提供任意小數倍速、音高、音量或每個語言各自保存聲音。
- 不在一般設定新增重複控制；音訊控制只存在於連續聆聽播放器。

## 3. 已核准的產品決策

| 項目 | 決策 |
|---|---|
| 聲音設定範圍 | 全站共用一個首選聲音 |
| 語言不相容 | 自動改用目前內容語言的最佳聲音 |
| 倍速預設 | 顯示 `0.85×`，引擎 `rate = 0.85` |
| 倍速生效時間 | 下一遍朗讀開始時 |
| 倍速選項 | 八個固定值，不提供自由輸入 |
| 聲音清單 | 先顯示目前語言相容聲音，可展開全部 |
| 試聽觸發 | 選擇聲音不打斷；按「試聽」才朗讀 |
| 播放中試聽 | 中止目前這一遍，試聽後保持暫停 |
| UI 位置 | 播放器摘要按鈕＋底部音訊設定抽屜 |
| 技術來源 | 裝置及瀏覽器提供的 Web Speech API 聲音 |

## 4. 使用者介面

### 4.1 播放器摘要

在連續聆聽頁的播放選項與卡片之間加入一個摘要按鈕：

```text
🔊 0.85× · 自動推薦
```

若已選首選聲音，顯示：

```text
🔊 1.25× · Microsoft Ava
```

若首選聲音不支援目前卡片語言，顯示首選名稱並附短提示：

```text
🔊 1.25× · Microsoft Ava
目前使用日文自動備援
```

摘要按鈕必須能換行，不得在 320px 寬度產生水平溢位，點擊範圍至少 44×44px。

### 4.2 音訊設定抽屜

點摘要按鈕後由底部展開抽屜。抽屜包含：

1. **倍速**
   - 八個固定選項。
   - 目前值使用 `aria-pressed="true"`。
   - 變更後立即保存；不取消目前正在朗讀的 utterance。

2. **首選聲音**
   - 第一項固定為「自動推薦」。
   - 預設只列出與目前卡片主要語言相容的聲音。
   - `en-US` 與 `en-GB` 視為同一主要語言；英文與日文不相容。
   - 「顯示全部聲音」展開其他語言，依 `lang` 分組。
   - 每項顯示聲音名稱、語言，並標示本機或可能需要網路（若瀏覽器提供 `localService`）。
   - 已保存但本裝置不存在的聲音保留一個不可選的「目前無法使用」項目，讓使用者理解 fallback 原因。

3. **試聽**
   - 使用目前卡片 front 文字朗讀一次。
   - 使用畫面目前選取的倍速。
   - 有明確首選聲音時，試聽直接使用該聲音；即使它與卡片語言不相容，也讓使用者聽見真實結果。
   - 選擇「自動推薦」時，試聽使用正式播放的語言解析規則。
   - 正式播放中按試聽：取消正式語音、維持相同卡片／階段／遍數，狀態變為暫停；試聽結束後不自動恢復。
   - 再按正式播放時，從被中止的目前這一遍開頭重播。

4. **恢復預設**
   - 將倍速設為 `0.85`、首選聲音設為「自動推薦」。
   - 立即保存，但不打斷目前正式語音。

抽屜沿用播放清單抽屜的互動規則：X、Escape、點擊遮罩皆可關閉；Tab 焦點鎖定在抽屜內；關閉後焦點回到摘要按鈕。

## 5. 資料模型與持久化

擴充既有連續聆聽偏好：

```ts
export const LISTENING_RATE_OPTIONS = [
  0.5, 0.75, 0.85, 1, 1.25, 1.5, 1.75, 2,
] as const;

export type ListeningRate = typeof LISTENING_RATE_OPTIONS[number];

export interface PreferredVoiceV1 {
  voiceURI: string;
  name: string;
  lang: string;
}

export interface ListeningPreferencesV1 {
  // 既有欄位維持不變
  playbackRate: ListeningRate;
  preferredVoice: PreferredVoiceV1 | null;
}
```

相容性規則：

- 舊 localStorage 或舊備份缺少欄位時，補 `playbackRate: 0.85` 與 `preferredVoice: null`。
- `playbackRate` 不在固定清單時回到 `0.85`；不採最近值 clamp，避免被竄改後產生未核准倍速。
- 聲音描述必須三個欄位皆為非空字串，否則整體回到 `null`。
- 保存聲音描述，不保存 `getVoices()` 的陣列索引。
- 既有 `wordforge_listening_preferences_v1` 儲存鍵維持不變；新增欄位為向後相容擴充。
- portable backup schema v3 維持不變；v3 嚴格驗證接受缺失的新欄位作為 legacy，輸出時一律包含正規化後的新欄位。
- v1／v2 portable backup migration 仍先建立完整預設連續聆聽偏好。

## 6. 語音解析與播放流程

### 6.1 語音清單

`BrowserSpeechEngine.prepareVoices()` 繼續負責：

- 立即讀取 `speechSynthesis.getVoices()`。
- 清單為空時監聽 `voiceschanged`，最多等待 3 秒。
- 提供元件訂閱或重新整理清單的入口；聲音安裝、移除或瀏覽器延遲載入後，抽屜可以更新。

### 6.2 正式播放解析順序

每次建立新的 `SpeechSynthesisUtterance` 時才讀取最新偏好：

1. 以 `voiceURI` 尋找首選聲音。
2. 找不到時，以完全相同的 `name + lang` 尋找，處理換裝置後 URI 不同的情況。
3. 首選存在且主要語言與 request `lang` 相同時，將它排在候選第一位。
4. 首選不存在或語言不相容時，沿用目前的同語言候選順序：
   - exact Natural
   - exact Online
   - exact Google
   - 其他 exact language
   - 相同主要語言
   - 瀏覽器預設
5. 第一候選失敗時只允許一次既有 fallback；第二次仍失敗則進入可恢復錯誤。

`SpeechRequest` 增加：

```ts
interface SpeechRequest {
  text: string;
  lang: string;
  rate: ListeningRate;
  preferredVoice: PreferredVoiceV1 | null;
  fallbackAttempt: 0 | 1;
  forcePreferredVoice?: boolean;
}
```

正式播放的 `forcePreferredVoice` 為 `false`；試聽明確聲音時為 `true`。

### 6.3 倍速生效

- `BrowserSpeechEngine` 不再硬編碼 `utterance.rate = 0.85`，改用 request `rate`。
- controller 正在播放時，偏好變更只更新下一次 request。
- 目前 utterance 不 cancel、不重建，確保「下一遍生效」。

### 6.4 試聽狀態

`PlaybackController` 增加明確的試聽入口，不讓 React 元件直接操作全域 speech queue：

```ts
previewCurrent(options: {
  rate: ListeningRate;
  preferredVoice: PreferredVoiceV1 | null;
}): void;
```

行為：

- 先 invalidate 現有 utterance 與 timer，防止舊 `onend` 推進清單。
- 保留 `cardIndex、phase、repeatIndex、repeatTotal`。
- 狀態改為 `previewing`；試聽結束後改為 `paused`。
- 試聽錯誤只更新 preview error，不進入正式播放的自動 fallback 迴圈。
- 試聽期間按正式播放會取消試聽，從目前這一遍開頭開始。
- 試聽不呼叫任何 DB 寫入方法。

## 7. 錯誤與平台邊界

- 語音清單載入中顯示進度，不使用空白 select。
- 3 秒後仍無清單：保留自動推薦並顯示「目前無法取得聲音清單」，原有播放仍可交給瀏覽器預設 voice。
- 首選聲音消失：設定描述不刪除，顯示「目前無法使用」並正式 fallback。
- offline voice 失敗：依候選順序嘗試同語言其他 voice；兩次失敗後使用既有重試／跳卡／返回錯誤 UI。
- `localService` 只作提示，不能保證聲音一定完全離線。
- 背景、鎖屏及系統休眠限制維持現行規格。
- Web Speech API 允許應用程式指定 `rate` 與 `getVoices()` 回傳的 voice，但可用聲音及實際速率上限由瀏覽器／語音引擎決定：
  https://webaudio.github.io/web-speech-api/

## 8. 元件與模組邊界

預計修改：

- `src/lib/listeningPreferences.ts`
  - 倍速清單、首選聲音 schema、正規化與嚴格驗證。
- `src/lib/speechEngine.ts`
  - voice descriptor 解析、rate request、強制試聽 voice 與清單取得。
- `src/lib/playbackController.ts`
  - 下一遍取用新偏好、previewing 狀態與競態取消。
- `src/components/ListeningAudioDrawer.tsx`
  - 新增；只負責抽屜呈現、voice 分組、倍速選項與可及操作。
- `src/components/ListeningMode.tsx`
  - 摘要、抽屜開關、偏好持久化與 controller 事件接線。
- `src/lib/listeningStrings.ts`
  - 八語音訊設定文案。
- `src/lib/backup.ts`
  - 新欄位 strict validation、legacy default 與 rollback 回歸。
- `src/index.css`
  - 摘要按鈕、底部抽屜、倍速網格、voice list 與直橫式響應式。

不修改：

- SRS 評分演算法。
- cards／reports 資料結構。
- Google Drive provider 與同步衝突演算法。
- 正式練習的手動 TTS 介面；它可繼續使用既有自動 voice 與固定行為。

## 9. 測試與驗收矩陣

### 9.1 偏好與備份

- 八個倍速全部合法；其他數字、NaN、字串回到 `0.85`。
- 首選聲音三欄缺一即回到 null。
- localStorage 重新整理保存倍速與首選聲音。
- 舊偏好／v1／v2／舊 v3 備份補安全預設。
- 新 v3 備份 round-trip 新欄位；非法值嚴格拒絕。
- 匯入 storage 寫入失敗時回復舊音訊偏好。

### 9.2 語音引擎

- 同語言首選聲音排在 Natural 自動候選之前。
- 不相容首選聲音不進入正式候選。
- URI 不存在時可用 `name + lang` 找回同一聲音。
- 正式 fallback 與試聽強制 voice 行為分離。
- request rate 原值寫入 utterance；不做額外倍率換算。
- voiceschanged 與 3 秒 timeout 都能結束載入。

### 9.3 播放狀態

- 變更倍速不取消目前 utterance；下一遍使用新 rate。
- 播放中試聽會使舊 callback 失效，試聽後停在相同卡片／階段／遍數。
- 試聽期間按播放會取消試聽並重播目前這一遍。
- next／previous／離開頁面／visibility rebuild 後，舊試聽 callback 不得改變狀態。

### 9.4 UI 與資料守恆

- 摘要、倍速選項、相容聲音、顯示全部、不可用首選、試聽及恢復預設。
- 抽屜 X／Escape／遮罩、focus trap 與焦點還原。
- 320、390、430、768、1024、1440px 及手機橫式無水平溢位。
- 所有主要操作至少 44×44px。
- 正式播放、變速、選聲音與試聽前後的 cards/reports 快照完全相同。
- 完整 Playwright、lint、TypeScript build、production build 與 `git diff --check`。

## 10. 人工平台驗收

- Windows Chrome／Edge：確認聲音清單差異、八個倍速、首選與 fallback。
- Android Chrome／PWA：確認 voice list 延遲、online/local 標示及背景回前景。
- iPhone Safari／PWA：確認 voice list、試聽需使用者手勢、鎖屏後中斷恢復。
- 換瀏覽器 Profile 或裝置：首選不存在時顯示原名稱並自動 fallback，不阻止播放。
- 斷網：本機 voice 正常；online voice 失敗後能恢復，不產生無限重試。

## 11. 明確不確定性與處理

本規格所有產品選項均已確認。裝置實際提供哪些聲音、`localService` 是否真能離線，以及背景播放是否持續屬於平台觀察值，不是實作可保證的結果；UI 必須如實呈現 fallback 與錯誤，不能宣稱跨裝置聲音一致。
