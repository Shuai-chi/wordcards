import { validateBackupText, type BackupEnvelopeV1 } from './backup';

export interface SyncMetadataV1 {
  schemaVersion: 1;
  baseRevision: string;
  basePayloadHash: string;
}

export interface RemoteSyncSnapshot {
  revision: string;
  parentRevision: string | null;
  envelope: BackupEnvelopeV1;
}

export interface SyncConflictCopy {
  id: string;
  baseRevision: string | null;
  local: BackupEnvelopeV1;
  remote: BackupEnvelopeV1;
}

export interface LocalSyncStore {
  readSnapshot: () => Promise<BackupEnvelopeV1>;
  replaceSnapshot: (snapshot: BackupEnvelopeV1) => Promise<void>;
  readMetadata: () => Promise<SyncMetadataV1 | null>;
  writeMetadata: (metadata: SyncMetadataV1) => Promise<void>;
}

export type ConflictResolution = 'local' | 'remote';
export type SyncConflictKind = 'local-remote' | 'remote-divergence';

export type SyncResult =
  | { status: 'uploaded' | 'downloaded' | 'unchanged' | 'converged'; revision: string }
  | { status: 'conflict'; conflictId: string; kind: SyncConflictKind }
  | { status: 'offline' };

export interface SyncProvider {
  getCurrent: () => Promise<RemoteSyncSnapshot | null>;
  putCurrent: (
    snapshot: BackupEnvelopeV1,
    options: { expectedRevision: string | null; operationId: string },
  ) => Promise<RemoteSyncSnapshot>;
  saveConflictCopy: (
    local: BackupEnvelopeV1,
    remote: RemoteSyncSnapshot,
    options: { baseRevision: string | null; operationId: string },
  ) => Promise<SyncConflictCopy>;
}

export class SyncProviderUnavailableError extends Error {
  constructor() {
    super('sync_provider_unavailable');
    this.name = 'SyncProviderUnavailableError';
  }
}

export class SyncPreconditionError extends Error {
  constructor() {
    super('sync_precondition_failed');
    this.name = 'SyncPreconditionError';
  }
}

export class SyncRemoteDivergenceError extends Error {
  readonly conflictId: string;

