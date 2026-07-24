import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import {
  createBackupEnvelope,
  hashBackupPayload,
  importBackupText,
  validateBackupText,
  type BackupIconAssetV2,
  type BackupPayloadV1,
  type BackupRepository,
} from '../src/lib/backup';
import {
  createDefaultListeningPreferences,
  LISTENING_PREFERENCES_STORAGE_KEY,
} from '../src/lib/listeningPreferences';

function samplePayload(): BackupPayloadV1 {
  return {
    settings: {
      uiLanguage: 'zh-TW',
      definitionLanguage: 'deck',
      globalDailyLimit: 30,
      selectedDeckIds: ['deck-1'],
      appearance: {
        schemaVersion: 1,
        mode: 'light',
        light: { presetId: 'forest' },
        dark: { presetId: 'midnight' },
        updatedAt: '2026-07-20T00:00:00.000Z',
      },
    },
    decks: [{ id: 'deck-1', name: 'Starter', cardCount: 1 }],
    cards: [{
      id: 'card-1',
      deckId: 'deck-1',
      group: 'Basics',
      front: 'hello',
      back: '你好',
      state: 'learning',
      interval: 2,
      easeFactor: 2.5,
      failCount: 0,
      hardCount: 1,
      introducedDate: '2026-07-19',
      lastReviewedDate: '2026-07-20',
    }],
    reports: [{
      dateStr: '2026-07-20',
      uniqueCards: 1,
      clicks: { again: 0, hard: 1, good: 0, easy: 0 },
    }],
  };
}

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

async function sampleBackupIcon(
  profileId: 'profile-1' | 'profile-2' = 'profile-1',
  slot: 'vocab' | 'phrase' = 'vocab',
): Promise<BackupIconAssetV2> {
  const jpeg = await readFile(resolve('public/pwa-192.png'));
  return {
    id: `${profileId}:${slot}`,
    profileId,
    slot,
    base64: jpeg.toString('base64'),
    mimeType: 'image/jpeg',
    fileName: `${profileId}-${slot}.jpg`,
    fit: 'contain',
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    updatedAt: '2026-07-20T00:00:00.000Z',
  };
}

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  failNextWrite = false;
  failOnKey: string | null = null;

  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) {
    if (this.failNextWrite || this.failOnKey === key) {
      this.failNextWrite = false;
      this.failOnKey = null;
      throw new Error('quota exceeded');
    }
    this.values.set(key, value);
  }
}

