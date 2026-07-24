# WordForge 連續聆聽模式實作計畫

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推薦）或 superpowers:executing-plans 逐任務實作此計畫。步驟使用復選框（`- [ ]`）語法追蹤進度。

**目標：** 新增不修改 SRS 進度的獨立連續聆聽模式，依「主詞／片語 N 遍 → 例句 M 遍 → 下一張」播放，並支援暫停、切卡、依序／隨機、循環、偏好保存與備份。

**架構：** 以純函式 `listeningPlaylist` 建立清單、`SpeechEngine` 隔離 Web Speech API、`PlaybackController` 作為唯一播放狀態真相，React 元件只訂閱狀態並呈現 UI。正式練習與聆聽共用今日候選規則，但聆聽模組沒有任何 review 寫入介面；偏好存入 localStorage，並透過 portable backup v3 自然進入既有 Google Drive 完整快照。

**技術棧：** React 19、TypeScript 6、Vite 8、Web Speech API、IndexedDB、localStorage、Lucide React、Playwright。

**核准規格：** `docs/superpowers/specs/2026-07-23-continuous-listening-mode-design.md`

**工作樹限制：** 目前 `feature/wordforge-local-backup` 是多 Agent 共用 dirty worktree，且 `App.tsx`、`Dashboard.tsx`、`LearningView.tsx`、`backup.ts`、`index.css` 已含先前未提交成果。執行時不得 reset、checkout、清除或一次 stage 整檔；先依 CORE 規則建立日期備份，逐檔外科式修改。除非使用者先建立乾淨隔離 worktree，否則本計畫的「checkpoint」只執行測試與 `git diff --check`，不自動 commit／push。

---

## 一、檔案結構與責任

### 新增

- `src/lib/listeningPreferences.ts`
  - 聆聽偏好 schema、預設值、嚴格驗證、localStorage 正規化、seed 與最後位置更新。
- `src/lib/practiceQueue.ts`
  - 從現有 `Dashboard.handleStart()` 抽出的今日候選桶與每日預算純函式。
- `src/lib/listeningPlaylist.ts`
  - 今日／全部來源、穩定排序、固定 seed Fisher–Yates、最後位置解析。
- `src/lib/speechEngine.ts`
  - Web Speech API adapter、voice 排序、3 秒 voices 載入等待、pause／resume／cancel。
- `src/lib/playbackController.ts`
  - 可取消的播放狀態機、generation token、timer、重播／循環／錯誤降級。
- `src/lib/listeningStrings.ts`
  - 八種現有 UI 語言的播放器文案，避免擴張既有大型 `UIStrings` 介面。
- `src/components/ListeningMode.tsx`
  - 全頁播放器、偏好控制、固定底部 transport、錯誤與平台提示。
- `src/components/ListeningQueueDrawer.tsx`
  - 可及的播放清單抽屜、焦點管理、Escape 關閉。
- `tests/listening-preferences.spec.ts`
- `tests/listening-playlist.spec.ts`
- `tests/speech-engine.spec.ts`
- `tests/playback-controller.spec.ts`
- `tests/listening-mode.spec.ts`
- `tests/listening-srs-invariants.spec.ts`
- `tests/helpers/listening.ts`
  - 播放器 E2E 共用的 IndexedDB fixture、fake SpeechSynthesis、進入模式與資料快照 helper。
- `docs/continuous-listening-manual-qa.md`

### 修改

- `src/components/Dashboard.tsx`
  - 改用共用今日佇列規則，新增「進入聆聽模式」入口；既有正式練習抽取結果保持同語意。
- `src/components/LearningView.tsx`
  - 手動與自動朗讀改用共用 voice resolver／SpeechEngine，卡片畫面與評分流程不重寫。
- `src/App.tsx`
  - 新增 `listening` view、保存進入時的牌組 ID、返回 dashboard、偏好變更通知雲端快照。
- `src/lib/backup.ts`
  - portable backup v2 → v3，納入正規化後的聆聽偏好，支援 v1／v2 migration 與 rollback。
- `src/index.css`
  - 播放器、抽屜、fixed transport、safe-area、橫直式與 reduced-motion 樣式。
- `tests/backup.spec.ts`
  - v3 round-trip、v1／v2 migration、非法 v3、rollback。
- `tests/responsive-ui.spec.ts`
  - 320～1440 px、手機橫式、固定列不遮蔽、無水平溢位。
- `README.md`
- `docs/i18n/README-en.md`
- `CHANGELOG.md`
  - 使用方式、資料不計入 SRS、背景／鎖屏限制與驗收說明。

---

## 任務 1：偏好 schema 與本機持久化

**檔案：**

- 建立：`src/lib/listeningPreferences.ts`
- 建立：`tests/listening-preferences.spec.ts`

- [ ] **步驟 1：先寫會失敗的正規化與持久化測試**

```ts
import { expect, test } from '@playwright/test';
import {
  LISTENING_PREFERENCES_STORAGE_KEY,
  createDefaultListeningPreferences,
  normalizeListeningPreferences,
  readListeningPreferences,
  saveListeningPreferences,
} from '../src/lib/listeningPreferences';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

test('defaults to a paused-safe 1/1 sequential today configuration', () => {
  expect(createDefaultListeningPreferences('2026-07-23T00:00:00.000Z')).toEqual({
    schemaVersion: 1,
    source: 'today',
    order: 'sequential',
    loopPlaylist: false,
    frontRepeats: 1,
    exampleRepeats: 1,
    shuffleSeedByMode: {},
    lastCardIdByMode: {},
    updatedAt: '2026-07-23T00:00:00.000Z',
  });
});

test('clamps counts and repairs invalid localStorage fields', () => {
  const normalized = normalizeListeningPreferences({
    schemaVersion: 1,
    source: 'broken',
    order: 'broken',
    loopPlaylist: 'yes',
    frontRepeats: 99,
    exampleRepeats: -3,
    shuffleSeedByMode: { vocab: 8, phrase: 'phrase-seed' },
    lastCardIdByMode: { vocab: 'card-1', phrase: false },
    updatedAt: 'invalid',
  }, '2026-07-23T01:00:00.000Z');

  expect(normalized).toMatchObject({
    source: 'today',
    order: 'sequential',
    loopPlaylist: false,
    frontRepeats: 5,
    exampleRepeats: 0,
    shuffleSeedByMode: { phrase: 'phrase-seed' },
    lastCardIdByMode: { vocab: 'card-1' },
    updatedAt: '2026-07-23T01:00:00.000Z',
  });
});

test('reads malformed JSON as defaults and saves normalized values', () => {
  const storage = new MemoryStorage();
  storage.setItem(LISTENING_PREFERENCES_STORAGE_KEY, '{bad json');
  expect(readListeningPreferences(storage).frontRepeats).toBe(1);

  saveListeningPreferences({ ...createDefaultListeningPreferences(), frontRepeats: 8 }, storage);
  expect(JSON.parse(storage.getItem(LISTENING_PREFERENCES_STORAGE_KEY)!))
    .toMatchObject({ frontRepeats: 5, schemaVersion: 1 });
});
```

- [ ] **步驟 2：執行測試，確認因模組尚不存在而失敗**

執行：

```bash
npx playwright test tests/listening-preferences.spec.ts --project=chromium --retries=0
```

預期：FAIL，錯誤包含 `Cannot find module '../src/lib/listeningPreferences'`。

- [ ] **步驟 3：實作單一 schema 與 storage adapter**

建立以下公開介面；所有數字限制只存在此檔，不在元件重複硬編碼：

