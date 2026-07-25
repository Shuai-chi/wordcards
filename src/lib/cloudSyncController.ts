import {
  clearBrowserSyncMetadata,
  createBrowserSyncStore,
} from './browserSyncStore';
import { GoogleDriveSyncProvider } from './googleDriveSyncProvider';
import { GoogleDriveTransport } from './googleDriveTransport';
import {
  GoogleAuthorizationRequiredError,
  GoogleIdentityClient,
} from './googleIdentity';
import {
  resolveSyncConflict,
  synchronize,
  type ConflictResolution,
  type LocalSyncStore,
  type SyncProvider,
  type SyncResult,
} from './sync';

export type CloudSyncStatus =
  | 'unconfigured'
  | 'disconnected'
  | 'connecting'
  | 'ready'
  | 'syncing'
  | 'offline'
  | 'reauthorize'
  | 'conflict'
  | 'error';

export interface CloudSyncState {
  status: CloudSyncStatus;
  lastSyncedAt: number | null;
  lastResult: SyncResult['status'] | null;
  errorCode: string | null;
  conflictId: string | null;
  conflictKind: 'local-remote' | 'remote-divergence' | null;
}

export interface CloudSyncIdentity {
  connect: () => Promise<unknown>;
  getValidAccessToken: () => string;
  hasValidAccessToken: () => boolean;
  disconnect: () => void;
}

export interface CloudSyncProvider extends SyncProvider {
  deleteAllData: () => Promise<number>;
}

type TimerHandle = unknown;

export interface CloudSyncControllerOptions {
  configured: boolean;
  identity: CloudSyncIdentity;
  provider: CloudSyncProvider;
  localStore: LocalSyncStore;
  sync?: (
    localStore: LocalSyncStore,
    provider: SyncProvider,
  ) => Promise<SyncResult>;
  resolveConflict?: (
    localStore: LocalSyncStore,
    provider: SyncProvider,
    choice: ConflictResolution,
  ) => Promise<SyncResult>;
  clearMetadata: () => void;
  onRemoteApplied?: () => void;
  now?: () => number;
  debounceMs?: number;
  setTimer?: (callback: () => void, milliseconds: number) => TimerHandle;
  clearTimer?: (handle: TimerHandle) => void;
}

function errorCode(error: unknown): string {
  if (
    error
    && typeof error === 'object'
    && 'code' in error
    && typeof error.code === 'string'
  ) return error.code;
  return error instanceof Error ? error.message : 'cloud_sync_failed';
}

export class CloudSyncController {
  private readonly configured: boolean;
  private readonly identity: CloudSyncIdentity;
  private readonly provider: CloudSyncProvider;
  private readonly localStore: LocalSyncStore;
  private readonly sync: (
    localStore: LocalSyncStore,
    provider: SyncProvider,
  ) => Promise<SyncResult>;
  private readonly resolve: (
    localStore: LocalSyncStore,
    provider: SyncProvider,
    choice: ConflictResolution,
  ) => Promise<SyncResult>;
  private readonly clearMetadata: () => void;
  private readonly onRemoteApplied: () => void;
  private readonly now: () => number;
  private readonly debounceMs: number;
  private readonly setTimer: (
    callback: () => void,
    milliseconds: number,
  ) => TimerHandle;
  private readonly clearTimer: (handle: TimerHandle) => void;
  private readonly listeners = new Set<(state: CloudSyncState) => void>();
  private state: CloudSyncState;
  private changeTimer: TimerHandle | null = null;
  private activeSync: Promise<void> | null = null;
  private pendingSync = false;
  private sessionGeneration = 0;

  constructor(options: CloudSyncControllerOptions) {
    this.configured = options.configured;
    this.identity = options.identity;
    this.provider = options.provider;
    this.localStore = options.localStore;
    this.sync = options.sync ?? synchronize;
    this.resolve = options.resolveConflict ?? resolveSyncConflict;
    this.clearMetadata = options.clearMetadata;
    this.onRemoteApplied = options.onRemoteApplied ?? (() => undefined);
    this.now = options.now ?? Date.now;
    this.debounceMs = options.debounceMs ?? 1_500;
    this.setTimer = options.setTimer ?? ((callback, milliseconds) => (
      window.setTimeout(callback, milliseconds)
    ));
    this.clearTimer = options.clearTimer ?? (handle => {
      window.clearTimeout(handle as number);
    });
    this.state = {
      status: this.configured ? 'disconnected' : 'unconfigured',
      lastSyncedAt: null,
      lastResult: null,
      errorCode: null,
      conflictId: null,
      conflictKind: null,
    };
  }

  getState(): CloudSyncState {
    return { ...this.state };
  }

  getLocalStore(): LocalSyncStore {
    return this.localStore;
  }

