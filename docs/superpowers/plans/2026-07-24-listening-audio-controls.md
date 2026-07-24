# WordForge 連續聆聽倍速與首選語音實作計畫

> **面向 AI 代理的工作者：** 必需子技能：使用 `executing-plans` 在目前工作區逐任務實作本計畫。步驟使用復選框（`- [ ]`）語法追蹤進度。本任務已由使用者指定不得建立 worktree、不得 commit、不得 push；每一任務以精確測試檢查點取代提交步驟。

**目標：** 在既有連續聆聽模式加入八段固定倍速、單一首選裝置語音、相容語言自動備援、不中斷的偏好變更，以及可取消且不寫入 SRS 的試聽流程。

**架構：** 延伸既有 `ListeningPreferencesV1 → PlaybackController → BrowserSpeechEngine` 資料流，不增加後端或第三方服務。React 只保存抽屜與語音清單的呈現狀態；播放、試聽及競態取消由 controller 管理，實際 voice／rate 解析由 speech engine 管理，完整偏好仍透過既有 localStorage、portable backup v3 與 Google Drive 完整備份同步。

**技術棧：** React 19、TypeScript 6、Vite 8、Web Speech API、lucide-react、Playwright、CSS Grid/Flexbox、localStorage。

**核准規格：** `docs/superpowers/specs/2026-07-24-listening-audio-controls-design.md`

---

## 0. 實作限制與檔案職責

### 工作區限制

- 目前是多 Agent 共用的 dirty worktree；保留所有既有未提交內容。
- 不執行 `git reset`、`git checkout --`、整批 stage、commit 或 push。
- 修改既有檔案前，建立不覆蓋舊檔的日期備份：

```bash
for file in \
  src/lib/listeningPreferences.ts \
  src/lib/speechEngine.ts \
  src/lib/playbackController.ts \
  src/lib/listeningStrings.ts \
  src/components/ListeningMode.tsx \
  src/components/LearningView.tsx \
  src/lib/backup.ts \
  src/index.css \
  tests/helpers/listening.ts \
  tests/listening-preferences.spec.ts \
  tests/speech-engine.spec.ts \
  tests/playback-controller.spec.ts \
  tests/listening-mode.spec.ts \
  tests/backup.spec.ts \
  tests/listening-srs-invariants.spec.ts \
  tests/responsive-ui.spec.ts \
  README.md \
  docs/i18n/README-en.md \
  CHANGELOG.md \
  docs/continuous-listening-manual-qa.md
do
  cp -n "$file" "$file.bak-20260724-audio-controls"
done
```

預期：命令 exit code 為 `0`；若同名備份已存在，`cp -n` 保留舊備份、不覆蓋。

### 建立或修改的檔案

- 建立 `src/components/ListeningAudioDrawer.tsx`
  - 底部音訊設定抽屜、倍速選項、語音清單、試聽、恢復預設及可及性。
- 修改 `src/lib/listeningPreferences.ts:3-156`
  - 固定倍速型別、首選語音描述、預設值、正規化、嚴格驗證及 localStorage 相容。
- 修改 `src/lib/speechEngine.ts:1-190`
  - 語音目錄訂閱、首選 voice 解析、語言相容、request rate 與強制試聽 voice。
- 修改 `src/lib/playbackController.ts:8-477`
  - `previewing` 狀態、試聽錯誤、下一遍讀取新偏好及舊 callback 失效。
- 修改 `src/lib/listeningStrings.ts:4-329`
  - 八語音訊設定文案。
- 修改 `src/components/ListeningMode.tsx:116-491`
  - 摘要按鈕、抽屜接線、語音目錄載入、偏好立即保存及試聽操作。
- 修改 `src/components/LearningView.tsx:88-113`
  - 共用 SpeechRequest 型別升級；正式練習仍固定 0.85× 與自動 voice，不接入連續聆聽偏好。
- 修改 `src/lib/backup.ts:181-202,337-372,421-474`
  - 舊 v3 缺欄位相容、非法新欄位拒絕、正規化輸出與 rollback 回歸。
- 修改 `src/index.css:1714-2263`
  - 摘要按鈕、bottom sheet、倍速網格、語音列表及直／橫式響應。
- 修改 `tests/helpers/listening.ts:44-124`
  - 可切換多語 voice 的瀏覽器測試語音 harness。
- 修改 `tests/listening-preferences.spec.ts`
  - 新偏好 schema、非法值與舊資料回歸。
- 修改 `tests/speech-engine.spec.ts`
  - voice 解析、倍速、fallback、voiceschanged 與強制試聽。
- 修改 `tests/playback-controller.spec.ts`
  - 下一遍生效、試聽中斷／恢復及 callback 競態。
- 修改 `tests/listening-mode.spec.ts`
  - 抽屜互動、保存、不可用 voice、焦點與預覽流程。
- 修改 `tests/backup.spec.ts`
  - 舊／新 v3、v1／v2 migration、非法音訊偏好及 rollback。
- 修改 `tests/listening-srs-invariants.spec.ts`
  - 變速、選聲音與試聽前後 cards／reports 完全一致。
- 修改 `tests/responsive-ui.spec.ts`
  - 320～1440px、橫式、44px 操作區與無水平溢位。
- 修改 `README.md`、`docs/i18n/README-en.md`、`CHANGELOG.md`
  - 使用方式、平台限制及新功能紀錄。
- 修改 `docs/continuous-listening-manual-qa.md`
  - Windows、Android、iPhone、離線與跨裝置 voice fallback 驗收。

## 任務 1：擴充連續聆聽偏好 schema

**檔案：**

- 修改：`tests/listening-preferences.spec.ts:1-125`
- 修改：`src/lib/listeningPreferences.ts:3-156`

- [ ] **步驟 1：先寫倍速、首選語音與 legacy 正規化測試**

在 `tests/listening-preferences.spec.ts` 的 import 加入 `LISTENING_RATE_OPTIONS`，並加入：

```ts
test('defaults audio preferences to 0.85x and automatic voice selection', () => {
  expect(LISTENING_RATE_OPTIONS).toEqual([0.5, 0.75, 0.85, 1, 1.25, 1.5, 1.75, 2]);
  expect(createDefaultListeningPreferences('2026-07-24T00:00:00.000Z')).toMatchObject({
    playbackRate: 0.85,
    preferredVoice: null,
  });
});

test('normalizes legacy and tampered audio preferences to safe values', () => {
  const legacy = normalizeListeningPreferences({
    ...createDefaultListeningPreferences(),
    playbackRate: undefined,
    preferredVoice: undefined,
  });
  expect(legacy).toMatchObject({ playbackRate: 0.85, preferredVoice: null });

  for (const playbackRate of [0.9, 9, Number.NaN, Number.POSITIVE_INFINITY, '1.25']) {
    const tampered = normalizeListeningPreferences({
      ...createDefaultListeningPreferences(),
      playbackRate,
      preferredVoice: { voiceURI: '', name: 'Ava', lang: 'en-US' },
    });
    expect(tampered).toMatchObject({ playbackRate: 0.85, preferredVoice: null });
  }
});

test('preserves an approved rate and a complete preferred voice descriptor', () => {
  const preferredVoice = {
    voiceURI: 'urn:voice:ava',
    name: 'Microsoft Ava',
    lang: 'en-US',
  };
  const normalized = normalizeListeningPreferences({
    ...createDefaultListeningPreferences(),
    playbackRate: 1.25,
    preferredVoice,
  });
  expect(normalized).toMatchObject({ playbackRate: 1.25, preferredVoice });
});

test('round-trips audio preferences through the existing localStorage key', () => {
  const storage = new MemoryStorage();
  const preferredVoice = {
    voiceURI: 'urn:voice:ava',
    name: 'Microsoft Ava',
    lang: 'en-US',
  };
  saveListeningPreferences({
    ...createDefaultListeningPreferences('2026-07-24T00:00:00.000Z'),
    playbackRate: 1.75,
    preferredVoice,
  }, storage);

  expect(readListeningPreferences(storage)).toMatchObject({
    playbackRate: 1.75,
    preferredVoice,
  });
});

test('strict validation requires complete current audio fields and rejects invalid values', () => {
  const legacy = createDefaultListeningPreferences();
  const { playbackRate: _rate, preferredVoice: _voice, ...withoutAudio } = legacy;
  expect(() => assertValidListeningPreferences(withoutAudio))
    .toThrow('invalid_listening_preferences');

  expect(() => assertValidListeningPreferences({
    ...legacy,
    playbackRate: 0.9,
  })).toThrow('invalid_listening_preferences');
  expect(() => assertValidListeningPreferences({
    ...legacy,
    preferredVoice: { voiceURI: 'x', name: '', lang: 'en-US' },
  })).toThrow('invalid_listening_preferences');
});
```

- [ ] **步驟 2：執行測試並確認紅燈**

執行：

```bash
npx playwright test tests/listening-preferences.spec.ts --project=chromium
```

預期：FAIL；TypeScript 回報 `LISTENING_RATE_OPTIONS` 尚未匯出，或預設物件缺少 `playbackRate`。

- [ ] **步驟 3：加入集中式音訊偏好型別與正規化**

在 `src/lib/listeningPreferences.ts` 加入並接到既有 interface／default／normalize／assert：

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