```ts
import type { DeckType } from './types';

export const LISTENING_PREFERENCES_STORAGE_KEY = 'wordforge_listening_preferences_v1';
export const LISTENING_REPEAT_MIN = 0;
export const LISTENING_REPEAT_MAX = 5;

export interface ListeningPreferencesV1 {
  schemaVersion: 1;
  source: 'today' | 'all';
  order: 'sequential' | 'shuffle';
  loopPlaylist: boolean;
  frontRepeats: number;
  exampleRepeats: number;
  shuffleSeedByMode: Partial<Record<DeckType, string>>;
  lastCardIdByMode: Partial<Record<DeckType, string>>;
  updatedAt: string;
}

export function createDefaultListeningPreferences(
  now = new Date().toISOString(),
): ListeningPreferencesV1;

export function normalizeListeningPreferences(
  raw: unknown,
  now = new Date().toISOString(),
): ListeningPreferencesV1;

export function assertValidListeningPreferences(
  raw: unknown,
): asserts raw is ListeningPreferencesV1;

export function readListeningPreferences(
  storage: Storage = window.localStorage,
): ListeningPreferencesV1;

export function saveListeningPreferences(
  value: ListeningPreferencesV1,
  storage: Storage = window.localStorage,
): ListeningPreferencesV1;

export function createPlaylistSeed(
  mode: DeckType,
  source: ListeningPreferencesV1['source'],
  selectedDeckIds: string[],
): string;

export function setLastListeningCard(
  value: ListeningPreferencesV1,
  mode: DeckType,
  cardId: string | undefined,
): ListeningPreferencesV1;
```

`createPlaylistSeed()` 使用 `crypto.getRandomValues()`；若 API 不存在則結合 `Date.now()` 與 `Math.random()`。seed 字串包含 `mode`、`source` 與排序後牌組 ID 的穩定 fingerprint，使牌組集合改變時能辨識 context，重新整理同一 context 時仍保留既有 seed。

- [ ] **步驟 4：重跑偏好測試**

執行：

```bash
npx playwright test tests/listening-preferences.spec.ts --project=chromium --retries=0
```

預期：3 passed。

- [ ] **步驟 5：Checkpoint**

執行：

```bash
git diff --check -- src/lib/listeningPreferences.ts tests/listening-preferences.spec.ts
```

預期：無輸出、exit code 0。共享 dirty worktree 不 commit。

---

## 任務 2：共用今日候選規則與確定性播放清單

**檔案：**

- 建立：`src/lib/practiceQueue.ts`
- 建立：`src/lib/listeningPlaylist.ts`
- 建立：`tests/listening-playlist.spec.ts`
- 修改：`src/components/Dashboard.tsx:53-165`

- [ ] **步驟 1：寫今日預算、依序與固定隨機測試**

測試資料必須涵蓋 `learning`、`relearning`、到期／未到期 `graduated`、已達牌組新卡上限、全域剩餘預算及今天已複習 fallback。核心斷言：

```ts
const deckA: Deck = {
  id: 'deck-a',
  name: 'A',
  newCardLimit: 20,
  language: 'en',
  deckType: 'vocab',
};
const deckB: Deck = { ...deckA, id: 'deck-b', name: 'B' };

function card(id: string, state: Card['state'], overrides: Partial<Card> = {}): Card {
  return {
    id,
    deckId: 'deck-a',
    group: 'Test',
    front: id,
    back: `${id}-back`,
    state,
    interval: 0,
    easeFactor: 2.5,
    failCount: 0,
    hardCount: 0,
    introducedDate: '',
    lastReviewedDate: '',
    ...overrides,
  };
}

const deckCardSets: DeckCardSet[] = [{
  deck: deckA,
  cards: [
    card('learning-1', 'learning'),
    card('relearning-1', 'relearning'),
    card('due-1', 'graduated', { interval: 3, lastReviewedDate: '2026-07-20' }),
    card('due-2', 'graduated', { interval: 1, lastReviewedDate: '2026-07-22' }),
    card('future-1', 'graduated', { interval: 30, lastReviewedDate: '2026-07-22' }),
    card('new-allowed-1', 'new'),
  ],
}];
const reviewedOnlySets: DeckCardSet[] = [{
  deck: deckA,
  cards: [card('reviewed-today', 'graduated', {
    interval: 30,
    lastReviewedDate: '2026-07-23',
  })],
}];
const mixedDeckSets: DeckCardSet[] = [
  { deck: deckA, cards: [card('card-10', 'new'), card('card-2', 'new')] },
  { deck: deckB, cards: [card('card-1', 'new', { deckId: 'deck-b' })] },
];
const baseInput: BuildListeningPlaylistInput = {
  source: 'all',
  order: 'sequential',
  deckCardSets: mixedDeckSets,
  globalLimit: 30,
  today: '2026-07-23',
  seed: 'fixed-seed',
};

test('today queue keeps urgent cards outside the global budget and spends budget on due before new', () => {
  const candidates = collectTodayQueueCandidates(deckCardSets, 3, '2026-07-23');
  const queue = materializeTodayQueue(candidates, items => [...items]);
  expect(queue.map(card => card.id)).toEqual([
    'learning-1',
    'relearning-1',
    'due-1',
    'due-2',
    'new-allowed-1',
  ]);
});

test('falls back to cards reviewed today only when no pending card exists', () => {
  const candidates = collectTodayQueueCandidates(reviewedOnlySets, 30, '2026-07-23');
  expect(materializeTodayQueue(candidates, items => [...items]).map(card => card.id))
    .toEqual(['reviewed-today']);
});

test('sequential ordering is stable and seeded shuffle survives reload', () => {
  const sequential = buildListeningPlaylist({
    source: 'all',
    order: 'sequential',
    deckCardSets: mixedDeckSets,
    globalLimit: 30,
    today: '2026-07-23',
    seed: 'vocab:all:deck-a,deck-b:fixed',
  });
  const first = buildListeningPlaylist({ ...baseInput, order: 'shuffle', seed: 'fixed-seed' });
  const second = buildListeningPlaylist({ ...baseInput, order: 'shuffle', seed: 'fixed-seed' });
  expect(sequential.map(item => item.card.id)).toEqual(['card-2', 'card-10', 'card-1']);
  expect(second.map(item => item.card.id)).toEqual(first.map(item => item.card.id));
  expect(new Set(first.map(item => item.card.id)).size).toBe(first.length);
});
```

- [ ] **步驟 2：執行測試，確認缺少模組**

```bash
npx playwright test tests/listening-playlist.spec.ts --project=chromium --retries=0
```

預期：FAIL，缺少 `practiceQueue` 或 `listeningPlaylist`。

- [ ] **步驟 3：建立今日候選與 materialize 介面**

```ts
export interface DeckCardSet {
  deck: Deck;
  cards: Card[];
}

export interface TodayQueueCandidates {
  urgent: Card[];
  due: Card[];
  newByDeck: Array<{ deckId: string; slots: number; cards: Card[] }>;
  reviewedToday: Card[];
  remainingGlobalBudget: number;
}

export function collectTodayQueueCandidates(
  deckCardSets: DeckCardSet[],
  globalLimit: number,
  today: string,
): TodayQueueCandidates;

export function materializeTodayQueue(
  candidates: TodayQueueCandidates,
  randomize: <T>(items: T[]) => T[],
): Card[];
```

`materializeTodayQueue()` 的精確順序為：全部 urgent → 在全域剩餘預算內取 due → 先遵守每個牌組 slots，再用剩餘全域預算取 new；三個桶各由呼叫端提供的 `randomize` 決定順序。只有三個桶全空時才回傳 `reviewedToday`。

