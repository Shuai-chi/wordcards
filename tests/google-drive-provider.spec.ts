import { expect, test } from '@playwright/test';
import {
  createBackupEnvelope,
  type BackupEnvelopeV1,
  type BackupPayloadV1,
} from '../src/lib/backup';
import type {
  DriveAppDataFile,
  DriveAppDataTransport,
} from '../src/lib/googleDriveTransport';
import {
  GoogleDriveDataError,
  GoogleDriveSyncProvider,
  type DriveSnapshotDocumentV1,
} from '../src/lib/googleDriveSyncProvider';
import {
  SyncPreconditionError,
  SyncRemoteDivergenceError,
  synchronize,
  type LocalSyncStore,
  type SyncMetadataV1,
} from '../src/lib/sync';

interface StoredFile {
  metadata: DriveAppDataFile;
  text: string;
}

class MemoryDriveTransport implements DriveAppDataTransport {
  readonly files = new Map<string, StoredFile>();
  createCount = 0;
  deleteCount = 0;
  private idCounter = 0;

  listFiles = async () => [...this.files.values()].map(file => structuredClone(file.metadata));

  downloadText = async (fileId: string) => {
    const file = this.files.get(fileId);
    if (!file) throw new Error('missing_fake_file');
    return file.text;
  };

  createJsonFile = async (input: {
    name: string;
    appProperties: Record<string, string>;
    text: string;
  }) => {
    const id = `file-${++this.idCounter}`;
    const timestamp = `2026-07-23T00:00:${String(this.idCounter).padStart(2, '0')}.000Z`;
    const metadata: DriveAppDataFile = {
      id,
      name: input.name,
      createdTime: timestamp,
      modifiedTime: timestamp,
      size: new TextEncoder().encode(input.text).byteLength,
      appProperties: structuredClone(input.appProperties),
    };
    this.files.set(id, { metadata, text: input.text });
    this.createCount += 1;
    return structuredClone(metadata);
  };

  deleteFile = async (fileId: string) => {
    if (this.files.delete(fileId)) this.deleteCount += 1;
  };

  async insertSnapshot(document: DriveSnapshotDocumentV1): Promise<string> {
    const metadata = await this.createJsonFile({
      name: `wordforge-snapshot-${document.revision}.json`,
      appProperties: {
        wordforgeKind: 'snapshot',
        wordforgeRevision: document.revision,
        wordforgeParent: document.parentRevision ?? '',
        wordforgeOperation: `manual-${document.revision}`,
      },
      text: JSON.stringify(document),
    });
    return metadata.id;
  }

  snapshotFiles(): StoredFile[] {
    return [...this.files.values()].filter(
      file => file.metadata.appProperties.wordforgeKind === 'snapshot',
    );
  }

