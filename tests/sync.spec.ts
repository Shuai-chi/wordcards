import { test, expect } from '@playwright/test';
import { createBackupEnvelope, type BackupEnvelopeV1, type BackupPayloadV1 } from '../src/lib/backup';
import {
  InMemorySyncProvider,
  resolveSyncConflict,
  synchronize,
  type LocalSyncStore,
  type SyncMetadataV1,
} from '../src/lib/sync';

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
        updatedAt: '2026-07-20T00:00:00.000Z',
      },
    },
    decks: [{ id: 'deck-1', name: label, cardCount: 1 }],
    cards: [{
      id: 'card-1',
      deckId: 'deck-1',
      group: 'sync-test',
      front: label,
      back: `back-${label}`,
      state: 'learning',
      interval: 1,
      easeFactor: 2.5,
      failCount: 0,
      hardCount: 0,
      introducedDate: '2026-07-20',
      lastReviewedDate: '2026-07-20',
    }],
    reports: [],
  };
}

async function snapshot(label: string): Promise<BackupEnvelopeV1> {
  return createBackupEnvelope(payload(label), { snapshotId: `snapshot-${label}` });
}

class VirtualDevice implements LocalSyncStore {
  current: BackupEnvelopeV1;
  metadata: SyncMetadataV1 | null = null;
  failNextReplaceAfterMutation = false;

  constructor(initial: BackupEnvelopeV1) {
    this.current = structuredClone(initial);
  }

  readSnapshot = async () => structuredClone(this.current);
  readMetadata = async () => structuredClone(this.metadata);
  writeMetadata = async (metadata: SyncMetadataV1) => {
    this.metadata = structuredClone(metadata);
  };
  replaceSnapshot = async (next: BackupEnvelopeV1) => {
    this.current = structuredClone(next);
    if (this.failNextReplaceAfterMutation) {
      this.failNextReplaceAfterMutation = false;
      throw new Error('simulated_local_write_failure');
    }
  };

  async edit(label: string) {
    this.current = await snapshot(label);
  }
}

async function connectedDevices(label = 'base') {
  const provider = new InMemorySyncProvider();
  const initial = await snapshot(label);
  const first = new VirtualDevice(initial);
  const second = new VirtualDevice(initial);
  expect((await synchronize(first, provider)).status).toBe('uploaded');
  expect((await synchronize(second, provider)).status).toBe('converged');
  return { provider, first, second };
}