export function isListeningRate(value: unknown): value is ListeningRate {
  return typeof value === 'number'
    && LISTENING_RATE_OPTIONS.some(option => option === value);
}

function normalizePreferredVoice(value: unknown): PreferredVoiceV1 | null {
  if (
    !isRecord(value)
    || typeof value.voiceURI !== 'string'
    || value.voiceURI.trim().length === 0
    || typeof value.name !== 'string'
    || value.name.trim().length === 0
    || typeof value.lang !== 'string'
    || value.lang.trim().length === 0
  ) {
    return null;
  }
  return {
    voiceURI: value.voiceURI.trim(),
    name: value.name.trim(),
    lang: value.lang.trim(),
  };
}
```

將欄位加到 `ListeningPreferencesV1`：

```ts
playbackRate: ListeningRate;
preferredVoice: PreferredVoiceV1 | null;
```

將預設值加到 `createDefaultListeningPreferences()`：

```ts
playbackRate: 0.85,
preferredVoice: null,
```

將欄位加到 `normalizeListeningPreferences()` 回傳物件：

```ts
playbackRate: isListeningRate(raw.playbackRate) ? raw.playbackRate : 0.85,
preferredVoice: normalizePreferredVoice(raw.preferredVoice),
```

在 `assertValidListeningPreferences()` 的主要條件加入：

```ts
|| !isListeningRate(raw.playbackRate)
|| (
  raw.preferredVoice !== null
  && normalizePreferredVoice(raw.preferredVoice) === null
)
```

保留函式原本的 `asserts raw is ListeningPreferencesV1` 型別保證，因此 strict assertion 只接受完整目前格式。舊 v3 缺欄位的例外處理集中放在任務 2 的 backup 來源邊界，避免型別斷言接受實際缺欄位的物件。

- [ ] **步驟 4：執行偏好測試確認綠燈**

執行：

```bash
npx playwright test tests/listening-preferences.spec.ts --project=chromium
```

預期：所有 `listening-preferences.spec.ts` 測試 PASS。

## 任務 2：保持 portable backup v3 與 localStorage 回滾相容

**檔案：**

- 修改：`tests/backup.spec.ts:188-230,360-420`
- 修改：`src/lib/backup.ts:181-202,337-372,421-474`

- [ ] **步驟 1：寫舊 v3、新 v3、非法資料及 rollback 測試**

在 `tests/backup.spec.ts` 加入：

```ts
test('normalizes a legacy schema v3 backup that has no audio preference fields', async () => {
  const envelope = await createBackupEnvelope(samplePayload());
  const listening = envelope.payload.settings.listeningPreferences as
    & Record<string, unknown>
    & { playbackRate?: unknown; preferredVoice?: unknown };
  delete listening.playbackRate;
  delete listening.preferredVoice;
  envelope.manifest.payloadHash = await hashBackupPayload(envelope.payload);

  const validated = await validateBackupText(JSON.stringify(envelope));
  expect(validated.envelope.payload.settings.listeningPreferences).toMatchObject({
    playbackRate: 0.85,
    preferredVoice: null,
  });
});

test('round-trips schema v3 audio preferences without changing schema version', async () => {
  const payload = samplePayload();
  payload.settings.listeningPreferences = {
    ...createDefaultListeningPreferences('2026-07-24T00:00:00.000Z'),
    playbackRate: 1.5,
    preferredVoice: {
      voiceURI: 'urn:voice:ava',
      name: 'Microsoft Ava',
      lang: 'en-US',
    },
  };
  const envelope = await createBackupEnvelope(payload);
  const validated = await validateBackupText(JSON.stringify(envelope));

  expect(envelope.manifest.schemaVersion).toBe(3);
  expect(validated.envelope.payload.settings.listeningPreferences).toMatchObject({
    playbackRate: 1.5,
    preferredVoice: {
      voiceURI: 'urn:voice:ava',
      name: 'Microsoft Ava',
      lang: 'en-US',
    },
  });
});

test('rejects present but invalid schema v3 audio preferences', async () => {
  for (const invalid of [
    { playbackRate: 0.9 },
    { preferredVoice: { voiceURI: '', name: 'Ava', lang: 'en-US' } },
  ]) {
    const envelope = await createBackupEnvelope(samplePayload());
    Object.assign(envelope.payload.settings.listeningPreferences, invalid);
    envelope.manifest.payloadHash = await hashBackupPayload(envelope.payload);
    await expect(validateBackupText(JSON.stringify(envelope)))
      .rejects.toMatchObject({ code: 'invalid_listening_preferences' });
  }
});
```

在既有 `migrates schema v1 and v2 to default listening preferences` 斷言加入：

```ts
playbackRate: 0.85,
preferredVoice: null,
```

在既有「settings cannot be written」rollback 測試的 prior／replacement 偏好分別放入 `0.75` 與 `1.75`，最後補：

```ts
expect(JSON.parse(storage.getItem(LISTENING_PREFERENCES_STORAGE_KEY)!)).toMatchObject({
  playbackRate: 0.75,
});
```

- [ ] **步驟 2：執行備份測試確認紅燈**

執行：

```bash
npx playwright test tests/backup.spec.ts --project=chromium
```

預期：至少一項 FAIL；舊 v3 或新欄位驗證尚未符合測試。

- [ ] **步驟 3：讓 v3 來源嚴格驗證後再正規化輸出**

將 `src/lib/backup.ts` 的 `validateListeningPreferences()` 改為只替「完全缺失」的新欄位補 legacy 預設；欄位存在時不修理非法值：

```ts
function validateListeningPreferences(value: unknown): void {
  try {
    if (!isRecord(value)) throw new Error('invalid_listening_preferences');
    const legacyCompatible = {
      ...value,
      playbackRate: Object.hasOwn(value, 'playbackRate')
        ? value.playbackRate
        : 0.85,
      preferredVoice: Object.hasOwn(value, 'preferredVoice')
        ? value.preferredVoice
        : null,
    };
    assertValidListeningPreferences(legacyCompatible);
  } catch {
    throw new BackupValidationError('invalid_listening_preferences');
  }
}
```

保持 `BACKUP_SCHEMA_VERSION = 3`，不建立 v4。確認 `validateBackupText()` 順序維持：

```ts
if (manifest.schemaVersion === BACKUP_SCHEMA_VERSION) {
  validateListeningPreferences(parsedEnvelope.payload.settings.listeningPreferences);
}
// 先驗來源 hash，再產生目前格式 envelope
if (await hashBackupPayload(parsedEnvelope.payload) !== manifest.payloadHash) {
  throw new BackupValidationError('hash_mismatch');
}
const envelope = await createBackupEnvelope(
  normalizePayloadForCurrentSchema(parsedEnvelope.payload),
  {
    appVersion: String(manifest.appVersion ?? '1.1.0'),
    createdAt: String(manifest.createdAt ?? new Date().toISOString()),
    snapshotId: String(manifest.snapshotId ?? createPortableUuid()),
  },
);
```

`normalizePayloadForCurrentSchema()` 與 `applySettings()` 已呼叫 `normalizeListeningPreferences()`；不得改為直接保存未驗證來源。`STORAGE_KEYS` 必須繼續包含 `LISTENING_PREFERENCES_STORAGE_KEY`，確保任何設定寫入失敗時可還原整份舊偏好。

- [ ] **步驟 4：執行備份與同步回歸**

執行：

```bash
npx playwright test \
  tests/backup.spec.ts \
  tests/sync.spec.ts \
  tests/browser-sync-store.spec.ts \
  tests/cloud-sync-controller.spec.ts \
  tests/google-drive-provider.spec.ts \
  --project=chromium
```

預期：所有列出的備份與同步測試 PASS；schema 仍為 v3。

## 任務 3：讓 SpeechEngine 支援倍速、首選 voice 與語音目錄更新

**檔案：**

- 修改：`tests/speech-engine.spec.ts:1-253`
- 修改：`src/lib/speechEngine.ts:1-190`
- 修改：`src/components/LearningView.tsx:88-113`
- 驗證：`tests/learning-smoke.spec.ts`

- [ ] **步驟 1：寫語言相容、首選解析、rate 與 voice 更新測試**

在 `tests/speech-engine.spec.ts` 加入：

```ts
const ava = voice('Microsoft Ava', 'en-US', { voiceURI: 'urn:ava' });
const preferredAva = { voiceURI: 'urn:ava', name: 'Microsoft Ava', lang: 'en-US' };

test('places a compatible preferred voice before automatic candidates', () => {
  expect(resolveVoiceCandidates(
    [...voices, ava],
    'en-GB',
    preferredAva,
  ).map(item => item.name)).toEqual([
    'Microsoft Ava',
    'English Local',
    'Exact Local',
    'Google US English',
    'English Online',
    'English Natural',
  ]);
});

test('ignores an incompatible preferred voice during formal playback', () => {
  const japanese = { voiceURI: 'Japanese', name: 'Japanese', lang: 'ja-JP' };
  expect(resolveVoiceCandidates(voices, 'en-US', japanese)[0]?.name)
    .toBe('English Natural');
});