- [ ] **步驟 4：建立聆聽清單純函式**

```ts
export interface ListeningPlaylistItem {
  card: Card;
  deck: Deck;
  ttsLang: string;
}

export interface BuildListeningPlaylistInput {
  source: 'today' | 'all';
  order: 'sequential' | 'shuffle';
  deckCardSets: DeckCardSet[];
  globalLimit: number;
  today: string;
  seed: string;
}

export function createSeededShuffle(seed: string): <T>(items: T[]) => T[];
export function sortCardsSequentially(
  items: ListeningPlaylistItem[],
  deckOrder: string[],
): ListeningPlaylistItem[];
export function buildListeningPlaylist(
  input: BuildListeningPlaylistInput,
): ListeningPlaylistItem[];
export function resolveInitialPlaylistIndex(
  items: ListeningPlaylistItem[],
  lastCardId?: string,
): number;
```

卡片 ID 尾端數字以自然數排序；解析失敗時以完整 ID 排序。TTS 語言從 `LANG_CONFIGS[deck.language].ttsLang` 取得，未知語言回退 `en-US`。

- [ ] **步驟 5：讓正式練習改用同一今日候選規則**

在 `Dashboard.handleStart()` 中先載入 `DeckCardSet[]`，再呼叫：

```ts
const candidates = collectTodayQueueCandidates(deckCardSets, globalLimit, getTodayStr());
const queue = materializeTodayQueue(candidates, shuffleArray);
if (queue.length > 0) onStartSession(queue);
```

`calcBudget()` 也改由 `TodayQueueCandidates` 計算，避免 UI 預估與正式抽卡再次漂移。不要變更 `toggleDeck()`、刪除牌組、牌組進度或統計資料邏輯。

- [ ] **步驟 6：重跑清單與既有 dashboard 響應式測試**

```bash
npx playwright test tests/listening-playlist.spec.ts tests/responsive-ui.spec.ts --project=chromium --retries=0
```

預期：新清單測試與既有 responsive 測試全部通過。

- [ ] **步驟 7：Checkpoint**

```bash
git diff --check -- src/lib/practiceQueue.ts src/lib/listeningPlaylist.ts src/components/Dashboard.tsx tests/listening-playlist.spec.ts
```

預期：無輸出、exit code 0。

---

## 任務 3：共用 SpeechEngine 與現有手動 TTS 回歸

**檔案：**

- 建立：`src/lib/speechEngine.ts`
- 建立：`tests/speech-engine.spec.ts`
- 修改：`src/components/LearningView.tsx:76-131,612-628,778-785`

- [ ] **步驟 1：寫 voice 排序、timeout、cancel 與 pause／resume 測試**

```ts
function voice(name: string, lang: string): SpeechSynthesisVoice {
  return { name, lang, default: false, localService: true, voiceURI: name };
}

class FakeTimers {
  private nextId = 1;
  private now = 0;
  private tasks = new Map<number, { at: number; callback: () => void }>();
  setTimeout = (callback: () => void, delay: number) => {
    const id = this.nextId++;
    this.tasks.set(id, { at: this.now + delay, callback });
    return id;
  };
  clearTimeout = (id: number) => { this.tasks.delete(id); };
  advanceBy(ms: number) {
    this.now += ms;
    for (const [id, task] of [...this.tasks]) {
      if (task.at <= this.now) {
        this.tasks.delete(id);
        task.callback();
      }
    }
  }
}

class FakeUtterance {
  lang = '';
  rate = 1;
  pitch = 1;
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  constructor(readonly text: string) {}
}

class FakeSpeechSynthesis {
  speaking = false;
  pending = false;
  paused = false;
  lastUtterance: FakeUtterance | null = null;
  private listeners = new Set<() => void>();
  constructor(private voices: SpeechSynthesisVoice[]) {}
  getVoices = () => this.voices;
  speak = (utterance: FakeUtterance) => {
    this.lastUtterance = utterance;
    this.speaking = true;
  };
  cancel = () => { this.speaking = false; this.pending = false; };
  pause = () => { this.paused = true; };
  resume = () => { this.paused = false; };
  addEventListener = (_name: 'voiceschanged', listener: () => void) => this.listeners.add(listener);
  removeEventListener = (_name: 'voiceschanged', listener: () => void) => this.listeners.delete(listener);
  installVoices(next: SpeechSynthesisVoice[]) {
    this.voices = next;
    this.listeners.forEach(listener => listener());
  }
}

const voices = [
  voice('English Local', 'en-GB'),
  voice('Google US English', 'en-US'),
  voice('English Online', 'en-US'),
  voice('English Natural', 'en-US'),
];

test('orders exact Natural, Online, Google, same-language and browser-default voices', () => {
  expect(resolveVoiceCandidates(voices, 'en-US').map(voice => voice.name)).toEqual([
    'English Natural',
    'English Online',
    'Google US English',
    'English Local',
  ]);
});

test('waits at most 3000ms for voiceschanged then allows browser default voice', async () => {
  const synth = new FakeSpeechSynthesis([]);
  const timers = new FakeTimers();
  const engine = new BrowserSpeechEngine(synth, text => new FakeUtterance(text), timers);
  const pending = engine.prepareVoices();
  let resolved = false;
  void pending.then(() => { resolved = true; });
  await Promise.resolve();
  timers.advanceBy(2999);
  expect(resolved).toBe(false);
  timers.advanceBy(1);
  await expect(pending).resolves.toEqual([]);
});

test('cancel invalidates old utterance callbacks and pause resumes only active speech', () => {
  const synth = new FakeSpeechSynthesis(voices);
  const engine = new BrowserSpeechEngine(synth, text => new FakeUtterance(text), new FakeTimers());
  const events: string[] = [];
  engine.speak({ text: 'hello', lang: 'en-US', fallbackAttempt: 0 }, {
    onEnd: () => events.push('end'),
    onError: () => events.push('error'),
  });
  const oldUtterance = synth.lastUtterance;
  engine.cancel();
  oldUtterance?.onend?.();
  expect(events).toEqual([]);
  expect(engine.pause()).toBe('interrupted');
});
```

- [ ] **步驟 2：確認測試因模組不存在而失敗**

```bash
npx playwright test tests/speech-engine.spec.ts --project=chromium --retries=0
```

預期：FAIL，缺少 `speechEngine`。

- [ ] **步驟 3：實作可注入的 adapter**

```ts
export interface SpeechRequest {
  text: string;
  lang: string;
  fallbackAttempt: 0 | 1;
}

export interface SpeechEvents {
  onEnd: () => void;
  onError: (error: string) => void;
}

export interface SpeechUtteranceLike {
  text: string;
  lang: string;
  rate: number;
  pitch: number;
  voice: SpeechSynthesisVoice | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}

export interface SpeechSynthesisLike {
  speaking: boolean;
  pending: boolean;
  paused: boolean;
  getVoices(): SpeechSynthesisVoice[];
  speak(utterance: SpeechUtteranceLike): void;
  cancel(): void;
  pause(): void;
  resume(): void;
  addEventListener(name: 'voiceschanged', listener: () => void): void;
  removeEventListener(name: 'voiceschanged', listener: () => void): void;
}

export interface SpeechEnginePort {
  isSupported(): boolean;
  prepareVoices(): Promise<SpeechSynthesisVoice[]>;
  speak(request: SpeechRequest, events: SpeechEvents): void;
  pause(): 'paused' | 'interrupted';
  resume(): 'resumed' | 'interrupted';
  cancel(): void;
  isActive(): boolean;
  dispose(): void;
}

export function resolveVoiceCandidates(
  voices: SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice[];

export class BrowserSpeechEngine implements SpeechEnginePort {
  constructor(
    synth?: SpeechSynthesisLike,
    createUtterance?: (text: string) => SpeechUtteranceLike,
    timers?: { setTimeout: typeof window.setTimeout; clearTimeout: typeof window.clearTimeout },
  );
}
```