  constructor(conflictId: string) {
    super('sync_remote_divergence');
    this.name = 'SyncRemoteDivergenceError';
    this.conflictId = conflictId;
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function metadataFor(remote: RemoteSyncSnapshot): SyncMetadataV1 {
  return {
    schemaVersion: 1,
    baseRevision: remote.revision,
    basePayloadHash: remote.envelope.manifest.payloadHash,
  };
}

export class InMemorySyncProvider implements SyncProvider {
  private current: RemoteSyncSnapshot | null = null;
  private readonly completedWrites = new Map<string, RemoteSyncSnapshot>();
  private readonly conflicts = new Map<string, SyncConflictCopy>();
  private online = true;
  private failAfterWrite = false;
  private revisionCounter = 0;
  private conflictCounter = 0;
  private writeCount = 0;

  private assertOnline(): void {
    if (!this.online) throw new SyncProviderUnavailableError();
  }

  async getCurrent(): Promise<RemoteSyncSnapshot | null> {
    this.assertOnline();
    return this.current ? clone(this.current) : null;
  }

  async putCurrent(
    snapshot: BackupEnvelopeV1,
    options: { expectedRevision: string | null; operationId: string },
  ): Promise<RemoteSyncSnapshot> {
    this.assertOnline();
    const completed = this.completedWrites.get(options.operationId);
    if (completed) return clone(completed);

    if ((this.current?.revision ?? null) !== options.expectedRevision) {
      throw new SyncPreconditionError();
    }
    const next: RemoteSyncSnapshot = {
      revision: `r${++this.revisionCounter}`,
      parentRevision: this.current?.revision ?? null,
      envelope: clone(snapshot),
    };
    this.current = next;
    this.completedWrites.set(options.operationId, next);
    this.writeCount += 1;

    if (this.failAfterWrite) {
      this.failAfterWrite = false;
      throw new SyncProviderUnavailableError();
    }
    return clone(next);
  }

  async saveConflictCopy(
    local: BackupEnvelopeV1,
    remote: RemoteSyncSnapshot,
    options: { baseRevision: string | null; operationId: string },
  ): Promise<SyncConflictCopy> {
    this.assertOnline();
    const existing = this.conflicts.get(options.operationId);
    if (existing) return clone(existing);
    const conflict: SyncConflictCopy = {
      id: `c${++this.conflictCounter}`,
      baseRevision: options.baseRevision,
      local: clone(local),
      remote: clone(remote.envelope),
    };
    this.conflicts.set(options.operationId, conflict);
    return clone(conflict);
  }

  getConflictCopies(): SyncConflictCopy[] {
    return [...this.conflicts.values()].map(clone);
  }

  setOnline(online: boolean): void {
    this.online = online;
  }

  failAfterNextWrite(): void {
    this.failAfterWrite = true;
  }

  getWriteCount(): number {
    return this.writeCount;
  }
}

async function validateRemote(remote: RemoteSyncSnapshot): Promise<void> {
  await validateBackupText(JSON.stringify(remote.envelope));
}

async function upload(
  local: LocalSyncStore,
  provider: SyncProvider,
  snapshot: BackupEnvelopeV1,
  expectedRevision: string | null,
): Promise<SyncResult> {
  const remote = await provider.putCurrent(snapshot, {
    expectedRevision,
    operationId: `upload:${expectedRevision ?? 'empty'}:${snapshot.manifest.payloadHash}`,
  });
  await local.writeMetadata(metadataFor(remote));
  return { status: 'uploaded', revision: remote.revision };
}

async function preserveConflict(
  local: BackupEnvelopeV1,
  remote: RemoteSyncSnapshot,
  baseRevision: string | null,
  provider: SyncProvider,
): Promise<SyncResult> {
  const conflict = await provider.saveConflictCopy(local, remote, {
    baseRevision,
    operationId: `conflict:${baseRevision ?? 'none'}:${local.manifest.payloadHash}:${remote.envelope.manifest.payloadHash}`,
  });
  return {
    status: 'conflict',
    conflictId: conflict.id,
    kind: 'local-remote',
  };
}

async function downloadWithRollback(
  local: LocalSyncStore,
  prior: BackupEnvelopeV1,
  remote: RemoteSyncSnapshot,
): Promise<SyncResult> {
  try {
    await local.replaceSnapshot(remote.envelope);
  } catch (error) {
    try {
      await local.replaceSnapshot(prior);
    } catch (rollbackError) {
      throw new Error(`download_rollback_failed: ${String(rollbackError)}`, { cause: error });
    }
    throw new Error('download_rolled_back', { cause: error });
  }
  await local.writeMetadata(metadataFor(remote));
  return { status: 'downloaded', revision: remote.revision };
}

export async function resolveSyncConflict(
  local: LocalSyncStore,
  provider: SyncProvider,
  choice: ConflictResolution,
): Promise<SyncResult> {
  const localSnapshot = await local.readSnapshot();
  const remote = await provider.getCurrent();
  if (!remote) throw new Error('sync_conflict_remote_missing');
  await validateRemote(remote);
  if (choice === 'remote') {
    return downloadWithRollback(local, localSnapshot, remote);
  }
  return upload(local, provider, localSnapshot, remote.revision);
}

export async function synchronize(
  local: LocalSyncStore,
  provider: SyncProvider,
): Promise<SyncResult> {
  try {
    const localSnapshot = await local.readSnapshot();
    const metadata = await local.readMetadata();
    const remote = await provider.getCurrent();

    if (!remote) return await upload(local, provider, localSnapshot, null);
    await validateRemote(remote);

    const localHash = localSnapshot.manifest.payloadHash;
    const remoteHash = remote.envelope.manifest.payloadHash;
    if (!metadata) {
      if (localHash === remoteHash) {
        await local.writeMetadata(metadataFor(remote));
        return { status: 'converged', revision: remote.revision };
      }
      return await preserveConflict(localSnapshot, remote, null, provider);
    }

    const localChanged = localHash !== metadata.basePayloadHash;
    const remoteChanged = remote.revision !== metadata.baseRevision
      || remoteHash !== metadata.basePayloadHash;

    if (!localChanged && !remoteChanged) {
      return { status: 'unchanged', revision: remote.revision };
    }
    if (localChanged && !remoteChanged) {
      return await upload(local, provider, localSnapshot, remote.revision);
    }
    if (!localChanged && remoteChanged) {
      return await downloadWithRollback(local, localSnapshot, remote);
    }
    if (localHash === remoteHash) {
      await local.writeMetadata(metadataFor(remote));
      return { status: 'converged', revision: remote.revision };
    }
    return await preserveConflict(localSnapshot, remote, metadata.baseRevision, provider);
  } catch (error) {
    if (error instanceof SyncProviderUnavailableError) return { status: 'offline' };
    if (error instanceof SyncRemoteDivergenceError) {
      return {
        status: 'conflict',
        conflictId: error.conflictId,
        kind: 'remote-divergence',
      };
    }
    throw error;
  }
}