  conflictFiles(): StoredFile[] {
    return [...this.files.values()].filter(
      file => file.metadata.appProperties.wordforgeKind === 'conflict',
    );
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
      group: 'drive-provider-test',
      front: label,
      back: `back-${label}`,
      state: 'learning',
      interval: 1,
      easeFactor: 2.5,
      failCount: 0,
      hardCount: 0,
      introducedDate: '2026-07-23',
      lastReviewedDate: '2026-07-23',
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

class LocalDevice implements LocalSyncStore {
  metadata: SyncMetadataV1 | null = null;

  constructor(readonly current: BackupEnvelopeV1) {}

  readSnapshot = async () => structuredClone(this.current);
  replaceSnapshot = async () => undefined;
  readMetadata = async () => structuredClone(this.metadata);
  writeMetadata = async (metadata: SyncMetadataV1) => {
    this.metadata = structuredClone(metadata);
  };
}

test('creates a root then a child and returns the single current head', async () => {
  const drive = new MemoryDriveTransport();
  const provider = new GoogleDriveSyncProvider(drive);
  const root = await provider.putCurrent(await snapshot('root'), {
    expectedRevision: null,
    operationId: 'upload-root',
  });
  const child = await provider.putCurrent(await snapshot('child'), {
    expectedRevision: root.revision,
    operationId: 'upload-child',
  });

  expect(root.parentRevision).toBeNull();
  expect(child.parentRevision).toBe(root.revision);
  await expect(provider.getCurrent()).resolves.toEqual(child);
  expect(drive.snapshotFiles()).toHaveLength(2);
});

test('retries an operation idempotently without creating a duplicate snapshot', async () => {
  const drive = new MemoryDriveTransport();
  const provider = new GoogleDriveSyncProvider(drive);
  const envelope = await snapshot('same-operation');
  const first = await provider.putCurrent(envelope, {
    expectedRevision: null,
    operationId: 'upload-same-operation',
  });
  const createCount = drive.createCount;

  const retried = await provider.putCurrent(envelope, {
    expectedRevision: null,
    operationId: 'upload-same-operation',
  });

  expect(retried).toEqual(first);
  expect(drive.createCount).toBe(createCount);
});

test('rejects an upload whose expected revision is not the current head', async () => {
  const drive = new MemoryDriveTransport();
  const provider = new GoogleDriveSyncProvider(drive);
  await provider.putCurrent(await snapshot('root'), {
    expectedRevision: null,
    operationId: 'upload-root',
  });

  await expect(provider.putCurrent(await snapshot('stale'), {
    expectedRevision: 'r-stale',
    operationId: 'upload-stale',
  })).rejects.toBeInstanceOf(SyncPreconditionError);
  expect(drive.snapshotFiles()).toHaveLength(1);
});

test('two children from one parent become a preserved remote divergence', async () => {
  const drive = new MemoryDriveTransport();
  const provider = new GoogleDriveSyncProvider(drive);
  const root = await provider.putCurrent(await snapshot('root'), {
    expectedRevision: null,
    operationId: 'upload-root',
  });
  const branchA = await snapshot('branch-a');
  const branchB = await snapshot('branch-b');
  await drive.insertSnapshot({
    schemaVersion: 1,
    kind: 'snapshot',
    revision: 'r-branch-a',
    parentRevision: root.revision,
    operationId: 'manual-branch-a',
    envelope: branchA,
  });
  await drive.insertSnapshot({
    schemaVersion: 1,
    kind: 'snapshot',
    revision: 'r-branch-b',
    parentRevision: root.revision,
    operationId: 'manual-branch-b',
    envelope: branchB,
  });

  await expect(provider.getCurrent()).rejects.toBeInstanceOf(
    SyncRemoteDivergenceError,
  );
  expect(drive.snapshotFiles()).toHaveLength(3);

  const result = await synchronize(new LocalDevice(await snapshot('local')), provider);
  expect(result.status).toBe('conflict');
  if (result.status === 'conflict') expect(result.conflictId).toMatch(/^cloud-/);
});

test('keeps only current and previous after a third sequential revision', async () => {
  const drive = new MemoryDriveTransport();
  const provider = new GoogleDriveSyncProvider(drive);
  const first = await provider.putCurrent(await snapshot('one'), {
    expectedRevision: null,
    operationId: 'upload-one',
  });
  const second = await provider.putCurrent(await snapshot('two'), {
    expectedRevision: first.revision,
    operationId: 'upload-two',
  });
  const third = await provider.putCurrent(await snapshot('three'), {
    expectedRevision: second.revision,
    operationId: 'upload-three',
  });

  const revisions = drive.snapshotFiles()
    .map(file => file.metadata.appProperties.wordforgeRevision)
    .sort();
  expect(revisions).toEqual([second.revision, third.revision].sort());
  expect(drive.deleteCount).toBe(1);
});

test('conflict copies are complete and idempotent by operation id', async () => {
  const drive = new MemoryDriveTransport();
  const provider = new GoogleDriveSyncProvider(drive);
  const remote = await provider.putCurrent(await snapshot('remote'), {
    expectedRevision: null,
    operationId: 'upload-remote',
  });
  const local = await snapshot('local');

  const first = await provider.saveConflictCopy(local, remote, {
    baseRevision: null,
    operationId: 'conflict-local-remote',
  });
  const createCount = drive.createCount;
  const retried = await provider.saveConflictCopy(local, remote, {
    baseRevision: null,
    operationId: 'conflict-local-remote',
  });

  expect(retried).toEqual(first);
  expect(drive.createCount).toBe(createCount);
  expect(drive.conflictFiles()).toHaveLength(1);
  const stored = JSON.parse(drive.conflictFiles()[0].text);
  expect(stored.local.manifest.payloadHash).toBe(local.manifest.payloadHash);
  expect(stored.remote.manifest.payloadHash).toBe(remote.envelope.manifest.payloadHash);
});

test('invalid hashes and inconsistent duplicate revisions fail closed', async () => {
  const corruptDrive = new MemoryDriveTransport();
  const corruptProvider = new GoogleDriveSyncProvider(corruptDrive);
  const corruptEnvelope = await snapshot('corrupt');
  corruptEnvelope.payload.decks[0].name = 'hash mismatch';
  await corruptDrive.insertSnapshot({
    schemaVersion: 1,
    kind: 'snapshot',
    revision: 'r-corrupt',
    parentRevision: null,
    operationId: 'manual-corrupt',
    envelope: corruptEnvelope,
  });
  await expect(corruptProvider.getCurrent()).rejects.toThrow('hash_mismatch');

  const duplicateDrive = new MemoryDriveTransport();
  const duplicateProvider = new GoogleDriveSyncProvider(duplicateDrive);
  await duplicateDrive.insertSnapshot({
    schemaVersion: 1,
    kind: 'snapshot',
    revision: 'r-duplicate',
    parentRevision: null,
    operationId: 'manual-duplicate-a',
    envelope: await snapshot('duplicate-a'),
  });
  await duplicateDrive.insertSnapshot({
    schemaVersion: 1,
    kind: 'snapshot',
    revision: 'r-duplicate',
    parentRevision: null,
    operationId: 'manual-duplicate-b',
    envelope: await snapshot('duplicate-b'),
  });
  await expect(duplicateProvider.getCurrent()).rejects.toBeInstanceOf(
    GoogleDriveDataError,
  );
});

test('deleting cloud data targets WordForge files and leaves unrelated appData intact', async () => {
  const drive = new MemoryDriveTransport();
  const provider = new GoogleDriveSyncProvider(drive);
  await provider.putCurrent(await snapshot('remote'), {
    expectedRevision: null,
    operationId: 'upload-remote',
  });
  await drive.createJsonFile({
    name: 'unrelated.json',
    appProperties: { anotherFeature: 'true' },
    text: '{}',
  });

  await expect(provider.deleteAllData()).resolves.toBe(1);
  expect(drive.files.size).toBe(1);
  expect([...drive.files.values()][0].metadata.name).toBe('unrelated.json');
});
