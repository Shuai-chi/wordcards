import {
  importLocalBackup,
  prepareLocalBackup,
  validateBackupText,
  type BackupEnvelopeV1,
} from './backup';
import type { LocalSyncStore, SyncMetadataV1 } from './sync';

export const SYNC_METADATA_STORAGE_KEY = 'wordforge_sync_metadata_v1';

export interface BrowserSnapshotAdapter {
  readSnapshot: () => Promise<BackupEnvelopeV1>;
  replaceSnapshot: (snapshot: BackupEnvelopeV1) => Promise<void>;
}

function isValidMetadata(value: unknown): value is SyncMetadataV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const metadata = value as Record<string, unknown>;
  return metadata.schemaVersion === 1
    && typeof metadata.baseRevision === 'string'
    && metadata.baseRevision.length > 0
    && typeof metadata.basePayloadHash === 'string'
    && metadata.basePayloadHash.length > 0;
}

function createDefaultAdapter(storage: Storage): BrowserSnapshotAdapter {
  return {
    readSnapshot: async () => (await prepareLocalBackup(storage)).envelope,
    replaceSnapshot: async snapshot => {
      await importLocalBackup(JSON.stringify(snapshot), storage);
    },
  };
}

async function validatedEnvelope(snapshot: BackupEnvelopeV1): Promise<BackupEnvelopeV1> {
  return (await validateBackupText(JSON.stringify(snapshot))).envelope;
}

export function createBrowserSyncStore(
  storage: Storage = window.localStorage,
  adapter: BrowserSnapshotAdapter = createDefaultAdapter(storage),
): LocalSyncStore {
  return {
    readSnapshot: async () => validatedEnvelope(await adapter.readSnapshot()),
    replaceSnapshot: async snapshot => {
      await adapter.replaceSnapshot(await validatedEnvelope(snapshot));
    },
    readMetadata: async () => {
      const raw = storage.getItem(SYNC_METADATA_STORAGE_KEY);
      if (!raw) return null;
      try {
        const parsed: unknown = JSON.parse(raw);
        return isValidMetadata(parsed) ? {
          schemaVersion: 1,
          baseRevision: parsed.baseRevision,
          basePayloadHash: parsed.basePayloadHash,
        } : null;
      } catch {
        return null;
      }
    },
    writeMetadata: async metadata => {
      storage.setItem(SYNC_METADATA_STORAGE_KEY, JSON.stringify({
        schemaVersion: 1,
        baseRevision: metadata.baseRevision,
        basePayloadHash: metadata.basePayloadHash,
      }));
    },
  };
}

export function clearBrowserSyncMetadata(storage: Storage = window.localStorage): void {
  storage.removeItem(SYNC_METADATA_STORAGE_KEY);
}