test.describe('versioned portable backups', () => {
  test('creates and validates a backup without secure-context crypto APIs', async () => {
    const nativeCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        getRandomValues: nativeCrypto.getRandomValues.bind(nativeCrypto),
      },
    });

    try {
      const envelope = await createBackupEnvelope(samplePayload(), {
        createdAt: '2026-07-23T00:00:00.000Z',
        appVersion: '1.1.0',
      });
      const validated = await validateBackupText(JSON.stringify(envelope));

      expect(envelope.manifest.snapshotId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(envelope.manifest.payloadHash).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(validated.envelope.manifest.payloadHash).toBe(envelope.manifest.payloadHash);
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: nativeCrypto,
      });
    }
  });

  test('creates a deterministic hash and validates a complete backup', async () => {
    const envelope = await createBackupEnvelope(samplePayload(), {
      createdAt: '2026-07-20T01:02:03.000Z',
      snapshotId: 'snapshot-test',
      appVersion: '1.1.0',
    });

    const dryRun = await validateBackupText(JSON.stringify(envelope));

    expect(envelope.manifest.payloadHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(envelope.manifest.schemaVersion).toBe(3);
    expect(dryRun.summary).toEqual({ decks: 1, cards: 1, reports: 1, iconAssets: 0 });
    expect(dryRun.envelope.payload.settings.appearance).toEqual(samplePayload().settings.appearance);
    expect(dryRun.envelope.payload.settings.uiPreferences).toMatchObject({ schemaVersion: 1 });
    expect(dryRun.envelope.payload.iconAssets).toEqual([]);
  });

  test('migrates a valid schema v1 backup to safe default UI preferences and no icons', async () => {
    const legacy = await makeLegacyV1();

    const migrated = await validateBackupText(JSON.stringify(legacy));

    expect(migrated.envelope.manifest.schemaVersion).toBe(3);
    expect(migrated.envelope.payload.settings.uiPreferences).toMatchObject({
      schemaVersion: 1,
      activeIconProfileId: 'profile-1',
    });
    expect(migrated.envelope.payload.iconAssets).toEqual([]);
  });

  test('exports and validates schema v3 listening preferences', async () => {
    const payload = samplePayload();
    payload.settings.listeningPreferences = {
      ...createDefaultListeningPreferences('2026-07-23T00:00:00.000Z'),
      source: 'all',
      frontRepeats: 3,
      exampleRepeats: 2,
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
      source: 'all',
      frontRepeats: 3,
      exampleRepeats: 2,
      playbackRate: 1.5,
      preferredVoice: {
        voiceURI: 'urn:voice:ava',
        name: 'Microsoft Ava',
        lang: 'en-US',
      },
    });
  });

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

  test('migrates schema v1 and v2 to default listening preferences', async () => {
    for (const legacy of [await makeLegacyV1(), await makeLegacyV2()]) {
      const migrated = await validateBackupText(JSON.stringify(legacy));
      expect(migrated.envelope.manifest.schemaVersion).toBe(3);
      expect(migrated.envelope.payload.settings.listeningPreferences).toMatchObject({
        schemaVersion: 1,
        frontRepeats: 1,
        exampleRepeats: 1,
        playbackRate: 0.85,
        preferredVoice: null,
      });
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

  test('round-trips validated image bytes and per-image frame transforms', async () => {
    const jpeg = await readFile(resolve('public/pwa-192.png'));
    const payload = samplePayload();
    const icon: BackupIconAssetV2 = {
      id: 'profile-2:vocab',
      profileId: 'profile-2',
      slot: 'vocab',
      base64: jpeg.toString('base64'),
      mimeType: 'image/jpeg',
      fileName: 'travel.jpg',
      fit: 'cover',
      zoom: 1.5,
      offsetX: 12,
      offsetY: -8,
      updatedAt: '2026-07-20T00:00:00.000Z',
    };
    payload.iconAssets = [icon];
    payload.settings.uiPreferences = {
      schemaVersion: 1,
      scales: {
        base: 1,
        pageHeading: 1,
        cardTitle: 1,
        cardBody: 1,
        statNumber: 1.3,
        icon: 1.25,
        studyPrompt: 1,
        studyContent: 1,
      },
      iconProfiles: [
        { id: 'profile-1', name: '設定 1' },
        { id: 'profile-2', name: '旅行圖標' },
        { id: 'profile-3', name: '設定 3' },
      ],
      activeIconProfileId: 'profile-2',
      updatedAt: '2026-07-20T00:00:00.000Z',
    };

    const dryRun = await validateBackupText(JSON.stringify(await createBackupEnvelope(payload)));

    expect(dryRun.summary.iconAssets).toBe(1);
    expect(dryRun.envelope.payload.iconAssets?.[0]).toEqual(icon);
    expect(dryRun.envelope.payload.settings.uiPreferences).toEqual(payload.settings.uiPreferences);
  });

  test('rejects an icon whose declared MIME does not match its bytes', async () => {
    const payload = samplePayload();
    payload.iconAssets = [{
      id: 'profile-1:vocab', profileId: 'profile-1', slot: 'vocab',
      base64: Buffer.from('not-a-png').toString('base64'), mimeType: 'image/png', fileName: 'fake.png',
      fit: 'contain', zoom: 1, offsetX: 0, offsetY: 0, updatedAt: '2026-07-20T00:00:00.000Z',
    }];
    const envelope = await createBackupEnvelope(payload);

    await expect(validateBackupText(JSON.stringify(envelope))).rejects.toThrow(/invalid_icon_signature/);
  });

  test('rejects duplicate icon slots and decoded image data over 512 KiB', async () => {
    const duplicate = samplePayload();
    const icon = await sampleBackupIcon();
    duplicate.iconAssets = [icon, { ...icon }];
    await expect(validateBackupText(JSON.stringify(await createBackupEnvelope(duplicate))))
      .rejects.toThrow(/duplicate_icon_id/);

    const oversizedBytes = Buffer.alloc(512 * 1024 + 1);
    Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]).copy(oversizedBytes);
    const oversized = samplePayload();
    oversized.iconAssets = [{
      ...icon,
      base64: oversizedBytes.toString('base64'),
      fileName: 'oversized.jpg',
    }];
    await expect(validateBackupText(JSON.stringify(await createBackupEnvelope(oversized))))
      .rejects.toThrow(/icon_file_too_large/);
  });

  test('keeps the payload hash stable when optional IndexedDB fields are undefined', async () => {
    const payload = samplePayload();
    payload.cards[0].definition = undefined;
    const envelope = await createBackupEnvelope(payload);

    await expect(validateBackupText(JSON.stringify(envelope))).resolves.toBeTruthy();
  });

  test('rejects corrupt JSON, an unknown schema, and a mismatched hash', async () => {
    await expect(validateBackupText('{broken')).rejects.toThrow(/invalid_json/);

    const unknownSchema = await createBackupEnvelope(samplePayload());
    unknownSchema.manifest.schemaVersion = 99;
    await expect(validateBackupText(JSON.stringify(unknownSchema))).rejects.toThrow(/unsupported_schema/);

    const tampered = await createBackupEnvelope(samplePayload());
    tampered.payload.cards[0].front = 'tampered';
    await expect(validateBackupText(JSON.stringify(tampered))).rejects.toThrow(/hash_mismatch/);
  });

  test('rejects duplicate IDs, orphan cards, empty decks, and oversized files', async () => {
    const duplicate = samplePayload();
    duplicate.cards.push({ ...duplicate.cards[0] });
    await expect(validateBackupText(JSON.stringify(await createBackupEnvelope(duplicate))))
      .rejects.toThrow(/duplicate_card_id/);

    const orphan = samplePayload();
    orphan.cards[0].deckId = 'missing-deck';
    await expect(validateBackupText(JSON.stringify(await createBackupEnvelope(orphan))))
      .rejects.toThrow(/orphan_card/);

    const emptyDeck = samplePayload();
    emptyDeck.cards = [];
    await expect(validateBackupText(JSON.stringify(await createBackupEnvelope(emptyDeck))))
      .rejects.toThrow(/empty_deck/);

    const validText = JSON.stringify(await createBackupEnvelope(samplePayload()));
    await expect(validateBackupText(validText, 20)).rejects.toThrow(/file_too_large/);
  });

  test('restores the prior repository snapshot when settings cannot be written', async () => {
    const prior = samplePayload();
    prior.decks[0].name = 'Keep me';
    prior.iconAssets = [{ ...await sampleBackupIcon(), fileName: 'keep-me.jpg' }];
    const replacement = samplePayload();
    replacement.decks[0].name = 'Incoming';
    replacement.iconAssets = [{ ...await sampleBackupIcon(), fileName: 'incoming.jpg' }];
    const writes: BackupPayloadV1[] = [];
    let current = structuredClone(prior);
    const repository: BackupRepository = {
      readAll: async () => structuredClone(current),
      replaceAll: async next => {
        current = structuredClone(next);
        writes.push(structuredClone(next));
      },
    };
    const storage = new MemoryStorage();
    storage.setItem('srs_ui_lang', 'en');
    storage.failNextWrite = true;

    await expect(importBackupText(
      JSON.stringify(await createBackupEnvelope(replacement)),
      repository,
      storage,
    )).rejects.toThrow(/import_rolled_back/);

    expect(writes).toHaveLength(2);
    expect(current.decks[0].name).toBe('Keep me');
    expect(current.iconAssets?.[0].fileName).toBe('keep-me.jpg');
    expect(storage.getItem('srs_ui_lang')).toBe('en');
  });

  test('restores the previous listening preference when its import write fails', async () => {
    const prior = samplePayload();
    prior.decks[0].name = 'Keep me';
    const replacement = samplePayload();
    replacement.decks[0].name = 'Incoming';
    replacement.settings.listeningPreferences = {
      ...createDefaultListeningPreferences(),
      frontRepeats: 2,
      playbackRate: 1.75,
    };
    let current = structuredClone(prior);
    const repository: BackupRepository = {
      readAll: async () => structuredClone(current),
      replaceAll: async next => { current = structuredClone(next); },
    };
    const storage = new MemoryStorage();
    storage.setItem(
      LISTENING_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        ...createDefaultListeningPreferences(),
        frontRepeats: 4,
        playbackRate: 0.75,
      }),
    );
    storage.failOnKey = LISTENING_PREFERENCES_STORAGE_KEY;

    await expect(importBackupText(
      JSON.stringify(await createBackupEnvelope(replacement)),
      repository,
      storage,
    )).rejects.toThrow('import_rolled_back');

    expect(current.decks[0].name).toBe('Keep me');
    expect(JSON.parse(storage.getItem(LISTENING_PREFERENCES_STORAGE_KEY)!)).toMatchObject({
      frontRepeats: 4,
      playbackRate: 0.75,
    });
  });
});

