import { expect, test } from '@playwright/test';
import { createBackupEnvelope, type BackupPayloadV1 } from '../src/lib/backup';
import {
  CloudSyncController,
  type CloudSyncIdentity,
  type CloudSyncProvider,
} from '../src/lib/cloudSyncController';
import { GoogleAuthorizationRequiredError } from '../src/lib/googleIdentity';
import type {
  ConflictResolution,
  LocalSyncStore,
  SyncMetadataV1,
  SyncResult,
} from '../src/lib/sync';

class FakeIdentity implements CloudSyncIdentity {
  connected = false;
  connectCount = 0;
  disconnectCount = 0;

  connect = async () => {
    this.connectCount += 1;
    this.connected = true;
  };

  getValidAccessToken = () => {
    if (!this.connected) throw new GoogleAuthorizationRequiredError();
    return 'test-access-token';
  };

  hasValidAccessToken = () => this.connected;

  disconnect = () => {
    this.disconnectCount += 1;
    this.connected = false;
  };
}

class FakeProvider implements CloudSyncProvider {
  deleteCount = 0;
  getCurrent = async () => null;
  putCurrent = async () => {
    throw new Error('not_used_by_injected_sync');
  };
  saveConflictCopy = async () => {
    throw new Error('not_used_by_injected_sync');
  };
  deleteAllData = async () => {
    this.deleteCount += 1;
    return 2;
  };
}