  subscribe(listener: (state: CloudSyncState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async connect(): Promise<void> {
    if (!this.configured) return;
    const generation = ++this.sessionGeneration;
    this.updateState({
      status: 'connecting',
      errorCode: null,
      conflictId: null,
      conflictKind: null,
    });
    try {
      await this.identity.connect();
      if (generation !== this.sessionGeneration) return;
      await this.syncNow();
    } catch (error) {
      if (generation !== this.sessionGeneration) return;
      this.applyError(error);
    }
  }

  syncNow(): Promise<void> {
    if (!this.configured) return Promise.resolve();
    if (!this.identity.hasValidAccessToken()) {
      this.updateState({
        status: 'reauthorize',
        errorCode: 'google_authorization_required',
        conflictId: null,
        conflictKind: null,
      });
      return Promise.resolve();
    }
    if (this.activeSync) {
      this.pendingSync = true;
      return this.activeSync;
    }

    const generation = this.sessionGeneration;
    const run = this.performSync(generation);
    this.activeSync = run;
    void run.finally(() => {
      if (this.activeSync !== run) return;
      this.activeSync = null;
      if (this.pendingSync) {
        this.pendingSync = false;
        if (this.identity.hasValidAccessToken()) void this.syncNow();
      }
    });
    return run;
  }

  notifyLocalChange(): void {
    if (!this.identity.hasValidAccessToken()) return;
    if (this.changeTimer !== null) this.clearTimer(this.changeTimer);
    this.changeTimer = this.setTimer(() => {
      this.changeTimer = null;
      void this.syncNow();
    }, this.debounceMs);
  }

  async resolveConflict(choice: ConflictResolution): Promise<void> {
    if (
      this.state.status !== 'conflict'
      || this.state.conflictKind !== 'local-remote'
    ) return;
    if (!this.identity.hasValidAccessToken()) {
      this.updateState({
        status: 'reauthorize',
        errorCode: 'google_authorization_required',
        conflictId: null,
        conflictKind: null,
      });
      return;
    }

    const generation = this.sessionGeneration;
    this.updateState({
      status: 'syncing',
      errorCode: null,
    });
    try {
      const result = await this.resolve(
        this.localStore,
        this.provider,
        choice,
      );
      if (generation !== this.sessionGeneration) return;
      this.applySyncResult(result);
    } catch (error) {
      if (generation !== this.sessionGeneration) return;
      this.applyError(error);
    }
  }

  handleOnline(): void {
    if (this.identity.hasValidAccessToken()) void this.syncNow();
  }

  handleForeground(): void {
    if (this.identity.hasValidAccessToken()) void this.syncNow();
  }

  disconnect(): void {
    this.sessionGeneration += 1;
    this.pendingSync = false;
    this.cancelChangeTimer();
    this.identity.disconnect();
    this.updateState({
      status: this.configured ? 'disconnected' : 'unconfigured',
      errorCode: null,
      conflictId: null,
      conflictKind: null,
    });
  }

  async deleteCloudData(): Promise<number> {
    if (!this.configured) return 0;
    if (!this.identity.hasValidAccessToken()) {
      this.updateState({
        status: 'reauthorize',
        errorCode: 'google_authorization_required',
        conflictId: null,
        conflictKind: null,
      });
      return 0;
    }
    this.updateState({
      status: 'syncing',
      errorCode: null,
      conflictId: null,
      conflictKind: null,
    });
    try {
      const deleted = await this.provider.deleteAllData();
      this.clearMetadata();
      this.disconnect();
      return deleted;
    } catch (error) {
      this.applyError(error);
      return 0;
    }
  }

  private async performSync(generation: number): Promise<void> {
    this.updateState({
      status: 'syncing',
      errorCode: null,
      conflictId: null,
      conflictKind: null,
    });
    try {
      const result = await this.sync(this.localStore, this.provider);
      if (generation !== this.sessionGeneration) return;
      this.applySyncResult(result);
    } catch (error) {
      if (generation !== this.sessionGeneration) return;
      this.applyError(error);
    }
  }

  private applyError(error: unknown): void {
    const code = errorCode(error);
    this.updateState({
      status: error instanceof GoogleAuthorizationRequiredError
        ? 'reauthorize'
        : 'error',
      errorCode: code,
      conflictId: null,
      conflictKind: null,
    });
  }

  private applySyncResult(result: SyncResult): void {
    if (result.status === 'offline') {
      this.updateState({
        status: 'offline',
        lastResult: 'offline',
        errorCode: null,
        conflictId: null,
        conflictKind: null,
      });
      return;
    }
    if (result.status === 'conflict') {
      this.updateState({
        status: 'conflict',
        lastResult: 'conflict',
        errorCode: null,
        conflictId: result.conflictId,
        conflictKind: result.kind,
      });
      return;
    }
    this.updateState({
      status: 'ready',
      lastSyncedAt: this.now(),
      lastResult: result.status,
      errorCode: null,
      conflictId: null,
      conflictKind: null,
    });
    if (result.status === 'downloaded') this.onRemoteApplied();
  }

  private updateState(patch: Partial<CloudSyncState>): void {
    this.state = { ...this.state, ...patch };
    const snapshot = this.getState();
    this.listeners.forEach(listener => listener(snapshot));
  }

  private cancelChangeTimer(): void {
    if (this.changeTimer === null) return;
    this.clearTimer(this.changeTimer);
    this.changeTimer = null;
  }
}

export interface CreateGoogleDriveCloudSyncControllerOptions {
  clientId: string;
  storage?: Storage;
  onRemoteApplied?: () => void;
}

export function createGoogleDriveCloudSyncController(
  options: CreateGoogleDriveCloudSyncControllerOptions,
): CloudSyncController {
  const storage = options.storage ?? window.localStorage;
  const identity = new GoogleIdentityClient({ clientId: options.clientId });
  const transport = new GoogleDriveTransport({
    getAccessToken: () => identity.getValidAccessToken(),
  });
  const provider = new GoogleDriveSyncProvider(transport);
  const localStore = createBrowserSyncStore(storage);
  return new CloudSyncController({
    configured: Boolean(options.clientId.trim()),
    identity,
    provider,
    localStore,
    clearMetadata: () => clearBrowserSyncMetadata(storage),
    onRemoteApplied: options.onRemoteApplied,
  });
}