test('exports and restores settings, decks, progress, and reports in a fresh profile', async ({ page, browser }) => {
  const jpeg = await readFile(resolve('public/pwa-192.png'));
  await page.goto('/');
  await page.locator('input[type="file"][accept=".csv"]').setInputFiles(
    resolve('sample-decks/Phrases/[片語]Everyday_Phrases_Sample.csv'),
  );
  await expect(page.getByText(/成功匯入 1 個套牌/)).toBeVisible();

  await page.getByTitle('設定').click();
  await page.getByTestId('theme-mode-dark').click();
  await page.getByTestId('theme-preset-graphite-rose').click();
  await page.getByRole('tab', { name: '圖標' }).click();
  await page.getByTestId('icon-profile-name').fill('備份圖標');
  await page.getByTestId('icon-upload-vocab').setInputFiles({
    name: 'backup.jpg', mimeType: 'image/jpeg', buffer: jpeg,
  });
  await page.getByTestId('icon-zoom-vocab').fill('1.25');
  await page.getByTestId('settings-save').click();
  await expect(page.getByTestId('settings-save-state')).toContainText('已儲存');
  await page.getByTestId('settings-close').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('button', { name: /片語.*1 個牌組/ }).click();
  await page.getByRole('checkbox').first().click();
  await page.getByRole('button', { name: /開始練習/ }).click();
  await page.getByRole('button', { name: '點擊或按空白鍵翻牌' }).click();
  await page.getByRole('button', { name: /良好/ }).click();

  await page.getByTitle('設定').click();
  await page.getByRole('tab', { name: '一般與備份' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('backup-export').click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  expect(backupPath).not.toBeNull();

  const freshContext = await browser.newContext();
  const freshPage = await freshContext.newPage();
  await freshPage.goto('/');
  await freshPage.getByTitle('設定').click();
  await freshPage.getByRole('tab', { name: '一般與備份' }).click();
  await freshPage.getByTestId('backup-import-input').setInputFiles(backupPath!);
  await expect(freshPage.getByTestId('backup-import-summary'))
    .toContainText('偵測到 1 個套牌、12 張卡片、1 份報表。');
  await freshPage.getByTestId('backup-import-confirm').click();

  await expect(freshPage.locator('html')).toHaveAttribute('data-theme-preset', 'graphite-rose');
  const restored = await freshPage.evaluate(() => new Promise<{
    cards: Array<{ todayRating?: string }>;
    reports: Array<{ uniqueCards: number }>;
  }>((resolveSnapshot, rejectSnapshot) => {
    const open = indexedDB.open('SRS_DB', 2);
    open.onerror = () => rejectSnapshot(open.error);
    open.onsuccess = () => {
      const database = open.result;
      const transaction = database.transaction(['cards', 'reports'], 'readonly');
      const cardsRequest = transaction.objectStore('cards').getAll();
      const reportsRequest = transaction.objectStore('reports').getAll();
      transaction.oncomplete = () => {
        resolveSnapshot({ cards: cardsRequest.result, reports: reportsRequest.result });
        database.close();
      };
      transaction.onerror = () => rejectSnapshot(transaction.error);
    };
  }));
  expect(restored.cards.some(card => card.todayRating === 'good')).toBe(true);
  expect(restored.reports).toHaveLength(1);
  expect(restored.reports[0].uniqueCards).toBe(1);
  await freshPage.getByRole('button', { name: /片語.*1 個牌組/ }).click();
  await expect(freshPage.getByRole('checkbox')).toHaveCount(1);
  await freshPage.reload();
  await expect(freshPage.getByTestId('mode-card-vocab').getByTestId('custom-icon').locator('img')).toBeVisible();
  await freshPage.getByTitle('設定').click();
  await freshPage.getByRole('tab', { name: '圖標' }).click();
  await expect(freshPage.getByTestId('icon-profile-name')).toHaveValue('備份圖標');
  await expect(freshPage.getByTestId('icon-zoom-value-vocab')).toHaveText('125%');
  await freshPage.getByRole('tab', { name: '一般與備份' }).click();
  await expect(freshPage.getByTestId('backup-export')).toBeVisible();
  await freshContext.close();
});