async function createLocalStore(): Promise<LocalSyncStore> {
  const payload: BackupPayloadV1 = {
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
    decks: [{ id: 'deck-1', name: 'local', cardCount: 1 }],
    cards: [{
      id: 'card-1',
      deckId: 'deck-1',
      group: 'controller-test',
      front: 'local',
      back: '本機',
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
  const envelope = await createBackupEnvelope(payload);
  let metadata: SyncMetadataV1 | null = null;
  return {
    readSnapshot: async () => structuredClone(envelope),
    replaceSnapshot: async () => undefined,
    readMetadata: async () => structuredClone(metadata),
    writeMetadata: async next => {
      metadata = structuredClone(next);
    },
  };
}

async function harness(options: {
  configured?: boolean;
  results?: Array<SyncResult | Error>;
  resolutionResult?: SyncResult | Error;
  now?: number;
} = {}) {
  const identity = new FakeIdentity();
  const provider = new FakeProvider();
  const localStore = await createLocalStore();
  const results = [...(options.results ?? [{ status: 'uploaded', revision: 'r1' }])];
  let syncCount = 0;
  let clearedMetadata = 0;
  let timerCallback: (() => void) | null = null;
  let clearTimerCount = 0;
  let resolutionCount = 0;
  let resolvedChoice: ConflictResolution | null = null;
  let remoteAppliedCount = 0;
  const controller = new CloudSyncController({
    configured: options.configured ?? true,
    identity,
    provider,
    localStore,
    sync: async () => {
      syncCount += 1;
      const next = results.shift() ?? { status: 'unchanged', revision: 'r1' };
      if (next instanceof Error) throw next;
      return next;
    },
    resolveConflict: async (_localStore, _provider, choice) => {
      resolutionCount += 1;
      resolvedChoice = choice;
      const result = options.resolutionResult
        ?? { status: 'downloaded', revision: 'r-resolved' };
      if (result instanceof Error) throw result;
      return result;
    },
    clearMetadata: () => {
      clearedMetadata += 1;
    },
    onRemoteApplied: () => {
      remoteAppliedCount += 1;
    },
    now: () => options.now ?? 1_721_692_800_000,
    setTimer: callback => {
      timerCallback = callback;
      return 1;
    },
    clearTimer: () => {
      clearTimerCount += 1;
      timerCallback = null;
    },
  });
  return {
    controller,
    identity,
    provider,
    getSyncCount: () => syncCount,
    getClearedMetadata: () => clearedMetadata,
    getTimerCallback: () => timerCallback,
    getClearTimerCount: () => clearTimerCount,
    getResolutionCount: () => resolutionCount,
    getResolvedChoice: () => resolvedChoice,
    getRemoteAppliedCount: () => remoteAppliedCount,
  };
}

test('an empty build configuration is unconfigured and does not request GIS', async () => {
  const { controller, identity } = await harness({ configured: false });

  expect(controller.getState().status).toBe('unconfigured');
  await controller.connect();
  expect(controller.getState().status).toBe('unconfigured');
  expect(identity.connectCount).toBe(0);
});

test('connect obtains authorization then performs the first synchronization', async () => {
  const { controller, identity, getSyncCount } = await harness({
    results: [{ status: 'uploaded', revision: 'r1' }],
  });
  const states: string[] = [];
  const unsubscribe = controller.subscribe(state => states.push(state.status));

  await controller.connect();

  expect(identity.connectCount).toBe(1);
  expect(getSyncCount()).toBe(1);
  expect(controller.getState()).toEqual({
    status: 'ready',
    lastSyncedAt: 1_721_692_800_000,
    lastResult: 'uploaded',
    errorCode: null,
    conflictId: null,
    conflictKind: null,
  });
  expect(states).toContain('connecting');
  expect(states).toContain('syncing');
  expect(states.at(-1)).toBe('ready');
  unsubscribe();
});

test('offline and conflict results are surfaced without claiming success', async () => {
  const offline = await harness({ results: [{ status: 'offline' }] });
  await offline.controller.connect();
  expect(offline.controller.getState().status).toBe('offline');
  expect(offline.controller.getState().lastSyncedAt).toBeNull();

  const conflict = await harness({
    results: [{
      status: 'conflict',
      conflictId: 'cloud-branch',
      kind: 'remote-divergence',
    }],
  });
  await conflict.controller.connect();
  expect(conflict.controller.getState()).toEqual(expect.objectContaining({
    status: 'conflict',
    conflictId: 'cloud-branch',
    conflictKind: 'remote-divergence',
    lastSyncedAt: null,
  }));
});

test('an explicit local-versus-remote choice resolves a preserved conflict', async () => {
  const testHarness = await harness({
    results: [{
      status: 'conflict',
      conflictId: 'c-first-connect',
      kind: 'local-remote',
    }],
    resolutionResult: { status: 'downloaded', revision: 'r-cloud' },
  });
  await testHarness.controller.connect();

  await testHarness.controller.resolveConflict('remote');

  expect(testHarness.getResolutionCount()).toBe(1);
  expect(testHarness.getResolvedChoice()).toBe('remote');
  expect(testHarness.getRemoteAppliedCount()).toBe(1);
  expect(testHarness.controller.getState()).toEqual(expect.objectContaining({
    status: 'ready',
    lastResult: 'downloaded',
    conflictId: null,
    conflictKind: null,
  }));
});

test('a remote graph divergence remains preserved for manual recovery', async () => {
  const testHarness = await harness({
    results: [{
      status: 'conflict',
      conflictId: 'cloud-multiple-heads',
      kind: 'remote-divergence',
    }],
  });
  await testHarness.controller.connect();

  await testHarness.controller.resolveConflict('local');

  expect(testHarness.getResolutionCount()).toBe(0);
  expect(testHarness.controller.getState().status).toBe('conflict');
});

test('a rejected access token changes the state to reauthorize', async () => {
  const { controller } = await harness({
    results: [new GoogleAuthorizationRequiredError('google_token_rejected')],
  });

  await controller.connect();

  expect(controller.getState()).toEqual(expect.objectContaining({
    status: 'reauthorize',
    errorCode: 'google_token_rejected',
  }));
});

test('local changes debounce into one sync while authorization remains valid', async () => {
  const testHarness = await harness({
    results: [
      { status: 'unchanged', revision: 'r1' },
      { status: 'uploaded', revision: 'r2' },
    ],
  });
  await testHarness.controller.connect();
  testHarness.controller.notifyLocalChange();
  testHarness.controller.notifyLocalChange();

  expect(testHarness.getTimerCallback()).not.toBeNull();
  expect(testHarness.getClearTimerCount()).toBe(1);
  testHarness.getTimerCallback()?.();
  await expect.poll(testHarness.getSyncCount).toBe(2);
  expect(testHarness.controller.getState().status).toBe('ready');
});

test('online and foreground events sync only while a token is valid', async () => {
  const testHarness = await harness({
    results: [
      { status: 'unchanged', revision: 'r1' },
      { status: 'unchanged', revision: 'r1' },
      { status: 'unchanged', revision: 'r1' },
    ],
  });
  testHarness.controller.handleOnline();
  testHarness.controller.handleForeground();
  expect(testHarness.getSyncCount()).toBe(0);

  await testHarness.controller.connect();
  testHarness.controller.handleOnline();
  await expect.poll(testHarness.getSyncCount).toBe(2);
  testHarness.controller.handleForeground();
  await expect.poll(testHarness.getSyncCount).toBe(3);
});

test('disconnect clears authorization and timers but does not delete cloud data', async () => {
  const testHarness = await harness();
  await testHarness.controller.connect();
  testHarness.controller.notifyLocalChange();

  testHarness.controller.disconnect();

  expect(testHarness.controller.getState().status).toBe('disconnected');
  expect(testHarness.identity.disconnectCount).toBe(1);
  expect(testHarness.provider.deleteCount).toBe(0);
  expect(testHarness.getTimerCallback()).toBeNull();
});

test('permanent cloud deletion clears sync metadata, disconnects, and leaves local data untouched', async () => {
  const testHarness = await harness();
  await testHarness.controller.connect();

  const deleted = await testHarness.controller.deleteCloudData();

  expect(deleted).toBe(2);
  expect(testHarness.provider.deleteCount).toBe(1);
  expect(testHarness.getClearedMetadata()).toBe(1);
  expect(testHarness.identity.disconnectCount).toBe(1);
  expect(testHarness.controller.getState().status).toBe('disconnected');
  await expect(testHarness.controller.getLocalStore().readSnapshot()).resolves.toBeTruthy();
});