test.describe('provider-neutral sync matrix', () => {
  test('uploads a local-only change and advances the shared base revision', async () => {
    const { provider, first } = await connectedDevices();
    await first.edit('local-newer');

    const result = await synchronize(first, provider);
    const remote = await provider.getCurrent();

    expect(result.status).toBe('uploaded');
    expect(remote?.envelope.manifest.payloadHash).toBe(first.current.manifest.payloadHash);
    expect(first.metadata?.baseRevision).toBe(remote?.revision);
  });

  test('downloads a cloud-only change into the other virtual device', async () => {
    const { provider, first, second } = await connectedDevices();
    await first.edit('cloud-newer');
    await synchronize(first, provider);

    const result = await synchronize(second, provider);

    expect(result.status).toBe('downloaded');
    expect(second.current.manifest.payloadHash).toBe(first.current.manifest.payloadHash);
    expect(second.metadata?.basePayloadHash).toBe(first.current.manifest.payloadHash);
  });

  test('preserves both snapshots when local and cloud changed from the same base', async () => {
    const { provider, first, second } = await connectedDevices();
    await first.edit('cloud-branch');
    await synchronize(first, provider);
    await second.edit('local-branch');

    const result = await synchronize(second, provider);
    const remote = await provider.getCurrent();
    const conflicts = provider.getConflictCopies();

    expect(result.status).toBe('conflict');
    expect(remote?.envelope.manifest.payloadHash).toBe(first.current.manifest.payloadHash);
    expect(second.current.manifest.payloadHash).not.toBe(remote?.envelope.manifest.payloadHash);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].local.manifest.payloadHash).toBe(second.current.manifest.payloadHash);
    expect(conflicts[0].remote.manifest.payloadHash).toBe(remote?.envelope.manifest.payloadHash);
  });

  test('does not guess a winner on first connection when local and cloud differ', async () => {
    const provider = new InMemorySyncProvider();
    const cloudDevice = new VirtualDevice(await snapshot('existing-cloud'));
    await synchronize(cloudDevice, provider);
    const newDevice = new VirtualDevice(await snapshot('different-local'));

    const result = await synchronize(newDevice, provider);

    expect(result.status).toBe('conflict');
    expect(provider.getConflictCopies()).toHaveLength(1);
    expect(newDevice.metadata).toBeNull();
  });

  test('applies the cloud copy only after an explicit first-connect choice', async () => {
    const provider = new InMemorySyncProvider();
    const cloudDevice = new VirtualDevice(await snapshot('existing-cloud'));
    await synchronize(cloudDevice, provider);
    const newDevice = new VirtualDevice(await snapshot('different-local'));
    expect((await synchronize(newDevice, provider)).status).toBe('conflict');

    const result = await resolveSyncConflict(newDevice, provider, 'remote');

    expect(result.status).toBe('downloaded');
    expect(newDevice.current.manifest.payloadHash)
      .toBe(cloudDevice.current.manifest.payloadHash);
    expect(newDevice.metadata?.basePayloadHash)
      .toBe(cloudDevice.current.manifest.payloadHash);
  });

  test('uploads the local copy only after an explicit conflict choice', async () => {
    const { provider, first, second } = await connectedDevices();
    await first.edit('cloud-branch');
    await synchronize(first, provider);
    await second.edit('local-branch');
    expect((await synchronize(second, provider)).status).toBe('conflict');

    const result = await resolveSyncConflict(second, provider, 'local');
    const remote = await provider.getCurrent();

    expect(result.status).toBe('uploaded');
    expect(remote?.envelope.manifest.payloadHash)
      .toBe(second.current.manifest.payloadHash);
    expect(second.metadata?.baseRevision).toBe(remote?.revision);
    expect(provider.getConflictCopies()).toHaveLength(1);
  });

  test('keeps local work offline and uploads it after connectivity returns', async () => {
    const { provider, first } = await connectedDevices();
    await first.edit('offline-change');
    provider.setOnline(false);

    expect((await synchronize(first, provider)).status).toBe('offline');
    expect(first.current.payload.decks[0].name).toBe('offline-change');

    provider.setOnline(true);
    expect((await synchronize(first, provider)).status).toBe('uploaded');
    expect((await provider.getCurrent())?.envelope.manifest.payloadHash)
      .toBe(first.current.manifest.payloadHash);
  });

  test('converges after a post-write network failure without a duplicate upload', async () => {
    const { provider, first } = await connectedDevices();
    await first.edit('retry-once');
    provider.failAfterNextWrite();

    expect((await synchronize(first, provider)).status).toBe('offline');
    const committedRevision = (await provider.getCurrent())?.revision;
    const writeCountAfterFailure = provider.getWriteCount();

    expect((await synchronize(first, provider)).status).toBe('converged');
    expect((await provider.getCurrent())?.revision).toBe(committedRevision);
    expect(provider.getWriteCount()).toBe(writeCountAfterFailure);
  });

  test('rolls back a partially applied cloud download before allowing retry', async () => {
    const { provider, first, second } = await connectedDevices();
    const priorHash = second.current.manifest.payloadHash;
    const priorRevision = second.metadata?.baseRevision;
    await first.edit('remote-for-rollback');
    await synchronize(first, provider);
    second.failNextReplaceAfterMutation = true;

    await expect(synchronize(second, provider)).rejects.toThrow(/download_rolled_back/);
    expect(second.current.manifest.payloadHash).toBe(priorHash);
    expect(second.metadata?.baseRevision).toBe(priorRevision);

    expect((await synchronize(second, provider)).status).toBe('downloaded');
    expect(second.current.manifest.payloadHash).toBe(first.current.manifest.payloadHash);
  });
});