每個 `speak()` 都建立獨立 utterance，`rate=0.85`、`pitch=1.0`。`fallbackAttempt=0` 使用第一候選；`1` 使用下一個不同候選，沒有候選時不指定 voice。adapter 內部以 generation 避免 cancel 後舊 callback 外洩。

`speak()` 內部先呼叫 `prepareVoices()`；等待期間也視為 active。`cancel()` 在 voice Promise resolve 前遞增 generation，因此被取消的準備工作不得再呼叫瀏覽器 `speak()`。模組載入時不得直接讀取 `window`，production 預設依賴只在 `BrowserSpeechEngine` constructor 執行時建立，確保 Playwright 的 Node 測試可直接 import 純函式。

- [ ] **步驟 4：將 LearningView 的 `useTTS()` 改用共用 adapter**

保留現有 hook 介面 `{ speak, audioError }`，但移除元件內重複的 voice 搜尋。hook 首次 render 建立 `BrowserSpeechEngine`，unmount 時 `dispose()`；每次手動或自動播放先 `cancel()` 再 `speak()`。不要改 `handleRate()`、鍵盤評分、卡片欄位或答案呈現。

- [ ] **步驟 5：重跑語音與正式練習 smoke**

```bash
npx playwright test tests/speech-engine.spec.ts tests/learning-smoke.spec.ts --project=chromium --retries=0
```

預期：全部通過，正式練習仍可進入、翻面與評分。

- [ ] **步驟 6：Checkpoint**

```bash
git diff --check -- src/lib/speechEngine.ts src/components/LearningView.tsx tests/speech-engine.spec.ts
```

預期：無輸出、exit code 0。

---

## 任務 4：可取消 PlaybackController 狀態機

**檔案：**

- 建立：`src/lib/playbackController.ts`
- 建立：`tests/playback-controller.spec.ts`

- [ ] **步驟 1：先寫 3/2 序列、循環、暫停與競態測試**

```ts
class FakeSpeechEngine implements SpeechEnginePort {
  requests: SpeechRequest[] = [];
  currentEvents: SpeechEvents | null = null;
  active = false;
  isSupported = () => true;
  prepareVoices = async () => [];
  speak(request: SpeechRequest, events: SpeechEvents) {
    this.requests.push(request);
    this.currentEvents = events;
    this.active = true;
  }
  pause = (): 'paused' | 'interrupted' => this.active ? 'paused' : 'interrupted';
  resume = (): 'resumed' | 'interrupted' => this.active ? 'resumed' : 'interrupted';
  cancel() { this.active = false; this.currentEvents = null; }
  isActive = () => this.active;
  dispose() { this.cancel(); }
  finish() {
    const events = this.currentEvents;
    this.active = false;
    events?.onEnd();
  }
  fail(code: string) {
    const events = this.currentEvents;
    this.active = false;
    events?.onError(code);
  }
  captureEnd() {
    const callback = this.currentEvents?.onEnd ?? (() => undefined);
    return callback;
  }
}

class FakeScheduler implements PlaybackScheduler {
  private nextId = 1;
  private tasks = new Map<number, { delay: number; callback: () => void }>();
  setTimeout(callback: () => void, delayMs: number) {
    const id = this.nextId++;
    this.tasks.set(id, { delay: delayMs, callback });
    return id;
  }
  clearTimeout(id: number) { this.tasks.delete(id); }
  advanceBy(delayMs: number) {
    for (const [id, task] of [...this.tasks]) {
      if (task.delay === delayMs) {
        this.tasks.delete(id);
        task.callback();
      }
    }
  }
}

function createHarness(overrides: Partial<ListeningPreferencesV1> = {}) {
  const speech = new FakeSpeechEngine();
  const scheduler = new FakeScheduler();
  const deck: Deck = {
    id: 'deck-a',
    name: 'A',
    newCardLimit: 20,
    language: 'en',
    deckType: 'vocab',
  };
  const makeCard = (id: string, front: string, example: string): Card => ({
    id,
    deckId: deck.id,
    group: 'Test',
    front,
    back: `${front}-back`,
    example,
    state: 'new',
    interval: 0,
    easeFactor: 2.5,
    failCount: 0,
    hardCount: 0,
    introducedDate: '',
    lastReviewedDate: '',
  });
  const preferences = {
    ...createDefaultListeningPreferences('2026-07-23T00:00:00.000Z'),
    ...overrides,
  };
  const items: ListeningPlaylistItem[] = [
    { card: makeCard('card-1', 'apple', 'An apple a day.'), deck, ttsLang: 'en-US' },
    { card: makeCard('card-2', 'banana', 'A yellow banana.'), deck, ttsLang: 'en-US' },
  ];
  const controller = new PlaybackController(speech, scheduler, preferences);
  controller.setPlaylist(items);
  return { controller, speech, scheduler };
}

test('plays front three times, example twice, then advances after exact gaps', () => {
  const { controller, speech, scheduler } = createHarness({
    frontRepeats: 3,
    exampleRepeats: 2,
  });
  controller.play();
  speech.finish(); scheduler.advanceBy(500);
  speech.finish(); scheduler.advanceBy(500);
  speech.finish(); scheduler.advanceBy(500);
  speech.finish(); scheduler.advanceBy(500);
  speech.finish(); scheduler.advanceBy(1000);
  expect(speech.requests.map(request => request.text)).toEqual([
    'apple', 'apple', 'apple', 'An apple a day.', 'An apple a day.', 'banana',
  ]);
});

test('skips missing examples and excludes every card when both repeat counts are zero', () => {
  const { controller } = createHarness({ frontRepeats: 0, exampleRepeats: 0 });
  expect(controller.getSnapshot()).toMatchObject({ status: 'ready', playableCount: 0 });
  controller.play();
  expect(controller.getSnapshot().status).toBe('ready');
});

test('old onend cannot advance after next, playlist rebuild or dispose', () => {
  const { controller, speech } = createHarness();
  controller.play();
  const staleEnd = speech.captureEnd();
  controller.next();
  staleEnd();
  expect(controller.getSnapshot()).toMatchObject({ cardIndex: 1, phase: 'front', repeatIndex: 1 });
  controller.dispose();
  speech.finish();
  expect(controller.getSnapshot().status).toBe('idle');
});

test('retries current repetition once with fallback then enters recoverable error', () => {
  const { controller, speech } = createHarness();
  controller.play();
  speech.fail('voice-unavailable');
  expect(speech.requests.at(-1)?.fallbackAttempt).toBe(1);
  speech.fail('voice-unavailable');
  expect(controller.getSnapshot()).toMatchObject({ status: 'error', repeatIndex: 1 });
  controller.retry();
  expect(speech.requests.at(-1)?.text).toBe('apple');
});
```

另加：首／尾上一張下一張、loop 開關、completed 再播放、播放中修改次數、native pause／resume、interrupted 重播目前遍數、來源重建保留 card ID、dispose 清 timer。

- [ ] **步驟 2：確認狀態機測試失敗**

```bash
npx playwright test tests/playback-controller.spec.ts --project=chromium --retries=0
```

預期：FAIL，缺少 `playbackController`。

- [ ] **步驟 3：建立公開狀態與依賴介面**