test('recovers a moved preferred voice by exact name and language', () => {
  const moved = voice('Microsoft Ava', 'en-US', { voiceURI: 'urn:new-device-ava' });
  expect(resolveVoiceCandidates(
    [moved, ...voices],
    'en-US',
    preferredAva,
  )[0]?.voiceURI).toBe('urn:new-device-ava');
});

test('forces an explicitly selected preview voice even across languages', () => {
  const japanese = { voiceURI: 'Japanese', name: 'Japanese', lang: 'ja-JP' };
  expect(resolveVoiceCandidates(voices, 'en-US', japanese, true)[0]?.name)
    .toBe('Japanese');
});

test('passes the approved display rate directly to the utterance', async () => {
  const { engine, synth } = createEngine();
  engine.speak({
    text: 'hello',
    lang: 'en-US',
    rate: 1.75,
    preferredVoice: preferredAva,
    fallbackAttempt: 0,
  }, {
    onEnd: () => undefined,
    onError: () => undefined,
  });
  await Promise.resolve();
  expect(synth.lastUtterance?.rate).toBe(1.75);
});

test('notifies voice catalog subscribers after voiceschanged', () => {
  const { engine, synth } = createEngine();
  const seen: string[][] = [];
  const unsubscribe = engine.subscribeVoices(next => {
    seen.push(next.map(item => item.name));
  });
  synth.installVoices([voice('Installed Later', 'en-US')]);
  expect(seen.at(-1)).toEqual(['Installed Later']);
  unsubscribe();
});
```

同步替換此檔既有所有 `engine.speak({...})` request，使其包含：

```ts
rate: 0.85,
preferredVoice: null,
```

- [ ] **步驟 2：執行語音引擎測試確認紅燈**

執行：

```bash
npx playwright test tests/speech-engine.spec.ts --project=chromium
```

預期：FAIL；`SpeechRequest` 缺少新欄位，且 `subscribeVoices`／四參數 resolver 尚不存在。

- [ ] **步驟 3：擴充 request、port 與 voice helper**

在 `src/lib/speechEngine.ts` 引入偏好型別並改為：

```ts
import type {
  ListeningRate,
  PreferredVoiceV1,
} from './listeningPreferences';

export interface SpeechRequest {
  text: string;
  lang: string;
  rate: ListeningRate;
  preferredVoice: PreferredVoiceV1 | null;
  fallbackAttempt: 0 | 1;
  forcePreferredVoice?: boolean;
}

export interface SpeechEnginePort {
  isSupported(): boolean;
  prepareVoices(): Promise<SpeechSynthesisVoice[]>;
  listVoices(): SpeechSynthesisVoice[];
  subscribeVoices(listener: (voices: SpeechSynthesisVoice[]) => void): () => void;
  speak(request: SpeechRequest, events: SpeechEvents): void;
  pause(): 'paused' | 'interrupted';
  resume(): 'resumed' | 'interrupted';
  cancel(): void;
  isActive(): boolean;
  dispose(): void;
}
```

新增可供 UI 與 resolver 共用的 helper：

```ts
export function primaryLanguage(lang: string): string {
  return lang.trim().toLowerCase().split('-')[0] ?? '';
}

export function isVoiceLanguageCompatible(voiceLang: string, requestLang: string): boolean {
  return primaryLanguage(voiceLang) === primaryLanguage(requestLang);
}

export function findPreferredVoice(
  voices: SpeechSynthesisVoice[],
  preferred: PreferredVoiceV1 | null,
): SpeechSynthesisVoice | null {
  if (!preferred) return null;
  return voices.find(voice => voice.voiceURI === preferred.voiceURI)
    ?? voices.find(voice => (
      voice.name === preferred.name
      && voice.lang.toLowerCase() === preferred.lang.toLowerCase()
    ))
    ?? null;
}

export function resolveVoiceCandidates(
  voices: SpeechSynthesisVoice[],
  lang: string,
  preferred: PreferredVoiceV1 | null = null,
  forcePreferredVoice = false,
): SpeechSynthesisVoice[] {
  const language = lang.toLowerCase();
  const baseLanguage = primaryLanguage(lang);
  const exact = voices.filter(voice => voice.lang.toLowerCase() === language);
  const sameLanguage = voices.filter(
    voice => primaryLanguage(voice.lang) === baseLanguage,
  );
  const ordered: SpeechSynthesisVoice[] = [];
  const preferredVoice = findPreferredVoice(voices, preferred);

  if (
    preferredVoice
    && (
      forcePreferredVoice
      || isVoiceLanguageCompatible(preferredVoice.lang, lang)
    )
  ) {
    pushUnique(ordered, [preferredVoice]);
  }
  for (const marker of ['natural', 'online', 'google']) {
    pushUnique(
      ordered,
      exact.filter(voice => voice.name.toLowerCase().includes(marker)),
    );
  }
  pushUnique(ordered, exact);
  pushUnique(ordered, sameLanguage);
  return ordered;
}
```

- [ ] **步驟 4：加入語音目錄與 request 設定**

在 `BrowserSpeechEngine` 加入：

```ts
private readonly voiceSubscriptions = new Map<
  (voices: SpeechSynthesisVoice[]) => void,
  () => void
>();

listVoices(): SpeechSynthesisVoice[] {
  return this.synth?.getVoices() ?? [];
}

subscribeVoices(listener: (voices: SpeechSynthesisVoice[]) => void): () => void {
  if (!this.synth || this.disposed) return () => undefined;
  const handleVoicesChanged = () => listener(this.listVoices());
  this.synth.addEventListener('voiceschanged', handleVoicesChanged);
  this.voiceSubscriptions.set(listener, handleVoicesChanged);
  listener(this.listVoices());
  return () => {
    this.synth?.removeEventListener('voiceschanged', handleVoicesChanged);
    this.voiceSubscriptions.delete(listener);
  };
}
```

讓 `prepareVoices()` 完成後清空 promise，允許初次 timeout 後再次取得新安裝 voice：

```ts
prepareVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!this.synth || this.disposed) return Promise.resolve([]);
  const loaded = this.synth.getVoices();
  if (loaded.length > 0) return Promise.resolve(loaded);
  if (this.voicesPromise) return this.voicesPromise;

  const waiting = new Promise<SpeechSynthesisVoice[]>(resolve => {
    let settled = false;
    let timeoutId = 0;
    const finish = () => {
      if (settled) return;
      settled = true;
      this.synth?.removeEventListener('voiceschanged', handleVoicesChanged);
      this.timers.clearTimeout(timeoutId);
      this.finishVoiceWait = null;
      resolve(this.synth?.getVoices() ?? []);
    };
    const handleVoicesChanged = () => {
      if ((this.synth?.getVoices().length ?? 0) > 0) finish();
    };
    timeoutId = this.timers.setTimeout(finish, 3000);
    this.finishVoiceWait = finish;
    this.synth?.addEventListener('voiceschanged', handleVoicesChanged);
  });
  const prepared = waiting.finally(() => {
    if (this.voicesPromise === prepared) this.voicesPromise = null;
  });
  this.voicesPromise = prepared;
  return prepared;
}
```

在 `dispose()` 的 `cancel()` 之後、設定 `disposed` 之前移除語音目錄訂閱：

```ts
for (const handleVoicesChanged of this.voiceSubscriptions.values()) {
  this.synth?.removeEventListener('voiceschanged', handleVoicesChanged);
}
this.voiceSubscriptions.clear();
this.finishVoiceWait?.();
this.finishVoiceWait = null;
```

在 `speak()` 建立 utterance 時改為：

```ts
const utterance = this.createUtterance(request.text);
const candidates = resolveVoiceCandidates(
  voices,
  request.lang,
  request.preferredVoice,
  request.forcePreferredVoice ?? false,
);
utterance.voice = candidates[request.fallbackAttempt] ?? null;
utterance.lang = request.lang;
utterance.rate = request.rate;
utterance.pitch = 1;
utterance.onend = () => {
  if (generation !== this.generation || this.disposed) return;
  this.active = false;
  events.onEnd();
};
utterance.onerror = event => {
  if (generation !== this.generation || this.disposed) return;
  this.active = false;
  events.onError(event.error || 'speech_error');
};
this.synth.speak(utterance);
```

`dispose()` 最終仍呼叫：

```ts
this.disposed = true;
```

不得保留舊的 `utterance.rate = 0.85`。

- [ ] **步驟 5：讓正式練習共用 caller 保持既有固定行為**

在 `src/components/LearningView.tsx` 的 `speakAttempt()` request 補入：

```ts
engine.speak({
  text,
  lang,
  rate: 0.85,
  preferredVoice: null,
  fallbackAttempt,
}, {
  onEnd: () => undefined,
  onError: () => {
    if (fallbackAttempt === 0) speakAttempt(1);
    else setAudioError(true);
  },
});
```

不得讀取 `ListeningPreferencesV1`；正式練習的手動／自動朗讀繼續使用固定 0.85× 與 speech engine 自動 voice。

- [ ] **步驟 6：執行語音引擎與正式練習回歸**

執行：

```bash
npx playwright test \
  tests/speech-engine.spec.ts \
  tests/learning-smoke.spec.ts \
  --project=chromium
