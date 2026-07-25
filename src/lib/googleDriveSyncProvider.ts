import {
  validateBackupText,
  type BackupEnvelopeV1,
} from './backup';
import type {
  DriveAppDataFile,
  DriveAppDataTransport,
} from './googleDriveTransport';
import { sha256Hex } from './portableCrypto';
import {
  SyncPreconditionError,
  SyncRemoteDivergenceError,
  type RemoteSyncSnapshot,
  type SyncConflictCopy,
  type SyncProvider,
} from './sync';

const SNAPSHOT_KIND = 'snapshot';
const CONFLICT_KIND = 'conflict';
const REVISION_HASH_LENGTH = 24;

export interface DriveSnapshotDocumentV1 {
  schemaVersion: 1;
  kind: 'snapshot';
  revision: string;
  parentRevision: string | null;
  operationId: string;
  envelope: BackupEnvelopeV1;
}

export interface DriveConflictDocumentV1 {
  schemaVersion: 1;
  kind: 'conflict';
  id: string;
  baseRevision: string | null;
  operationId: string;
  local: BackupEnvelopeV1;
  remote: BackupEnvelopeV1;
}

export class GoogleDriveDataError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = 'GoogleDriveDataError';
    this.code = code;
  }
}

interface SnapshotEntry {
  document: DriveSnapshotDocumentV1;
  files: DriveAppDataFile[];
}