```ts
export type PlaybackStatus =
  | 'idle' | 'ready' | 'playing' | 'paused' | 'waiting'
  | 'completed' | 'interrupted' | 'error';
export type PlaybackPhase = 'front' | 'example';

export interface PlaybackSnapshot {
  status: PlaybackStatus;
  items: ListeningPlaylistItem[];
  playableCount: number;
  cardIndex: number;
  phase: PlaybackPhase;
  repeatIndex: number;
  repeatTotal: number;
  waitingFor: 'repeat' | 'next-card' | null;
  error: string | null;
}

export interface PlaybackScheduler {
  setTimeout(callback: () => void, delayMs: number): number;
  clearTimeout(id: number): void;
}

export class PlaybackController {
  constructor(
    speech: SpeechEnginePort,
    scheduler: PlaybackScheduler,
    preferences: ListeningPreferencesV1,
  );
  subscribe(listener: (snapshot: PlaybackSnapshot) => void): () => void;
  getSnapshot(): PlaybackSnapshot;
  setPlaylist(items: ListeningPlaylistItem[], preferredCardId?: string): void;
  setPreferences(preferences: ListeningPreferencesV1): void;
  play(): void;
  pause(): void;
  previous(): void;
  next(): void;
  jumpTo(index: number): void;
  retry(): void;
  skipCard(): void;
  handleVisibilityReturn(): void;
  dispose(): void;
}
```

- [ ] **步驟 4：實作 generation、timer 與動態下一段規則**

每次 cancel、切卡、重建清單或 dispose 都先遞增 generation。語音 callback 只在捕獲 generation 等於目前值時工作。等待 500 ms 用於同卡內容與 front→example，等待 1,000 ms 用於換卡。次數改變後不取消正在播放的 utterance，`onend` 才依新值計算下一段。

- [ ] **步驟 5：重跑完整狀態機測試**

```bash
npx playwright test tests/playback-controller.spec.ts --project=chromium --retries=0
```

預期：所有狀態機案例通過。

- [ ] **步驟 6：Checkpoint**

```bash
git diff --check -- src/lib/playbackController.ts tests/playback-controller.spec.ts
```

預期：無輸出、exit code 0。

---

## 任務 5：八語文案、全頁播放器與清單抽屜

**檔案：**

- 建立：`src/lib/listeningStrings.ts`
- 建立：`src/components/ListeningQueueDrawer.tsx`
- 建立：`src/components/ListeningMode.tsx`
- 建立：`tests/helpers/listening.ts`
- 建立：`tests/listening-mode.spec.ts`

- [ ] **步驟 1：先寫 UI 行為與可及性測試**

先在 `tests/helpers/listening.ts` 提供這些具名 fixture／helper，後續 UI、守恆與 responsive 測試一律匯入，不複製 IndexedDB setup：

```ts
function makeCard(id: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    deckId: 'deck-listening',
    group: 'Test',
    front: id,
    back: `${id}-back`,
    state: 'new',
    interval: 0,
    easeFactor: 2.5,
    failCount: 0,
    hardCount: 0,
    introducedDate: '',
    lastReviewedDate: '',
    ...overrides,
  };
}

export const sampleDeckWithCards = {
  deck: {
    id: 'deck-listening',
    name: 'Listening',
    newCardLimit: 20,
    cardCount: 2,
    language: 'en',
    deckType: 'vocab',
  } satisfies Deck,
  cards: [
    makeCard('card-1', { front: 'apple', example: 'An apple a day.' }),
    makeCard('card-2', { front: 'banana', example: 'A yellow banana.' }),
  ],
};

export async function seedSelectedDeck(page: Page, fixture = sampleDeckWithCards): Promise<void>;
export async function seedGraduatedFutureCard(page: Page): Promise<void>;
export async function seedDeckAndReport(page: Page): Promise<void>;
export async function installFakeSpeechSynthesis(page: Page): Promise<void>;
export async function openListeningMode(page: Page): Promise<void>;
export async function readSrsSnapshot(page: Page): Promise<{
  cards: Array<Pick<Card,
    'id' | 'state' | 'interval' | 'easeFactor' | 'failCount' | 'hardCount'
    | 'introducedDate' | 'lastReviewedDate' | 'todayRating'>>;
  reports: Report[];
}>;
```

`seedSelectedDeck()` 以 `page.addInitScript()` 在第一次 `goto()` 前建立 `SRS_DB` v2 的 decks/cards/reports stores，並寫入 `srs_selected_decks`。`seedGraduatedFutureCard()` 建立只有未到期 graduated 卡的牌組；`seedDeckAndReport()` 建立含所有 SRS 欄位與一份 today report 的守恆 fixture。`installFakeSpeechSynthesis()` 以 `addInitScript()` 定義 `SpeechSynthesisUtterance`、`window.speechSynthesis`、`window.__speechRequests` 與 async `window.__finishAllSpeech()`；後者逐次觸發目前 utterance `onend`，並依 500／1,000 ms timer 等到下一個 request，直到 controller 完成，不能靠真實裝置聲音。

UI 測試：

```ts
test('renders an independent paused player and starts only after a user click', async ({ page }) => {
  await seedSelectedDeck(page, sampleDeckWithCards);
  await installFakeSpeechSynthesis(page);
  await page.goto('/');
  await page.getByTestId('mode-card-vocab').click();
  await page.getByTestId('listening-entry').click();
  await expect(page.getByTestId('listening-status')).toContainText('已暫停');
  await expect(page.getByTestId('listening-front')).toHaveText('apple');
  expect(await page.evaluate(() => (
    window as unknown as { __speechRequests: unknown[] }
  ).__speechRequests.length)).toBe(0);
  await page.getByTestId('listening-play').click();
  expect(await page.evaluate(() => (
    window as unknown as { __speechRequests: Array<{ text: string }> }
  ).__speechRequests[0].text)).toBe('apple');
});

test('repeat steppers allow 0 through 5 and update the live repetition label', async ({ page }) => {
  await openListeningMode(page);
  const front = page.getByTestId('front-repeat-input');
  await front.fill('3');
  await expect(front).toHaveValue('3');
  await page.getByTestId('listening-play').click();
  await expect(page.getByTestId('listening-status')).toContainText('第 1 / 3 遍');
});

test('queue drawer traps focus, jumps to a card, closes on Escape and restores focus', async ({ page }) => {
  await openListeningMode(page);
  const trigger = page.getByTestId('listening-queue-open');
  await trigger.click();
  await expect(page.getByRole('dialog', { name: /播放清單/ })).toBeVisible();
  await page.getByTestId('listening-queue-item-1').click();
  await expect(page.getByTestId('listening-front')).toHaveText('banana');
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});
```

- [ ] **步驟 2：確認 UI 測試因元件／入口尚不存在而失敗**

```bash
npx playwright test tests/listening-mode.spec.ts --project=chromium --retries=0
```

預期：FAIL，找不到 `listening-entry` 或新元件。

- [ ] **步驟 3：建立集中式八語文案**

```ts
export interface ListeningStrings {
  title: string;
  entry: string;
  doesNotAffectProgress: string;
  sourceToday: string;
  sourceAll: string;
  orderSequential: string;
  orderShuffle: string;
  loopPlaylist: string;
  frontRepeats: string;
  phraseRepeats: string;
  exampleRepeats: string;
  previous: string;
  play: string;
  pause: string;
  next: string;
  queue: string;
  unsupported: string;
  backgroundBestEffort: string;
  retry: string;
  skipCard: string;
  back: string;
  empty: string;
  enableOneRepeat: string;
  paused: string;
  completed: string;
}

export const LISTENING_STRINGS: Record<UILang, ListeningStrings>;
```