```

預期：所有列出的測試 PASS；既有一次 fallback 順序與正式練習朗讀入口仍通過。

## 任務 4：在 PlaybackController 加入下一遍生效與可取消試聽

**檔案：**

- 修改：`tests/playback-controller.spec.ts:18-320`
- 修改：`src/lib/playbackController.ts:8-477`

- [ ] **步驟 1：更新 fake port 並寫倍速生效測試**

讓 `FakeSpeechEngine` 實作：

```ts
listVoices = () => [];
subscribeVoices = () => () => undefined;
```

加入：

```ts
test('changing rate does not cancel the current utterance and applies to the next repetition', () => {
  const { controller, speech, scheduler, preferences } = createHarness({
    frontRepeats: 2,
    exampleRepeats: 0,
    playbackRate: 0.85,
  });
  controller.play();
  controller.setPreferences({ ...preferences, playbackRate: 1.5 });
  expect(speech.requests).toHaveLength(1);
  expect(speech.requests[0]?.rate).toBe(0.85);

  speech.finish();
  scheduler.advanceBy(500);
  expect(speech.requests[1]?.rate).toBe(1.5);
});
```

- [ ] **步驟 2：寫正式播放中試聽、試聽後暫停及 stale callback 測試**

加入：

```ts
test('preview cancels formal playback, preserves the cursor, and ends paused', () => {
  const { controller, speech } = createHarness({
    frontRepeats: 3,
    exampleRepeats: 2,
  });
  controller.play();
  const staleFormalEnd = speech.captureEnd();

  controller.previewCurrent({
    rate: 1.25,
    preferredVoice: {
      voiceURI: 'Japanese',
      name: 'Japanese',
      lang: 'ja-JP',
    },
  });

  expect(controller.getSnapshot()).toMatchObject({
    status: 'previewing',
    cardIndex: 0,
    phase: 'front',
    repeatIndex: 1,
    repeatTotal: 3,
  });
  expect(speech.requests.at(-1)).toMatchObject({
    text: 'apple',
    rate: 1.25,
    forcePreferredVoice: true,
  });

  staleFormalEnd();
  expect(controller.getSnapshot().status).toBe('previewing');
  speech.finish();
  expect(controller.getSnapshot()).toMatchObject({
    status: 'paused',
    cardIndex: 0,
    phase: 'front',
    repeatIndex: 1,
  });
});

test('play during preview cancels preview and restarts the current formal repetition', () => {
  const { controller, speech } = createHarness({ frontRepeats: 2 });
  controller.play();
  controller.previewCurrent({ rate: 0.75, preferredVoice: null });
  const stalePreviewEnd = speech.captureEnd();

  controller.play();
  expect(controller.getSnapshot().status).toBe('playing');
  expect(speech.requests.map(request => request.text)).toEqual([
    'apple',
    'apple',
    'apple',
  ]);

  stalePreviewEnd();
  expect(controller.getSnapshot().status).toBe('playing');
});

test('preview errors remain recoverable and never enter formal fallback', () => {
  const { controller, speech } = createHarness();
  controller.previewCurrent({ rate: 0.85, preferredVoice: null });
  speech.fail('voice-unavailable');

  expect(controller.getSnapshot()).toMatchObject({
    status: 'paused',
    previewError: 'voice-unavailable',
    error: null,
  });
  expect(speech.requests).toHaveLength(1);
});

test('navigation and visibility interruption invalidate stale preview callbacks', () => {
  const navigation = createHarness();
  navigation.controller.previewCurrent({ rate: 0.85, preferredVoice: null });
  const staleNavigationEnd = navigation.speech.captureEnd();
  navigation.controller.next();
  staleNavigationEnd();
  expect(navigation.controller.getSnapshot()).toMatchObject({
    status: 'ready',
    cardIndex: 1,
  });

  const visibility = createHarness();
  visibility.controller.previewCurrent({ rate: 0.85, preferredVoice: null });
  const staleVisibilityEnd = visibility.speech.captureEnd();
  visibility.speech.active = false;
  visibility.controller.handleVisibilityReturn();
  staleVisibilityEnd();
  expect(visibility.controller.getSnapshot()).toMatchObject({
    status: 'paused',
    cardIndex: 0,
    repeatIndex: 1,
  });
});
```

- [ ] **步驟 3：執行 controller 測試確認紅燈**

執行：

```bash
npx playwright test tests/playback-controller.spec.ts --project=chromium
```

預期：FAIL；`previewCurrent`、`previewing`、`previewError` 與新 request 欄位尚未實作。

- [ ] **步驟 4：擴充 snapshot 與正式播放 request**

將 `PlaybackStatus` 加入 `'previewing'`，`PlaybackSnapshot` 加入：

```ts
previewError: string | null;
```

controller 欄位與 `getSnapshot()` 同步加入 `private previewError: string | null = null`。

在 `startCurrent()` 設定 `this.error = null` 的下一行加入：

```ts
this.previewError = null;
```

並將 request 改為：

```ts
this.speech.speak({
  text,
  lang: item.ttsLang,
  rate: this.preferences.playbackRate,
  preferredVoice: this.preferences.preferredVoice,
  fallbackAttempt,
  forcePreferredVoice: false,
}, {
  onEnd: () => {
    if (generation !== this.generation || this.disposed) return;
    this.advanceAfterSpeech();
  },
  onError: error => {
    if (generation !== this.generation || this.disposed) return;
    if (fallbackAttempt === 0) {
      this.startCurrent(1);
      return;
    }
    this.status = 'error';
    this.error = error;
    this.emit();
  },
});
```

- [ ] **步驟 5：實作 controller 專屬試聽入口**

加入：

```ts
previewCurrent(options: {
  rate: ListeningPreferencesV1['playbackRate'];
  preferredVoice: ListeningPreferencesV1['preferredVoice'];
}): void {
  if (this.disposed) return;
  const item = this.items[this.cardIndex];
  const text = item?.card.front.trim() ?? '';
  if (!item || !text) return;

  this.invalidate();
  this.generation += 1;
  const generation = this.generation;
  this.status = 'previewing';
  this.error = null;
  this.previewError = null;
  this.emit();

  this.speech.speak({
    text,
    lang: item.ttsLang,
    rate: options.rate,
    preferredVoice: options.preferredVoice,
    fallbackAttempt: 0,
    forcePreferredVoice: options.preferredVoice !== null,
  }, {
    onEnd: () => {
      if (generation !== this.generation || this.disposed) return;
      this.status = 'paused';
      this.emit();
    },
    onError: error => {
      if (generation !== this.generation || this.disposed) return;
      this.status = 'paused';
      this.previewError = error;
      this.emit();
    },
  });
}
```

在 `play()` 開頭的重入保護之後加入：

```ts
if (this.status === 'previewing') {
  this.invalidate();
  this.ensureCursor();
  this.startCurrent();
  return;
}
```

`resetCursor()` 加入：

```ts
this.previewError = null;
```

將 `handleVisibilityReturn()` 改為：

```ts
handleVisibilityReturn(): void {
  if (this.disposed || this.speech.isActive()) return;
  if (this.status === 'previewing') {
    this.invalidate();
    this.status = 'paused';
    this.emit();
    return;
  }
  if (this.status !== 'playing') return;
  this.invalidate();
  this.status = 'interrupted';
  this.emit();
}
```

`next()`、`previous()`、`jumpTo()` 與 `dispose()` 已透過 `moveTo()`／`invalidate()` 增加 generation，必須保留此路徑，讓舊 preview callback 無法改變新狀態。

- [ ] **步驟 6：執行狀態機測試確認綠燈**

執行：

```bash
npx playwright test tests/playback-controller.spec.ts --project=chromium
```

預期：所有 controller 測試 PASS；既有 3／2 次序列、pause／resume、next／previous 與 fallback 無回歸。

## 任務 5：加入八語音訊文案

**檔案：**

- 修改：`src/lib/listeningStrings.ts:4-329`
- 驗證：`tests/listening-mode.spec.ts`

- [ ] **步驟 1：擴充文案 interface**

在 `ListeningStrings` 加入：

```ts
audioSettings: string;
closeAudioSettings: string;
automaticVoice: string;
rate: string;
preferredVoice: string;
showAllVoices: string;
showCompatibleVoices: string;
previewVoice: string;
previewing: string;
resetAudio: string;
voicesLoading: string;
voicesUnavailable: string;
voiceUnavailable: string;
localVoice: string;
networkVoice: string;
fallbackForLanguage: string;
previewError: string;
```

- [ ] **步驟 2：加入完整八語文字典**

在 `LISTENING_STRINGS` 前建立：

```ts
type ListeningAudioStrings = Pick<ListeningStrings,
  | 'audioSettings' | 'closeAudioSettings' | 'automaticVoice' | 'rate'
  | 'preferredVoice' | 'showAllVoices' | 'showCompatibleVoices'
  | 'previewVoice' | 'previewing' | 'resetAudio' | 'voicesLoading'
  | 'voicesUnavailable' | 'voiceUnavailable' | 'localVoice'
  | 'networkVoice' | 'fallbackForLanguage' | 'previewError'>;