interface SnapshotGraph {
  entries: Map<string, SnapshotEntry>;
  heads: SnapshotEntry[];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

async function shortHash(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  return (await sha256Hex(bytes)).slice(0, REVISION_HASH_LENGTH);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function remoteSnapshot(document: DriveSnapshotDocumentV1): RemoteSyncSnapshot {
  return {
    revision: document.revision,
    parentRevision: document.parentRevision,
    envelope: clone(document.envelope),
  };
}

function documentsMatch(a: DriveSnapshotDocumentV1, b: DriveSnapshotDocumentV1): boolean {
  return a.revision === b.revision
    && a.parentRevision === b.parentRevision
    && a.operationId === b.operationId
    && a.envelope.manifest.payloadHash === b.envelope.manifest.payloadHash
    && JSON.stringify(a.envelope.payload) === JSON.stringify(b.envelope.payload);
}

export class GoogleDriveSyncProvider implements SyncProvider {
  private readonly transport: DriveAppDataTransport;

  constructor(transport: DriveAppDataTransport) {
    this.transport = transport;
  }

  async getCurrent(): Promise<RemoteSyncSnapshot | null> {
    const graph = await this.loadSnapshotGraph();
    const head = await this.requireSingleHead(graph);
    return head ? remoteSnapshot(head.document) : null;
  }

  async putCurrent(
    snapshot: BackupEnvelopeV1,
    options: { expectedRevision: string | null; operationId: string },
  ): Promise<RemoteSyncSnapshot> {
    const validated = (await validateBackupText(JSON.stringify(snapshot))).envelope;
    const revision = `r-${await shortHash(
      `${options.operationId}\n${validated.manifest.payloadHash}`,
    )}`;
    const graph = await this.loadSnapshotGraph();
    const currentHead = await this.requireSingleHead(graph);
    const existing = graph.entries.get(revision);
    if (existing) {
      if (
        existing.document.operationId !== options.operationId
        || existing.document.envelope.manifest.payloadHash
          !== validated.manifest.payloadHash
      ) {
        throw new GoogleDriveDataError('drive_revision_collision');
      }
      return remoteSnapshot(existing.document);
    }

    if ((currentHead?.document.revision ?? null) !== options.expectedRevision) {
      throw new SyncPreconditionError();
    }

    const document: DriveSnapshotDocumentV1 = {
      schemaVersion: 1,
      kind: SNAPSHOT_KIND,
      revision,
      parentRevision: currentHead?.document.revision ?? null,
      operationId: options.operationId,
      envelope: validated,
    };
    const operationFingerprint = await shortHash(options.operationId);
    await this.transport.createJsonFile({
      name: `wordforge-snapshot-${revision}.json`,
      appProperties: {
        wordforgeKind: SNAPSHOT_KIND,
        wordforgeRevision: revision,
        wordforgeParent: document.parentRevision ?? '',
        wordforgeOperation: operationFingerprint,
      },
      text: JSON.stringify(document),
    });

    const postWriteGraph = await this.loadSnapshotGraph();
    const postWriteHead = await this.requireSingleHead(postWriteGraph);
    if (!postWriteHead || postWriteHead.document.revision !== revision) {
      throw new SyncPreconditionError();
    }
    await this.cleanupSnapshotAncestors(postWriteGraph, postWriteHead);
    return remoteSnapshot(postWriteHead.document);
  }

  async saveConflictCopy(
    local: BackupEnvelopeV1,
    remote: RemoteSyncSnapshot,
    options: { baseRevision: string | null; operationId: string },
  ): Promise<SyncConflictCopy> {
    const validatedLocal = (await validateBackupText(JSON.stringify(local))).envelope;
    const validatedRemote = (
      await validateBackupText(JSON.stringify(remote.envelope))
    ).envelope;
    const conflictId = `c-${await shortHash(options.operationId)}`;
    const files = await this.transport.listFiles();
    const existing = files.find(file => (
      file.appProperties.wordforgeKind === CONFLICT_KIND
      && file.appProperties.wordforgeConflictId === conflictId
    ));
    if (existing) return this.readConflict(existing, conflictId);

    const document: DriveConflictDocumentV1 = {
      schemaVersion: 1,
      kind: CONFLICT_KIND,
      id: conflictId,
      baseRevision: options.baseRevision,
      operationId: options.operationId,
      local: validatedLocal,
      remote: validatedRemote,
    };
    await this.transport.createJsonFile({
      name: `wordforge-conflict-${conflictId}.json`,
      appProperties: {
        wordforgeKind: CONFLICT_KIND,
        wordforgeConflictId: conflictId,
        wordforgeOperation: await shortHash(options.operationId),
      },
      text: JSON.stringify(document),
    });
    return {
      id: conflictId,
      baseRevision: options.baseRevision,
      local: clone(validatedLocal),
      remote: clone(validatedRemote),
    };
  }

  async deleteAllData(): Promise<number> {
    const files = await this.transport.listFiles();
    const targets = files.filter(file => (
      file.appProperties.wordforgeKind === SNAPSHOT_KIND
      || file.appProperties.wordforgeKind === CONFLICT_KIND
    ));
    await Promise.all(targets.map(file => this.transport.deleteFile(file.id)));
    return targets.length;
  }

  private async loadSnapshotGraph(): Promise<SnapshotGraph> {
    const files = (await this.transport.listFiles()).filter(
      file => file.appProperties.wordforgeKind === SNAPSHOT_KIND,
    );
    const entries = new Map<string, SnapshotEntry>();
    for (const file of files) {
      const document = await this.readSnapshot(file);
      const existing = entries.get(document.revision);
      if (existing) {
        if (!documentsMatch(existing.document, document)) {
          throw new GoogleDriveDataError('duplicate_drive_revision');
        }
        existing.files.push(file);
      } else {
        entries.set(document.revision, { document, files: [file] });
      }
    }

    const referencedParents = new Set(
      [...entries.values()]
        .map(entry => entry.document.parentRevision)
        .filter((revision): revision is string => Boolean(revision)),
    );
    const heads = [...entries.values()].filter(
      entry => !referencedParents.has(entry.document.revision),
    );
    return { entries, heads };
  }

  private async readSnapshot(file: DriveAppDataFile): Promise<DriveSnapshotDocumentV1> {
    const text = await this.transport.downloadText(file.id);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new GoogleDriveDataError('invalid_drive_snapshot_json');
    }
    if (
      !isRecord(parsed)
      || parsed.schemaVersion !== 1
      || parsed.kind !== SNAPSHOT_KIND
      || typeof parsed.revision !== 'string'
      || !parsed.revision
      || (parsed.parentRevision !== null && typeof parsed.parentRevision !== 'string')
      || typeof parsed.operationId !== 'string'
      || !isRecord(parsed.envelope)
    ) {
      throw new GoogleDriveDataError('invalid_drive_snapshot');
    }
    const propertyParent = file.appProperties.wordforgeParent || null;
    if (
      file.appProperties.wordforgeRevision !== parsed.revision
      || propertyParent !== parsed.parentRevision
    ) {
      throw new GoogleDriveDataError('drive_snapshot_metadata_mismatch');
    }
    const envelope = (
      await validateBackupText(JSON.stringify(parsed.envelope))
    ).envelope;
    return {
      schemaVersion: 1,
      kind: SNAPSHOT_KIND,
      revision: parsed.revision,
      parentRevision: parsed.parentRevision,
      operationId: parsed.operationId,
      envelope,
    };
  }

  private async readConflict(
    file: DriveAppDataFile,
    expectedId: string,
  ): Promise<SyncConflictCopy> {
    const text = await this.transport.downloadText(file.id);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new GoogleDriveDataError('invalid_drive_conflict_json');
    }
    if (
      !isRecord(parsed)
      || parsed.schemaVersion !== 1
      || parsed.kind !== CONFLICT_KIND
      || parsed.id !== expectedId
      || (parsed.baseRevision !== null && typeof parsed.baseRevision !== 'string')
      || typeof parsed.operationId !== 'string'
      || !isRecord(parsed.local)
      || !isRecord(parsed.remote)
    ) {
      throw new GoogleDriveDataError('invalid_drive_conflict');
    }
    const local = (await validateBackupText(JSON.stringify(parsed.local))).envelope;
    const remote = (await validateBackupText(JSON.stringify(parsed.remote))).envelope;
    return {
      id: expectedId,
      baseRevision: parsed.baseRevision,
      local,
      remote,
    };
  }

  private async requireSingleHead(
    graph: SnapshotGraph,
  ): Promise<SnapshotEntry | null> {
    if (graph.heads.length <= 1) return graph.heads[0] ?? null;
    const revisions = graph.heads
      .map(entry => entry.document.revision)
      .sort()
      .join('\n');
    throw new SyncRemoteDivergenceError(`cloud-${await shortHash(revisions)}`);
  }

  private async cleanupSnapshotAncestors(
    graph: SnapshotGraph,
    current: SnapshotEntry,
  ): Promise<void> {
    const keepRevisions = new Set([
      current.document.revision,
      ...(current.document.parentRevision ? [current.document.parentRevision] : []),
    ]);
    const deletions: string[] = [];
    for (const [revision, entry] of graph.entries) {
      const filesToKeep = keepRevisions.has(revision) ? 1 : 0;
      entry.files.slice(filesToKeep).forEach(file => deletions.push(file.id));
    }
    await Promise.all(deletions.map(fileId => this.transport.deleteFile(fileId)));
  }
}