每個語言物件都必須列齊欄位；不以英文字串偷偷回退。`entry` 與 `doesNotAffectProgress` 在 dashboard 及 player 共用。

- [ ] **步驟 4：建立可及清單抽屜**

`ListeningQueueDrawer` props 固定為：

```ts
interface ListeningQueueDrawerProps {
  open: boolean;
  items: ListeningPlaylistItem[];
  currentIndex: number;
  title: string;
  closeLabel: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onSelect: (index: number) => void;
  onClose: () => void;
}
```

`role="dialog"`、`aria-modal="true"`；開啟時 focus 第一個可操作項，Tab／Shift+Tab 留在抽屜，Escape 關閉，關閉後 focus 回 `triggerRef`。每個項目顯示索引與 `card.front`，不顯示定義。

- [ ] **步驟 5：建立 ListeningMode 呈現層**

`ListeningMode` props 固定為：

```ts
interface ListeningModeProps {
  mode: DeckType;
  deckIds: string[];
  decks: Deck[];
  globalLimit: number;
  uiLang: UILang;
  onBack: () => void;
  onPreferencesChanged: () => void;
}
```

進入時以 `Promise.all(deckIds.map(DB.getCardsByDeck))` 取得資料，交給 `buildListeningPlaylist()`；建立一個 `PlaybackController` 並 subscribe。偏好每次合法變更立即寫 localStorage、更新 controller、呼叫一次 `onPreferencesChanged()`。元件 unmount 必須 `dispose()`。

播放器必須包含下列穩定 selector：

```text
listening-source-today
listening-source-all
listening-order-sequential
listening-order-shuffle
listening-loop
front-repeat-input
example-repeat-input
listening-front
listening-example
listening-status
listening-progress
listening-previous
listening-play
listening-next
listening-queue-open
```

數字控制使用 `<input type="number" min="0" max="5" step="1">` 搭配減號／加號按鈕；程式端仍透過 preferences normalize。重新開啟顯示上次 card ID，但 controller 初始狀態只能是 `ready`／`paused`，不得自動播放。

- [ ] **步驟 6：重跑 UI 測試**

```bash
npx playwright test tests/listening-mode.spec.ts --project=chromium --retries=0
```

預期：播放器、repeat、drawer 與 no-autoplay 案例通過。

- [ ] **步驟 7：Checkpoint**

```bash
git diff --check -- src/lib/listeningStrings.ts src/components/ListeningQueueDrawer.tsx src/components/ListeningMode.tsx tests/listening-mode.spec.ts
```

預期：無輸出、exit code 0。

---

## 任務 6：App 路由、Dashboard 入口與 SRS 資料守恆

**檔案：**

- 修改：`src/App.tsx:37-55,415-476`
- 修改：`src/components/Dashboard.tsx:18-32,214-290`
- 建立：`tests/listening-srs-invariants.spec.ts`
- 修改：`tests/listening-mode.spec.ts`
- 使用：`tests/helpers/listening.ts`

- [ ] **步驟 1：先寫入口與資料守恆失敗測試**

```ts
test('listening entry works with selected cards even when nothing is due', async ({ page }) => {
  await seedGraduatedFutureCard(page);
  await page.goto('/');
  await page.getByTestId('mode-card-vocab').click();
  await expect(page.getByTestId('practice-start')).toBeDisabled();
  await expect(page.getByTestId('listening-entry')).toBeEnabled();
});

test('a complete listening sequence does not mutate cards or today report', async ({ page }) => {
  await seedDeckAndReport(page);
  const before = await readSrsSnapshot(page);
  await installFakeSpeechSynthesis(page);
  await openListeningMode(page);
  await page.getByTestId('listening-play').click();
  await page.evaluate(() => (
    window as unknown as { __finishAllSpeech: () => Promise<void> }
  ).__finishAllSpeech());
  const after = await readSrsSnapshot(page);

  expect(after.cards).toEqual(before.cards);
  expect(after.reports).toEqual(before.reports);
});
```

`readSrsSnapshot()` 必須逐欄比較 `state`、`interval`、`easeFactor`、`failCount`、`hardCount`、`introducedDate`、`lastReviewedDate`、`todayRating` 與 reports。

另加靜態架構測試，讀取 `ListeningMode.tsx`、`playbackController.ts`、`listeningPlaylist.ts`，斷言來源碼不包含 `commitReview(`、`onCardSeen(`、`putCard(` 或 `putReport(`。此測試補足資料快照比對，直接阻止日後把寫入 seam 引進聆聽模組。

- [ ] **步驟 2：確認入口或資料守恆測試目前失敗**

```bash
npx playwright test tests/listening-srs-invariants.spec.ts --project=chromium --retries=0
```

預期：FAIL，找不到聆聽入口或 view。

- [ ] **步驟 3：新增 view 與進入狀態**

在 `App.tsx`：

```ts
export type ViewState = 'home' | 'dashboard' | 'learning' | 'listening' | 'finished';

const [listeningDeckIds, setListeningDeckIds] = useState<string[]>([]);
```

`Dashboard.onStartListening(deckIds)` 設定 ID 後 `setView('listening')`。render `ListeningMode` 時傳入 `sectionMode`、全部 decks、global limit、uiLang；`onBack` 回 dashboard，`onPreferencesChanged` 只呼叫 `cloudSyncController.notifyLocalChange()`。

- [ ] **步驟 4：在 Dashboard 新增獨立次要入口**

Props 新增：

```ts
onStartListening: (deckIds: string[]) => void;
```

正式練習按鈕補 `data-testid="practice-start"`。下方新增 `data-testid="listening-entry"` 的次要按鈕；只在 `selectedDeckIds.size === 0` 或 SpeechSynthesis 不支援時停用，不依賴 `canStart`。旁邊顯示「只播放語音，不會改動學習進度」。

- [ ] **步驟 5：重跑入口、守恆與正式學習回歸**

```bash
npx playwright test tests/listening-mode.spec.ts tests/listening-srs-invariants.spec.ts tests/learning-smoke.spec.ts --project=chromium --retries=0
```

預期：全部通過；守恆測試前後資料完全相同。

- [ ] **步驟 6：Checkpoint**

```bash
git diff --check -- src/App.tsx src/components/Dashboard.tsx tests/listening-mode.spec.ts tests/listening-srs-invariants.spec.ts
```

預期：無輸出、exit code 0。

---

## 任務 7：Portable backup v3 與雲端快照相容

**檔案：**

- 修改：`src/lib/backup.ts:24-87,173-183,238-255,307-349,373-465`
- 修改：`tests/backup.spec.ts`
- 修改：其他直接建構 `BackupPayloadV1` 的測試，只在 TypeScript 要求時補欄位

- [ ] **步驟 1：先寫 v3、v1/v2 migration、嚴格驗證與 rollback 測試**

在 `tests/backup.spec.ts` 加入兩個 legacy factory；v2 factory 的 payload 與 hash 必須先用現行 v2 形狀建立，不能呼叫升級後會自動補 v3 欄位的 `createBackupEnvelope()`：

```ts
async function makeLegacyV1() {
  const payload = samplePayload();
  return {
    manifest: {
      format: 'wordforge-backup',
      schemaVersion: 1,
      appVersion: '1.1.0',
      createdAt: '2026-07-20T00:00:00.000Z',
      snapshotId: 'legacy-v1',
      payloadHash: await hashBackupPayload(payload),
      counts: { decks: 1, cards: 1, reports: 1 },
    },
    payload,
  };
}

async function makeLegacyV2() {
  const payload = { ...samplePayload(), iconAssets: [] };
  return {
    manifest: {
      format: 'wordforge-backup',
      schemaVersion: 2,
      appVersion: '1.1.0',
      createdAt: '2026-07-20T00:00:00.000Z',
      snapshotId: 'legacy-v2',
      payloadHash: await hashBackupPayload(payload),
      counts: { decks: 1, cards: 1, reports: 1, iconAssets: 0 },
    },
    payload,
  };
}
```