const LISTENING_AUDIO_STRINGS: Record<UILang, ListeningAudioStrings> = {
  'zh-TW': {
    audioSettings: '音訊設定',
    closeAudioSettings: '關閉音訊設定',
    automaticVoice: '自動推薦',
    rate: '播放速度',
    preferredVoice: '首選聲音',
    showAllVoices: '顯示全部聲音',
    showCompatibleVoices: '只顯示相容聲音',
    previewVoice: '試聽目前卡片',
    previewing: '正在試聽',
    resetAudio: '恢復音訊預設',
    voicesLoading: '正在載入聲音清單…',
    voicesUnavailable: '目前無法取得聲音清單',
    voiceUnavailable: '目前無法使用',
    localVoice: '本機聲音',
    networkVoice: '可能需要網路',
    fallbackForLanguage: '目前使用 {language} 自動備援',
    previewError: '試聽失敗：{error}',
  },
  en: {
    audioSettings: 'Audio settings',
    closeAudioSettings: 'Close audio settings',
    automaticVoice: 'Automatic',
    rate: 'Playback speed',
    preferredVoice: 'Preferred voice',
    showAllVoices: 'Show all voices',
    showCompatibleVoices: 'Show compatible voices',
    previewVoice: 'Preview current card',
    previewing: 'Previewing',
    resetAudio: 'Reset audio defaults',
    voicesLoading: 'Loading voices…',
    voicesUnavailable: 'Voice list is currently unavailable',
    voiceUnavailable: 'Currently unavailable',
    localVoice: 'On-device voice',
    networkVoice: 'May require network',
    fallbackForLanguage: 'Using automatic {language} fallback',
    previewError: 'Preview failed: {error}',
  },
  ja: {
    audioSettings: '音声設定',
    closeAudioSettings: '音声設定を閉じる',
    automaticVoice: '自動選択',
    rate: '再生速度',
    preferredVoice: '優先音声',
    showAllVoices: 'すべての音声を表示',
    showCompatibleVoices: '対応音声のみ表示',
    previewVoice: '現在のカードを試聴',
    previewing: '試聴中',
    resetAudio: '音声設定を初期化',
    voicesLoading: '音声一覧を読み込み中…',
    voicesUnavailable: '音声一覧を取得できません',
    voiceUnavailable: '現在利用できません',
    localVoice: '端末内音声',
    networkVoice: 'ネット接続が必要な場合あり',
    fallbackForLanguage: '{language} の自動音声を使用中',
    previewError: '試聴に失敗しました：{error}',
  },
  ko: {
    audioSettings: '오디오 설정',
    closeAudioSettings: '오디오 설정 닫기',
    automaticVoice: '자동 추천',
    rate: '재생 속도',
    preferredVoice: '선호 음성',
    showAllVoices: '모든 음성 표시',
    showCompatibleVoices: '호환 음성만 표시',
    previewVoice: '현재 카드 미리 듣기',
    previewing: '미리 듣는 중',
    resetAudio: '오디오 기본값 복원',
    voicesLoading: '음성 목록 불러오는 중…',
    voicesUnavailable: '현재 음성 목록을 가져올 수 없습니다',
    voiceUnavailable: '현재 사용할 수 없음',
    localVoice: '기기 내 음성',
    networkVoice: '네트워크가 필요할 수 있음',
    fallbackForLanguage: '현재 {language} 자동 대체 음성 사용 중',
    previewError: '미리 듣기 실패: {error}',
  },
  de: {
    audioSettings: 'Audioeinstellungen',
    closeAudioSettings: 'Audioeinstellungen schließen',
    automaticVoice: 'Automatisch',
    rate: 'Wiedergabegeschwindigkeit',
    preferredVoice: 'Bevorzugte Stimme',
    showAllVoices: 'Alle Stimmen anzeigen',
    showCompatibleVoices: 'Kompatible Stimmen anzeigen',
    previewVoice: 'Aktuelle Karte vorhören',
    previewing: 'Vorschau läuft',
    resetAudio: 'Audio zurücksetzen',
    voicesLoading: 'Stimmen werden geladen…',
    voicesUnavailable: 'Stimmenliste ist derzeit nicht verfügbar',
    voiceUnavailable: 'Derzeit nicht verfügbar',
    localVoice: 'Lokale Stimme',
    networkVoice: 'Benötigt möglicherweise Internet',
    fallbackForLanguage: 'Automatische {language}-Ersatzstimme aktiv',
    previewError: 'Vorschau fehlgeschlagen: {error}',
  },
  es: {
    audioSettings: 'Ajustes de audio',
    closeAudioSettings: 'Cerrar ajustes de audio',
    automaticVoice: 'Automática',
    rate: 'Velocidad de reproducción',
    preferredVoice: 'Voz preferida',
    showAllVoices: 'Mostrar todas las voces',
    showCompatibleVoices: 'Mostrar voces compatibles',
    previewVoice: 'Probar la tarjeta actual',
    previewing: 'Reproduciendo prueba',
    resetAudio: 'Restablecer audio',
    voicesLoading: 'Cargando voces…',
    voicesUnavailable: 'La lista de voces no está disponible',
    voiceUnavailable: 'No disponible actualmente',
    localVoice: 'Voz del dispositivo',
    networkVoice: 'Puede requerir conexión',
    fallbackForLanguage: 'Usando alternativa automática para {language}',
    previewError: 'Falló la prueba: {error}',
  },
  fr: {
    audioSettings: 'Réglages audio',
    closeAudioSettings: 'Fermer les réglages audio',
    automaticVoice: 'Automatique',
    rate: 'Vitesse de lecture',
    preferredVoice: 'Voix préférée',
    showAllVoices: 'Afficher toutes les voix',
    showCompatibleVoices: 'Afficher les voix compatibles',
    previewVoice: 'Écouter la carte actuelle',
    previewing: 'Aperçu en cours',
    resetAudio: 'Réinitialiser l’audio',
    voicesLoading: 'Chargement des voix…',
    voicesUnavailable: 'La liste des voix est indisponible',
    voiceUnavailable: 'Actuellement indisponible',
    localVoice: 'Voix locale',
    networkVoice: 'Peut nécessiter Internet',
    fallbackForLanguage: 'Voix automatique {language} utilisée',
    previewError: 'Échec de l’aperçu : {error}',
  },
  th: {
    audioSettings: 'การตั้งค่าเสียง',
    closeAudioSettings: 'ปิดการตั้งค่าเสียง',
    automaticVoice: 'แนะนำอัตโนมัติ',
    rate: 'ความเร็วในการเล่น',
    preferredVoice: 'เสียงที่ต้องการ',
    showAllVoices: 'แสดงเสียงทั้งหมด',
    showCompatibleVoices: 'แสดงเสียงที่เข้ากันได้',
    previewVoice: 'ทดลองฟังบัตรปัจจุบัน',
    previewing: 'กำลังทดลองฟัง',
    resetAudio: 'คืนค่าเสียงเริ่มต้น',
    voicesLoading: 'กำลังโหลดรายการเสียง…',
    voicesUnavailable: 'ไม่สามารถรับรายการเสียงได้ในขณะนี้',
    voiceUnavailable: 'ไม่พร้อมใช้งานในขณะนี้',
    localVoice: 'เสียงในอุปกรณ์',
    networkVoice: 'อาจต้องใช้อินเทอร์เน็ต',
    fallbackForLanguage: 'กำลังใช้เสียงสำรองอัตโนมัติสำหรับ {language}',
    previewError: 'ทดลองฟังไม่สำเร็จ: {error}',
  },
};
```

在八個既有語言物件的第一個欄位加入相對應的 spread：

```ts
'zh-TW': {
  ...LISTENING_AUDIO_STRINGS['zh-TW'],
  title: '連續聆聽',
},
en: {
  ...LISTENING_AUDIO_STRINGS.en,
  title: 'Continuous Listening',
},
ja: {
  ...LISTENING_AUDIO_STRINGS.ja,
  title: '連続リスニング',
},
ko: {
  ...LISTENING_AUDIO_STRINGS.ko,
  title: '연속 듣기',
},
de: {
  ...LISTENING_AUDIO_STRINGS.de,
  title: 'Fortlaufendes Hören',
},
es: {
  ...LISTENING_AUDIO_STRINGS.es,
  title: 'Escucha continua',
},
fr: {
  ...LISTENING_AUDIO_STRINGS.fr,
  title: 'Écoute continue',
},
th: {
  ...LISTENING_AUDIO_STRINGS.th,
  title: 'ฟังต่อเนื่อง',
},
```

每個物件原本從 `title` 到 `cardProgress` 的既有欄位緊接在 spread 後，不刪除或改名。

- [ ] **步驟 3：先跑 TypeScript build 檢查文案完整性**

執行：

```bash
npm run build
```

預期：build PASS；若任一語言漏欄位，TypeScript 必須在這一步失敗並補齊。

## 任務 6：建立音訊設定 bottom sheet

**檔案：**

- 建立：`src/components/ListeningAudioDrawer.tsx`
- 修改：`tests/listening-mode.spec.ts`

- [ ] **步驟 1：先寫抽屜的使用者流程測試**

在 `tests/listening-mode.spec.ts` 加入：

```ts
test('audio drawer changes rate, filters voices, previews, resets, and restores focus', async ({ page }) => {
  await installFakeSpeechSynthesis(page);
  await seedSelectedDeck(page);
  await openListeningMode(page);

  const trigger = page.getByTestId('listening-audio-open');
  await expect(trigger).toContainText('0.85×');
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: /音訊設定/ });
  await expect(dialog).toBeVisible();

  await page.getByTestId('listening-rate-1-25').click();
  await expect(page.getByTestId('listening-rate-1-25')).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel(/English Natural/).check();
  await page.getByTestId('listening-audio-preview').click();
  await expect(page.getByTestId('listening-status')).toContainText('正在試聽');

  await page.getByTestId('listening-audio-reset').click();
  await expect(page.getByTestId('listening-rate-0-85')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel(/自動推薦/)).toBeChecked();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('audio drawer can reveal other languages and keeps a missing saved voice visible', async ({ page }) => {
  await installFakeSpeechSynthesis(page);
  await seedSelectedDeck(page);
  await page.evaluate(() => {
    localStorage.setItem('wordforge_listening_preferences_v1', JSON.stringify({
      schemaVersion: 1,
      source: 'today',
      order: 'sequential',
      loopPlaylist: false,
      frontRepeats: 1,
      exampleRepeats: 1,
      playbackRate: 1,
      preferredVoice: {
        voiceURI: 'missing-uri',
        name: 'Missing Voice',
        lang: 'en-US',
      },
      shuffleSeedByMode: {},
      lastCardIdByMode: {},
      updatedAt: '2026-07-24T00:00:00.000Z',
    }));
  });
  await page.reload();
  await openListeningMode(page);
  await page.getByTestId('listening-audio-open').click();

  await expect(page.getByText('Missing Voice')).toBeVisible();
  await expect(page.getByText('目前無法使用')).toBeVisible();
  await expect(page.getByLabel(/Japanese/)).toHaveCount(0);
  await page.getByTestId('listening-voice-show-all').click();
  await expect(page.getByLabel(/Japanese/)).toBeVisible();
  await page.getByLabel(/Japanese/).check();
  await page.getByTestId('listening-audio-close').click();
  await expect(page.getByTestId('listening-audio-open')).toContainText('Japanese');
  await expect(page.getByTestId('listening-audio-open')).toContainText('en-US');
});

