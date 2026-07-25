import { expect, test } from '@playwright/test';
import {
  createBackupEnvelope,
  type BackupEnvelopeV1,
  type BackupPayloadV1,
} from '../src/lib/backup';
import {
  SYNC_METADATA_STORAGE_KEY,
  createBrowserSyncStore,
} from '../src/lib/browserSyncStore';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }
}

function payload(label: string): BackupPayloadV1 {
  return {
    settings: {
      uiLanguage: 'zh-TW',
      definitionLanguage: 'deck',
      globalDailyLimit: 30,
      selectedDeckIds: ['deck-1'],
      appearance: {
        schemaVersion: 1,
        mode: 'light',
        light: { presetId: 'ocean' },
        dark: { presetId: 'midnight' },
        updatedAt: '2026-07-23T00:00:00.000Z',
      },
    },
    decks: [{ id: 'deck-1', name: label, cardCount: 1 }],
    cards: [{
      id: 'card-1',
      deckId: 'deck-1',
      group: 'sync-store-test',
      front: label,
      back: `back-${label}`,
      state: 'new',
      interval: 0,
      easeFactor: 2.5,
      failCount: 0,
      hardCount: 0,
      introducedDate: '',
      lastReviewedDate: '',
    }],
    reports: [],
  };
}

async function snapshot(label: string): Promise<BackupEnvelopeV1> {
  return createBackupEnvelope(payload(label), {
    createdAt: '2026-07-23T00:00:00.000Z',
    snapshotId: `snapshot-${label}`,
  });
}

test('invalid or incomplete sync metadata fails closed', async () => {
  const storage = new MemoryStorage();
  const current = await snapshot('current');
  const store = createBrowserSyncStore(storage, {
    readSnapshot: async () => current,
    replaceSnapshot: async () => undefined,
  });

  for (const invalid of [
    '{',
    '{}',
    '{"schemaVersion":2,"baseRevision":"r1","basePayloadHash":"sha256:a"}',
    '{"schemaVersion":1,"baseRevision":"","basePayloadHash":"sha256:a"}',
    '{"schemaVersion":1,"baseRevision":"r1","basePayloadHash":""}',
  ]) {
    storage.setItem(SYNC_METADATA_STORAGE_KEY, invalid);
    expect(await store.readMetadata()).toBeNull();
  }
});

test('sync metadata round-trips only the schema fields', async () => {
  const storage = new MemoryStorage();
  const current = await snapshot('current');
  const store = createBrowserSyncStore(storage, {
    readSnapshot: async () => current,
    replaceSnapshot: async () => undefined,
  });

  await store.writeMetadata({
    schemaVersion: 1,
    baseRevision: 'r1',
    basePayloadHash: 'sha256:abc',
  });

  expect(await store.readMetadata()).toEqual({
    schemaVersion: 1,
    baseRevision: 'r1',
    basePayloadHash: 'sha256:abc',
  });
  expect(JSON.parse(storage.getItem(SYNC_METADATA_STORAGE_KEY) ?? '{}')).toEqual({
    schemaVersion: 1,
    baseRevision: 'r1',
    basePayloadHash: 'sha256:abc',
  });
});

test('snapshot reads and replacements validate the portable backup envelope', async () => {
  const storage = new MemoryStorage();
  const current = await snapshot('current');
  const replacement = await snapshot('replacement');
  const replaced: BackupEnvelopeV1[] = [];
  const store = createBrowserSyncStore(storage, {
    readSnapshot: async () => structuredClone(current),
    replaceSnapshot: async next => {
      replaced.push(structuredClone(next));
    },
  });

  expect((await store.readSnapshot()).manifest.payloadHash).toBe(current.manifest.payloadHash);
  await store.replaceSnapshot(replacement);
  expect(replaced).toHaveLength(1);
  expect(replaced[0].manifest.payloadHash).toBe(replacement.manifest.payloadHash);

  const corrupt = structuredClone(replacement);
  corrupt.payload.decks[0].name = 'hash no longer matches';
  await expect(store.replaceSnapshot(corrupt)).rejects.toThrow('hash_mismatch');
  expect(replaced).toHaveLength(1);
});

test('an invalid adapter snapshot is rejected before synchronization can use it', async () => {
  const storage = new MemoryStorage();
  const corrupt = await snapshot('corrupt');
  corrupt.manifest.payloadHash = 'sha256:not-the-real-hash';
  const store = createBrowserSyncStore(storage, {
    readSnapshot: async () => corrupt,
    replaceSnapshot: async () => undefined,
  });

  await expect(store.readSnapshot()).rejects.toThrow('hash_mismatch');
});