將既有 `MemoryStorage` 擴充為精確 key 失敗：

```ts
failOnKey: string | null = null;
setItem(key: string, value: string) {
  if (this.failOnKey === key) {
    this.failOnKey = null;
    throw new Error('quota exceeded');
  }
  this.values.set(key, value);
}
```

再新增測試：

```ts
test('exports and validates schema v3 listening preferences', async () => {
  const payload = samplePayload();
  payload.settings.listeningPreferences = {
    ...createDefaultListeningPreferences('2026-07-23T00:00:00.000Z'),
    source: 'all',
    frontRepeats: 3,
    exampleRepeats: 2,
  };
  const envelope = await createBackupEnvelope(payload);
  expect(envelope.manifest.schemaVersion).toBe(3);
  expect((await validateBackupText(JSON.stringify(envelope))).envelope.payload.settings.listeningPreferences)
    .toMatchObject({ source: 'all', frontRepeats: 3, exampleRepeats: 2 });
});

test('migrates schema v1 and v2 to default listening preferences', async () => {
  for (const legacy of [await makeLegacyV1(), await makeLegacyV2()]) {
    const migrated = await validateBackupText(JSON.stringify(legacy));
    expect(migrated.envelope.manifest.schemaVersion).toBe(3);
    expect(migrated.envelope.payload.settings.listeningPreferences)
      .toMatchObject({ schemaVersion: 1, frontRepeats: 1, exampleRepeats: 1 });
  }
});

test('rejects invalid schema v3 listening preferences instead of silently clamping them', async () => {
  const envelope = await createBackupEnvelope(samplePayload());
  envelope.payload.settings.listeningPreferences = {
    ...createDefaultListeningPreferences(),
    frontRepeats: 99,
  };
  envelope.manifest.payloadHash = await hashBackupPayload(envelope.payload);
  await expect(validateBackupText(JSON.stringify(envelope)))
    .rejects.toMatchObject({ code: 'invalid_listening_preferences' });
});

test('restores the previous listening preference when import storage write fails', async () => {
  const storage = new MemoryStorage();
  storage.setItem(LISTENING_PREFERENCES_STORAGE_KEY, JSON.stringify({ ...createDefaultListeningPreferences(), frontRepeats: 4 }));
  storage.failOnKey = LISTENING_PREFERENCES_STORAGE_KEY;
  await expect(importBackupText(text, repository, storage)).rejects.toThrow('import_rolled_back');
  expect(JSON.parse(storage.getItem(LISTENING_PREFERENCES_STORAGE_KEY)!).frontRepeats).toBe(4);
});
```

- [ ] **步驟 2：執行備份測試，確認 v2 斷言與新欄位測試失敗**

```bash
npx playwright test tests/backup.spec.ts --project=chromium --retries=0
```

預期：FAIL，schema 仍為 2 或沒有 `listeningPreferences`。

- [ ] **步驟 3：將 backup 正規化入口升為 v3**

精確修改：

```ts
export const BACKUP_SCHEMA_VERSION = 3;

export interface BackupSettingsV1 {
  uiLanguage: string;
  definitionLanguage: 'deck' | 'user' | 'bilingual';
  globalDailyLimit: number;
  selectedDeckIds: string[];
  appearance: unknown;
  uiPreferences?: unknown;
  listeningPreferences?: unknown;
}
```

将 `normalizePayloadForV2()` 改名 `normalizePayloadForCurrentSchema()`，正規化 `uiPreferences`、`listeningPreferences` 與 icons。`validateBackupText()` 接受來源 schema `1 | 2 | 3`：

- v1：不要求 icons，補 UI 與聆聽預設。
- v2：嚴格驗 icons，補聆聽預設。
- v3：嚴格驗 icons 與 `assertValidListeningPreferences()`。
- 重新產生的 envelope 一律是 v3。

- [ ] **步驟 4：納入 storage read、apply 與 rollback**

`STORAGE_KEYS` 加入 `LISTENING_PREFERENCES_STORAGE_KEY`。`readBackupSettings()` 使用 `readListeningPreferences(storage)`；`applySettings()` 先嚴格正規化，再寫該 key。現有 `captureRawSettings()`／`restoreRawSettings()` 因 key 已加入，必須自然涵蓋匯入失敗 rollback。

- [ ] **步驟 5：重跑備份與同步核心回歸**

```bash
npx playwright test tests/backup.spec.ts tests/sync.spec.ts tests/browser-sync-store.spec.ts tests/google-drive-provider.spec.ts --project=chromium --retries=0
```

預期：v3 與既有 provider-neutral／Google provider 測試全部通過；不修改 Google Drive provider 介面。

- [ ] **步驟 6：Checkpoint**

```bash
git diff --check -- src/lib/backup.ts tests/backup.spec.ts src/lib/listeningPreferences.ts
```

預期：無輸出、exit code 0。

---

## 任務 8：響應式、橫直式、safe-area 與背景中斷 UX

**檔案：**

- 修改：`src/index.css`
- 修改：`tests/responsive-ui.spec.ts`
- 修改：`tests/listening-mode.spec.ts`

- [ ] **步驟 1：先加入多 viewport 與 fixed transport 失敗測試**

```ts
for (const viewport of [
  { name: 'small phone', width: 320, height: 720 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'large phone', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'small desktop', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone landscape', width: 844, height: 390 },
]) {
  test(`listening mode fits ${viewport.name} without transport overlap`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openListeningMode(page);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
    const content = await page.getByTestId('listening-content').boundingBox();
    const transport = await page.getByTestId('listening-transport').boundingBox();
    expect(content && transport).toBeTruthy();
    expect(content!.y + content!.height).toBeLessThanOrEqual(transport!.y + 1);
    for (const id of ['listening-previous', 'listening-play', 'listening-next']) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });
}
```

另測 `document.visibilityState` 從 hidden 回 visible，當 controller 仍認為 playing 但 fake synth 的 `speaking`／`pending` 都 false 時，UI 顯示 interrupted 且不自動播放。

- [ ] **步驟 2：執行測試，確認尚未有版面保護**

```bash
npx playwright test tests/listening-mode.spec.ts tests/responsive-ui.spec.ts --project=chromium --retries=0
```

預期：至少 fixed transport、test ID 或 visibility 案例 FAIL。

- [ ] **步驟 3：加入集中式播放器 CSS**

必須建立並只使用下列結構 class：

```css
.listening-page { min-width: 0; max-width: 52rem; margin-inline: auto; }
.listening-content {
  min-width: 0;
  padding-bottom: calc(6.5rem + env(safe-area-inset-bottom, 0px));
}
.listening-card {
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--card);
}
.listening-front {
  overflow-wrap: anywhere;
  font-size: calc(clamp(2rem, 8vw, 4.5rem) * var(--font-scale-card-title));
}
.listening-example {
  overflow-wrap: anywhere;
  font-size: calc(clamp(0.95rem, 2.4vw, 1.25rem) * var(--font-scale-card-body));
}
.listening-transport {
  position: fixed;
  z-index: 35;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 0.75rem max(1rem, env(safe-area-inset-right, 0px))
    max(0.75rem, env(safe-area-inset-bottom, 0px))
    max(1rem, env(safe-area-inset-left, 0px));
}
.listening-transport__inner {
  width: min(100%, 32rem);
  margin-inline: auto;
  display: grid;
  grid-template-columns: minmax(2.75rem, 1fr) minmax(3.5rem, 1.2fr) minmax(2.75rem, 1fr);
  gap: clamp(0.5rem, 2vw, 1rem);
}
```