test('preview interrupts formal speech and leaves the same repetition paused', async ({ page }) => {
  await installFakeSpeechSynthesis(page);
  await seedSelectedDeck(page);
  await openListeningMode(page);
  await page.getByTestId('front-repeat-increase').click();
  await page.getByTestId('listening-play').click();

  await page.getByTestId('listening-audio-open').click();
  await page.getByTestId('listening-audio-preview').click();
  await page.evaluate(() => (
    window as unknown as { __speechHarness: { finishCurrent: () => void } }
  ).__speechHarness.finishCurrent());
  await expect(page.getByTestId('listening-status')).toContainText('已暫停');

  await page.getByTestId('listening-audio-close').click();
  await page.getByTestId('listening-play').click();
  const requests = await page.evaluate(() => (
    window as unknown as {
      __speechHarness: { requests: Array<{ text: string }> };
    }
  ).__speechHarness.requests);
  expect(requests.map(request => request.text)).toEqual(['apple', 'apple', 'apple']);
  await expect(page.getByTestId('listening-status')).toContainText('第 1 / 2 遍');
});
```

- [ ] **步驟 2：執行 UI 測試確認紅燈**

執行：

```bash
npx playwright test tests/listening-mode.spec.ts --project=chromium
```

預期：FAIL；`listening-audio-open` 與 `ListeningAudioDrawer` 尚不存在。

- [ ] **步驟 3：建立完整 bottom sheet 元件**

建立 `src/components/ListeningAudioDrawer.tsx`：

```tsx
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { RefreshCw, RotateCcw, Volume2, X } from 'lucide-react';
import {
  LISTENING_RATE_OPTIONS,
  type ListeningRate,
  type PreferredVoiceV1,
} from '../lib/listeningPreferences';
import {
  formatListeningString,
  type ListeningStrings,
} from '../lib/listeningStrings';
import {
  findPreferredVoice,
  isVoiceLanguageCompatible,
} from '../lib/speechEngine';

interface ListeningAudioDrawerProps {
  open: boolean;
  strings: ListeningStrings;
  voices: SpeechSynthesisVoice[];
  voicesLoading: boolean;
  requestLang: string;
  rate: ListeningRate;
  preferredVoice: PreferredVoiceV1 | null;
  previewing: boolean;
  previewError: string | null;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onRateChange: (rate: ListeningRate) => void;
  onVoiceChange: (voice: PreferredVoiceV1 | null) => void;
  onPreview: () => void;
  onReset: () => void;
  onRefreshVoices: () => void;
  onClose: () => void;
}

function rateTestId(rate: ListeningRate): string {
  return String(rate).replace('.', '-');
}

function describeVoice(voice: SpeechSynthesisVoice): PreferredVoiceV1 {
  return {
    voiceURI: voice.voiceURI,
    name: voice.name,
    lang: voice.lang,
  };
}

export default function ListeningAudioDrawer({
  open,
  strings,
  voices,
  voicesLoading,
  requestLang,
  rate,
  preferredVoice,
  previewing,
  previewError,
  triggerRef,
  onRateChange,
  onVoiceChange,
  onPreview,
  onReset,
  onRefreshVoices,
  onClose,
}: ListeningAudioDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [showAll, setShowAll] = useState(false);

  const close = useCallback(() => {
    setShowAll(false);
    onClose();
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, [onClose, triggerRef]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      )];
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [close, open]);

  if (!open) return null;

  const compatibleVoices = voices.filter(voice => (
    isVoiceLanguageCompatible(voice.lang, requestLang)
  ));
  const hasOtherLanguages = compatibleVoices.length !== voices.length;
  const visibleVoices = [...(showAll ? voices : compatibleVoices)].sort(
    (left, right) => (
      left.lang.localeCompare(right.lang)
      || left.name.localeCompare(right.name)
    ),
  );
  const groupedVoices = visibleVoices.reduce<Map<string, SpeechSynthesisVoice[]>>(
    (groups, voice) => {
      const group = groups.get(voice.lang) ?? [];
      group.push(voice);
      groups.set(voice.lang, group);
      return groups;
    },
    new Map(),
  );
  const resolvedPreferred = findPreferredVoice(voices, preferredVoice);
  const preferredUnavailable = preferredVoice !== null && resolvedPreferred === null;

  return (
    <div
      className="listening-audio-overlay"
      onMouseDown={event => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        className="listening-audio-drawer"
        data-testid="listening-audio-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={strings.audioSettings}
      >
        <div className="listening-drawer__header">
          <h2>{strings.audioSettings}</h2>
          <button
            ref={closeRef}
            type="button"
            className="btn btn-ghost listening-icon-button"
            data-testid="listening-audio-close"
            aria-label={strings.closeAudioSettings}
            title={strings.closeAudioSettings}
            onClick={close}
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="listening-audio-drawer__body">
          <section className="listening-audio-section">
            <h3>{strings.rate}</h3>
            <div className="listening-rate-grid">
              {LISTENING_RATE_OPTIONS.map(option => (
                <button
                  key={option}
                  type="button"
                  data-testid={`listening-rate-${rateTestId(option)}`}
                  aria-pressed={rate === option}
                  onClick={() => onRateChange(option)}
                >
                  {option}×
                </button>
              ))}
            </div>
          </section>

          <section className="listening-audio-section">
            <h3>{strings.preferredVoice}</h3>
            <div className="listening-voice-list" role="radiogroup">
              <label className="listening-voice-option">
                <input
                  type="radio"
                  name="listening-preferred-voice"
                  value="automatic"
                  checked={preferredVoice === null}
                  onChange={() => onVoiceChange(null)}
                />
                <span>
                  <strong>{strings.automaticVoice}</strong>
                </span>
              </label>

              {preferredVoice && preferredUnavailable && (
                <label className="listening-voice-option" aria-disabled="true">
                  <input
                    type="radio"
                    name="listening-preferred-voice"
                    checked
                    disabled
                    readOnly
                  />
                  <span>
                    <strong>{preferredVoice.name}</strong>
                    <small>{preferredVoice.lang} · {strings.voiceUnavailable}</small>
                  </span>
                </label>
              )}

              {voicesLoading && <p aria-live="polite">{strings.voicesLoading}</p>}
              {!voicesLoading && voices.length === 0 && (
                <div className="listening-voice-empty">
                  <p>{strings.voicesUnavailable}</p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onRefreshVoices}
                  >
                    <RefreshCw aria-hidden="true" />
                    {strings.voicesUnavailable}
                  </button>
                </div>
              )}

              {[...groupedVoices].map(([lang, group]) => (
                <div className="listening-voice-group" key={lang}>
                  <h4>{lang}</h4>
                  {group.map(voice => (
                    <label className="listening-voice-option" key={voice.voiceURI}>
                      <input
                        type="radio"
                        name="listening-preferred-voice"
                        value={voice.voiceURI}
                        checked={resolvedPreferred?.voiceURI === voice.voiceURI}
                        onChange={() => onVoiceChange(describeVoice(voice))}
                      />
                      <span>
                        <strong>{voice.name}</strong>
                        <small>
                          {voice.lang} · {
                            voice.localService
                              ? strings.localVoice
                              : strings.networkVoice
                          }
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>

            {hasOtherLanguages && (
              <button
                type="button"
                className="btn btn-ghost"
                data-testid="listening-voice-show-all"
                onClick={() => setShowAll(value => !value)}
              >
                {showAll ? strings.showCompatibleVoices : strings.showAllVoices}
              </button>
            )}
          </section>

          {previewError && (
            <p className="listening-error" role="status">
              {formatListeningString(strings.previewError, { error: previewError })}
            </p>
          )}

          <div className="listening-audio-actions">
            <button
              type="button"
              className="btn btn-primary"
              data-testid="listening-audio-preview"
              disabled={previewing}
              onClick={onPreview}
            >
              <Volume2 aria-hidden="true" />
              {previewing ? strings.previewing : strings.previewVoice}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              data-testid="listening-audio-reset"
              onClick={onReset}
            >
              <RotateCcw aria-hidden="true" />
              {strings.resetAudio}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

這份元件固定採 reducer 分組，因專案 `tsconfig.app.json` 的 lib 是 ES2023，不使用 ES2024 的 `Map.groupBy()`。

- [ ] **步驟 4：執行 lint 驗證獨立元件**

執行：

```bash
npm run lint
```

預期：lint PASS；無遺漏 React hook dependency 或未使用匯入。

## 任務 7：將語音清單、摘要、偏好與試聽接入 ListeningMode

**檔案：**

- 修改：`tests/helpers/listening.ts:44-124`
- 修改：`tests/listening-mode.spec.ts`
- 修改：`src/components/ListeningMode.tsx:116-491`

- [ ] **步驟 1：擴充瀏覽器語音 harness**

讓 `tests/helpers/listening.ts` 的 requests 記錄 voice，並提供英文／日文 voice：

```ts
const requests: Array<{
  text: string;
  lang: string;
  rate: number;
  pitch: number;
  voiceURI: string | null;
}> = [];
let voices = [
  {
    name: 'English Natural',
    lang: 'en-US',
    default: true,
    localService: true,
    voiceURI: 'fake-en-US',
  },
  {
    name: 'Japanese',
    lang: 'ja-JP',
    default: false,
    localService: true,
    voiceURI: 'fake-ja-JP',
  },
];
const voiceListeners = new Set<() => void>();
```

在 `speak()` 記錄：

```ts
voiceURI: utterance.voice?.voiceURI ?? null,
```

讓 synth 的 listener 真正可觸發：

```ts
getVoices: () => voices,
addEventListener: (_name: 'voiceschanged', listener: () => void) => {
  voiceListeners.add(listener);
},
removeEventListener: (_name: 'voiceschanged', listener: () => void) => {
  voiceListeners.delete(listener);
},
```

在 harness 加入：

```ts
installVoices: (next: SpeechSynthesisVoice[]) => {
  voices = next;
  voiceListeners.forEach(listener => listener());
},
```

- [ ] **步驟 2：在 ListeningMode 保存 engine 與語音目錄狀態**

在 `EMPTY_SNAPSHOT` 加入：

```ts
previewError: null,
```

新增 refs／state：

```ts
const engineRef = useRef<BrowserSpeechEngine | null>(null);
const audioTriggerRef = useRef<HTMLButtonElement>(null);
const [audioOpen, setAudioOpen] = useState(false);
const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
const [voicesLoading, setVoicesLoading] = useState(true);
```

在建立 controller 的 effect 中：

```ts
const engine = new BrowserSpeechEngine();
engineRef.current = engine;
const unsubscribeVoices = engine.subscribeVoices(setVoices);
setVoicesLoading(true);
void engine.prepareVoices()
  .then(setVoices)
  .finally(() => setVoicesLoading(false));
```

cleanup 加入：

```ts
unsubscribeVoices();
if (engineRef.current === engine) engineRef.current = null;
```

新增刷新函式：

```ts
const refreshVoices = useCallback(() => {
  const engine = engineRef.current;
  if (!engine) return;
  setVoicesLoading(true);
  void engine.prepareVoices()
    .then(setVoices)
    .finally(() => setVoicesLoading(false));
}, []);
```

- [ ] **步驟 3：計算摘要與 fallback 提示**

在 `current` 之後加入：

```ts
const currentLang = current?.ttsLang ?? 'en-US';
const resolvedPreferred = findPreferredVoice(voices, preferences.preferredVoice);
const preferredCompatible = resolvedPreferred
  ? isVoiceLanguageCompatible(resolvedPreferred.lang, currentLang)
  : false;
const voiceSummary = preferences.preferredVoice?.name ?? strings.automaticVoice;
const voiceFallback = preferences.preferredVoice && !preferredCompatible
  ? formatListeningString(strings.fallbackForLanguage, {
      language: currentLang,
    })
  : null;
const isPreviewing = snapshot.status === 'previewing';
const isPlaying = snapshot.status === 'playing' || snapshot.status === 'waiting';
```

`statusText` 在其他狀態判斷前加入：

```ts
if (snapshot.status === 'previewing') return strings.previewing;
if (snapshot.previewError) {
  return formatListeningString(strings.previewError, {
    error: snapshot.previewError,
  });
}
```

- [ ] **步驟 4：加入摘要按鈕及抽屜接線**

在 `.listening-options` 與 `.listening-meta` 之間加入：

```tsx
<button
  ref={audioTriggerRef}
  type="button"
  className="listening-audio-summary"
  data-testid="listening-audio-open"
  aria-haspopup="dialog"
  onClick={() => setAudioOpen(true)}
>
  <Volume2 aria-hidden="true" />
  <span>
    <strong>{preferences.playbackRate}× · {voiceSummary}</strong>
    {voiceFallback && <small>{voiceFallback}</small>}
  </span>
</button>
```

在 `ListeningQueueDrawer` 後加入：

```tsx
<ListeningAudioDrawer
  open={audioOpen}
  strings={strings}
  voices={voices}
  voicesLoading={voicesLoading}
  requestLang={currentLang}
  rate={preferences.playbackRate}
  preferredVoice={preferences.preferredVoice}
  previewing={isPreviewing}
  previewError={snapshot.previewError}
  triggerRef={audioTriggerRef}
  onRateChange={playbackRate => updatePreferences({ playbackRate })}
  onVoiceChange={preferredVoice => updatePreferences({ preferredVoice })}
  onPreview={() => controllerRef.current?.previewCurrent({
    rate: preferencesRef.current.playbackRate,
    preferredVoice: preferencesRef.current.preferredVoice,
  })}
  onReset={() => updatePreferences({
    playbackRate: 0.85,
    preferredVoice: null,
  })}
  onRefreshVoices={refreshVoices}
  onClose={() => setAudioOpen(false)}
/>
```

將以下 import 合併到 `ListeningMode.tsx` 的既有 import：

```ts
import { Volume2 } from 'lucide-react';
import ListeningAudioDrawer from './ListeningAudioDrawer';
import {
  findPreferredVoice,
  isVoiceLanguageCompatible,
} from '../lib/speechEngine';
```

- [ ] **步驟 5：執行完整聆聽 UI 測試**

執行：

```bash
npx playwright test \
  tests/listening-mode.spec.ts \
  tests/listening-preferences.spec.ts \
  tests/speech-engine.spec.ts \
  tests/playback-controller.spec.ts \
  --project=chromium
```

預期：所有列出的聆聽測試 PASS；重新整理後摘要保留 rate／voice，但不自動播放。

## 任務 8：完成 bottom sheet 響應式、觸控與無溢位保護

**檔案：**

- 修改：`tests/responsive-ui.spec.ts:175-196`
- 修改：`src/index.css:1714-2263`

- [ ] **步驟 1：先寫各 viewport 的摘要與抽屜幾何測試**

在既有 listening viewport loop 內，完成 transport 檢查後加入：

```ts
const audioTrigger = page.getByTestId('listening-audio-open');
const triggerBox = await audioTrigger.boundingBox();
expect(triggerBox).not.toBeNull();
expect(triggerBox!.height).toBeGreaterThanOrEqual(44);

await audioTrigger.click();
const sheet = page.getByTestId('listening-audio-drawer');
await expect(sheet).toBeVisible();
await expectNoHorizontalOverflow(page);
const sheetBox = await sheet.boundingBox();
expect(sheetBox).not.toBeNull();
expect(sheetBox!.x).toBeGreaterThanOrEqual(0);
expect(sheetBox!.x + sheetBox!.width).toBeLessThanOrEqual(viewport.width + 1);
expect(sheetBox!.y + sheetBox!.height).toBeLessThanOrEqual(viewport.height + 1);

for (const control of [
  'listening-rate-0-5',
  'listening-rate-2',
  'listening-audio-preview',
  'listening-audio-reset',
  'listening-audio-close',
]) {
  const box = await page.getByTestId(control).boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);
}
await page.getByTestId('listening-audio-close').click();
```

- [ ] **步驟 2：執行響應式測試確認紅燈**

執行：

```bash
npx playwright test tests/responsive-ui.spec.ts --project=chromium
```

預期：FAIL；新摘要與 sheet 尚未有尺寸、位置及 test id 樣式保護。

- [ ] **步驟 3：加入摘要與 bottom sheet 樣式**

在 listening styles 區加入：

```css
.listening-audio-summary {
  width: 100%;
  min-width: 0;
  min-height: 2.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  margin-bottom: 0.75rem;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--foreground);
  background: var(--card);
  text-align: left;
}

.listening-audio-summary:hover {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 6%, var(--card));
}

.listening-audio-summary:focus-visible,
.listening-audio-drawer button:focus-visible,
.listening-voice-option:focus-within {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.listening-audio-summary > span {
  min-width: 0;
  display: grid;
  gap: 0.125rem;
}

.listening-audio-summary strong,
.listening-audio-summary small {
  min-width: 0;
  overflow-wrap: anywhere;
}

.listening-audio-overlay {
  position: fixed;
  z-index: 70;
  inset: 0;
  min-width: 0;
  height: 100dvh;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: var(--overlay);
}

.listening-audio-drawer {
  width: min(100%, 42rem);
  min-width: 0;
  max-height: min(86dvh, 44rem);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  border: 1px solid var(--border);
  border-bottom: 0;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  background: var(--card);
  box-shadow: 0 -12px 36px color-mix(in srgb, var(--foreground) 18%, transparent);
  overflow: hidden;
}

.listening-audio-drawer__body {
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: clamp(0.75rem, 3vw, 1.25rem);
}

.listening-rate-grid {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
}

.listening-rate-grid button {
  min-width: 0;
  min-height: 2.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-variant-numeric: tabular-nums;
}

.listening-rate-grid button[aria-pressed="true"] {
  border-color: var(--primary);
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 10%, var(--card));
}

.listening-voice-list {
  min-width: 0;
  display: grid;
  gap: 0.5rem;
}

.listening-voice-option {
  min-width: 0;
  min-height: 2.75rem;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.listening-voice-option span,
.listening-voice-option strong,
.listening-voice-option small {
  min-width: 0;
  overflow-wrap: anywhere;
}

.listening-audio-actions {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.625rem;
}

.listening-audio-actions .btn {
  min-width: 0;
  min-height: 2.75rem;
  white-space: normal;
}
```

- [ ] **步驟 4：加入窄手機與橫式規則**

```css
@media (max-width: 359px) {
  .listening-rate-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .listening-audio-actions {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (orientation: landscape) and (max-height: 600px) {
  .listening-audio-drawer {
    max-height: calc(100dvh - env(safe-area-inset-top, 0px));
  }

  .listening-audio-drawer__body {
    padding-block: 0.625rem;
  }
}
```

不得使用無上限 `vw` 字體；文字沿用現有 `rem`／`clamp()` 基準。所有 grid child 保留 `min-width: 0`，重要名稱允許換行，不以 ellipsis 截斷。

- [ ] **步驟 5：執行響應式測試確認綠燈**

執行：

```bash
npx playwright test tests/responsive-ui.spec.ts --project=chromium
```

預期：320、390、430、768、1024、1440px 及手機橫式全部 PASS，頁面無水平溢位且主要操作至少 44px。

## 任務 9：證明音訊控制不修改 SRS，並完成文件與全套驗證

**檔案：**

- 修改：`tests/listening-srs-invariants.spec.ts:1-39`
- 修改：`README.md`
- 修改：`docs/i18n/README-en.md`
- 修改：`CHANGELOG.md`
- 修改：`docs/continuous-listening-manual-qa.md`

- [ ] **步驟 1：擴充 SRS 資料守恆測試**

在 `tests/listening-srs-invariants.spec.ts` 的 UI 測試中，讀取 `before` 後加入：

```ts
await page.getByTestId('listening-audio-open').click();
await page.getByTestId('listening-rate-1-5').click();
await page.getByLabel(/English Natural/).check();
await page.getByTestId('listening-audio-preview').click();
await expect.poll(() => page.evaluate(() => (
  window as unknown as { __speechHarness: { requests: unknown[] } }
).__speechHarness.requests.length)).toBeGreaterThan(0);
await page.evaluate(() => (
  window as unknown as { __speechHarness: { finishCurrent: () => void } }
).__speechHarness.finishCurrent());
await page.getByTestId('listening-audio-close').click();
```

保留測試最後：

```ts
expect(await readSrsSnapshot(page)).toEqual(before);
```

靜態 seam 測試要把新檔加入來源：

```ts
readFile('src/components/ListeningAudioDrawer.tsx', 'utf8'),
```

- [ ] **步驟 2：執行守恆測試**

執行：

```bash
npx playwright test tests/listening-srs-invariants.spec.ts --project=chromium
```

預期：PASS；選倍速、選聲音、試聽、正式播放、上一張與下一張皆不改動 cards／reports。

- [ ] **步驟 3：更新使用者文件**

在中英文 README 的連續聆聽段落加入：

```md
- 播放速度：0.5×、0.75×、0.85×、1×、1.25×、1.5×、1.75×、2×，預設 0.85×。
- 首選聲音來自目前瀏覽器／作業系統；換裝置找不到或語言不相容時會自動備援。
- 變更速度或聲音不會中止目前正式朗讀，下一遍開始套用；「試聽」會中止目前這一遍並保持暫停。
```

英文對應：

```md
- Playback rates: 0.5×, 0.75×, 0.85×, 1×, 1.25×, 1.5×, 1.75×, and 2×; default 0.85×.
- Preferred voices come from the current browser and operating system. Missing or incompatible voices automatically fall back to a compatible voice.
- Rate and voice changes apply from the next repetition without interrupting the active utterance. Preview interrupts that repetition and leaves playback paused.
```

在 `CHANGELOG.md` 目前版本的 Added／Changed 區記錄：音訊 bottom sheet、八段倍速、裝置 voice、fallback、試聽、localStorage／backup v3 相容。

在 `docs/continuous-listening-manual-qa.md` 加入以下逐平台檢查：

```md
### Windows Chrome / Edge
1. 開啟連續聆聽 → 音訊設定。
2. 記錄 Chrome 與 Edge 各自顯示的 voice 名稱。
3. 逐一選擇八個倍速並試聽，確認摘要與實際 request 一致。
4. 播放中改速，確認目前這一遍不中斷、下一遍才套用。

### Android Chrome / PWA
1. 確認初次開啟時 loading 最終結束。
2. 切換本機／可能需網路 voice，斷網後確認失敗可恢復且不會無限重試。
3. 背景再回前景，確認保持暫停並由使用者手勢恢復。

### iPhone Safari / PWA
1. 以點擊試聽啟動語音，確認不嘗試自動播放。
2. 鎖屏再返回，確認舊 callback 不推進卡片。
3. 若首選 voice 不存在，確認顯示原名稱與「目前無法使用」，正式播放仍可 fallback。

### 跨 Profile / 裝置
1. 匯出含首選 voice 的完整備份。
2. 在沒有該 voice 的 Profile 匯入。
3. 確認倍速保留、首選名稱仍顯示、播放使用相容 fallback。
```

- [ ] **步驟 4：執行 targeted 回歸**

執行：

```bash
npx playwright test \
  tests/listening-preferences.spec.ts \
  tests/speech-engine.spec.ts \
  tests/playback-controller.spec.ts \
  tests/listening-mode.spec.ts \
  tests/listening-srs-invariants.spec.ts \
  tests/responsive-ui.spec.ts \
  tests/backup.spec.ts \
  tests/sync.spec.ts \
  tests/cloud-sync-controller.spec.ts \
  --project=chromium
```

預期：全部 PASS。

- [ ] **步驟 5：執行專案可用的完整驗證**

`package.json` 沒有獨立 `typecheck` 與 `test` script；`npm run build` 內含 `tsc -b`，測試使用 Playwright CLI。

執行：

```bash
npm run lint
npx playwright test
npm run build
git diff --check
git status --short
```

預期：

- `npm run lint`：exit code `0`，0 errors。
- `npx playwright test`：全部 Playwright 測試 PASS。
- `npm run build`：`tsc -b` 與 Vite production build exit code `0`。
- `git diff --check`：exit code `0`，沒有 whitespace error。
- `git status --short`：只用來盤點；不得因既有 dirty worktree 而清除、還原或提交任何檔案。

- [ ] **步驟 6：啟動 WSL2 可供 Windows 瀏覽器驗收的伺服器**

執行：

```bash
npm run dev -- --host 0.0.0.0
```

預期：Vite 顯示 `Local` 與 `Network` URL。Windows 若無法使用 `http://localhost:5173/`，改用 Vite 顯示的 WSL2 Network URL，例如 `http://172.x.x.x:5173/`；不得把範例 IP 當成固定地址。

## 完成條件對照

- 倍速八個固定值、預設與引擎皆為 `0.85`：任務 1、3、4、6、7。
- 變更從下一遍生效且不取消目前 utterance：任務 4。
- 單一首選 voice、同主要語言相容、跨裝置 name＋lang 找回與自動 fallback：任務 1、3、7。
- 相容 voice 優先、可顯示全部、遺失 voice 可見：任務 3、6、7。
- 正式播放中試聽會取消目前遍、完成後暫停、播放可重啟該遍：任務 4、6、7。
- localStorage、舊資料、portable backup v3 與 Google Drive 完整同步相容：任務 1、2。
- X、Escape、遮罩、focus trap、焦點還原與 44px 點擊區：任務 6、8。
- 320～1440px 與手機橫式無溢位：任務 8。
- cards／reports 零寫入：任務 9。
- Windows／Android／iPhone 的平台限制有明確人工驗收：任務 9。