抽屜覆蓋層使用 `100dvh`、內容 `min-width:0`、長 front 合理換行。手機橫式以高度 media query 壓縮非必要垂直 gap，不縮小 transport 觸控目標。`prefers-reduced-motion` 停止脈動與位移動畫。

- [ ] **步驟 4：連接 visibilitychange 與平台提示**

頁面 hidden 時不 cancel；回到 visible 時先重新讀取選定牌組、用相同 preferences 重建清單，再以目前 card ID 呼叫 `controller.setPlaylist()`，接著呼叫 `controller.handleVisibilityReturn()`。若目前卡片已被刪除，controller 前進到同索引的下一張有效卡；牌組已清空則取消並顯示空清單。若語音中斷，固定顯示「瀏覽器已中斷語音，按播放會從目前這一遍重新開始」。播放器內常駐簡短提示：背景／鎖屏是否持續取決於瀏覽器與作業系統。

- [ ] **步驟 5：重跑響應式與播放器測試**

```bash
npx playwright test tests/listening-mode.spec.ts tests/responsive-ui.spec.ts --project=chromium --retries=0
```

預期：所有 viewport 無水平溢位、fixed transport 不遮內容、44×44 目標與中斷行為通過。

- [ ] **步驟 6：Checkpoint**

```bash
git diff --check -- src/index.css tests/responsive-ui.spec.ts tests/listening-mode.spec.ts
```

預期：無輸出、exit code 0。

---

## 任務 9：文件、完整驗證與人工裝置驗收包

**檔案：**

- 建立：`docs/continuous-listening-manual-qa.md`
- 修改：`README.md`
- 修改：`docs/i18n/README-en.md`
- 修改：`CHANGELOG.md`

- [ ] **步驟 1：先為非自己新建的文件建立日期備份**

```bash
cp -a README.md README.md.bak-20260723-listening
cp -a docs/i18n/README-en.md docs/i18n/README-en.md.bak-20260723-listening
cp -a CHANGELOG.md CHANGELOG.md.bak-20260723-listening
```

- [ ] **步驟 2：補使用說明與誠實的平台邊界**

README 中加入：

```text
連續聆聽模式只讀取所選牌組，不會建立評分或改變 SRS 進度。
可設定主詞／片語與例句各播放 0～5 次，並選擇今日清單／全部卡片、依序／隨機及整份循環。
前景播放為支援目標；切換 App、鎖屏或系統休眠後能否持續由瀏覽器與作業系統決定。
重新開啟會回到上次卡片但保持暫停，需再次按播放。
```

英文 README 寫等義內容。CHANGELOG 記錄新功能、backup schema v3 及 v1/v2 相容。

- [ ] **步驟 3：建立逐平台人工 QA 表**

`docs/continuous-listening-manual-qa.md` 必須列出：

- Windows Chrome 與 Edge：3/2 連播、pause/resume、next/previous、完成／循環。
- Android Chrome 與安裝 PWA：前景連播、切背景 30 秒、回前景中斷恢復。
- iPhone Safari 與加入主畫面 PWA：使用者點擊後播放、鎖屏觀察、回前景重播目前遍數。
- 斷網：裝置 voice 可用時播放；只有 online voice 時顯示可恢復錯誤。
- 每個平台都先記錄 cards/reports 快照，播放後確認完全相同。
- 背景／鎖屏欄位只有「觀察結果」，不作硬性 PASS gate。

- [ ] **步驟 4：跑新增功能的完整測試集合**

```bash
npx playwright test \
  tests/listening-preferences.spec.ts \
  tests/listening-playlist.spec.ts \
  tests/speech-engine.spec.ts \
  tests/playback-controller.spec.ts \
  tests/listening-mode.spec.ts \
  tests/listening-srs-invariants.spec.ts \
  tests/backup.spec.ts \
  tests/responsive-ui.spec.ts \
  --project=chromium --retries=0
```

預期：0 failed。

- [ ] **步驟 5：跑全套現有 Playwright 回歸**

```bash
npx playwright test --project=chromium --retries=0
```

預期：0 failed；記錄實際 passed 數量，不預填數字。

- [ ] **步驟 6：跑 lint、TypeScript／production build 與 diff gate**

```bash
npm run lint
npm run build
git diff --check
```

預期：

- lint：0 errors；若仍有任務前既存 warnings，逐條列出，不宣稱為本次新增。
- build：`tsc -b && vite build` 成功，`dist/` 與 PWA service worker 產出。
- diff check：無 whitespace error。

`package.json` 沒有獨立 `typecheck` 或 `test` script；不可虛構。TypeScript 驗證由 `npm run build` 的 `tsc -b` 提供，測試直接執行 Playwright。

- [ ] **步驟 7：開發伺服器與人工預覽**

```bash
npm run dev -- --host 0.0.0.0
```

預期顯示 localhost 與 Network URL。WSL2 下 Windows 瀏覽器優先使用終端列出的 Network URL；若 `http://localhost:5173/` 未轉發，不視為 App 功能失敗。

- [ ] **步驟 8：Cleanup 與交付 checkpoint**

刪除 Playwright `test-results/`、trace、截圖及本任務臨時資料夾；保留 CORE 規定的 `.bak-20260723-listening` 備份直到使用者驗收。核對：

```bash
git status --short
git diff --check
```

只回報本計畫涉及檔案；不得把共享 worktree 的其他變更說成本次成果，也不得 commit／push。

---

## 二、規格對照驗收表

| 核准需求 | 實作任務 | 確定性證據 |
|---|---:|---|
| 獨立模式、不修改 SRS | 5、6 | `listening-srs-invariants.spec.ts` |
| 主詞 N 遍、例句 M 遍、自動下一張 | 4 | controller 3/2 精確序列 |
| 次數 0～5、預設 1/1 | 1、4、5 | preferences clamp + UI |
| 今日／全部 | 2、5 | playlist + UI |
| 依序／固定隨機、保存 seed | 1、2 | deterministic shuffle |
| 循環開關、首尾行為 | 4 | controller boundary tests |
| 播放／暫停／上／下／跳卡 | 4、5 | fake speech + UI |
| 重新開啟上次卡片但不自動播 | 1、5 | no-autoplay reload test |
| foreground 支援、background best effort | 3、8、9 | visibility test + manual QA |
| voice fallback 一次後可恢復錯誤 | 3、4 | speech/controller tests |
| v3 備份、v1/v2 migration、rollback | 7 | backup tests |
| 320～1440、橫式、safe-area | 8 | responsive viewport matrix |
| 現有手動 TTS 與正式練習不退步 | 3、6、9 | learning smoke + full suite |

## 三、停止條件

執行中若出現以下任一情況，停止擴張並回到本計畫修訂：

1. Web Speech API 在前景無法透過使用者手勢後穩定連播。
2. 為了 background／鎖屏必須加入後端、預生成音檔、Wake Lock hack 或 Media Session。
3. 今日清單共用化會改變既有正式練習的資格或預算結果。
4. 需要修改 Google Drive provider，而不是只讓完整 backup v3 自然同步。
5. 實際修改檔案數或責任超過本計畫一倍。
6. 發現聆聽路徑需要呼叫 `DB.commitReview()`、`onCardSeen()` 或報表寫入。
