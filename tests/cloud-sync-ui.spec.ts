import { expect, test, type Page, type Route } from '@playwright/test';
import { createBackupEnvelope, type BackupPayloadV1 } from '../src/lib/backup';
import { GOOGLE_DRIVE_APPDATA_SCOPE } from '../src/lib/googleIdentity';

interface FakeDriveFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  size: string;
  appProperties: Record<string, string>;
  text: string;
}

function fileMetadata(file: FakeDriveFile): Omit<FakeDriveFile, 'text'> {
  return {
    id: file.id,
    name: file.name,
    createdTime: file.createdTime,
    modifiedTime: file.modifiedTime,
    size: file.size,
    appProperties: file.appProperties,
  };
}

function emptyPayload(): BackupPayloadV1 {
  return {
    settings: {
      uiLanguage: 'zh-TW',
      definitionLanguage: 'deck',
      globalDailyLimit: 30,
      selectedDeckIds: [],
      appearance: {
        schemaVersion: 1,
        mode: 'light',
        light: { presetId: 'ocean' },
        dark: { presetId: 'midnight' },
        updatedAt: '2026-07-23T00:00:00.000Z',
      },
    },
    decks: [],
    cards: [],
    reports: [],
  };
}

async function installGoogleStub(page: Page) {
  await page.addInitScript(scope => {
    const browserWindow = window as typeof window & {
      google?: {
        accounts: {
          oauth2: {
            initTokenClient: (config: {
              callback: (response: {
                access_token: string;
                expires_in: number;
                scope: string;
              }) => void;
            }) => {
              requestAccessToken: () => void;
            };
          };
        };
      };
    };
    browserWindow.google = {
      accounts: {
        oauth2: {
          initTokenClient: config => ({
            requestAccessToken: () => config.callback({
              access_token: 'browser-test-access-token',
              expires_in: 3600,
              scope,
            }),
          }),
        },
      },
    };
  }, GOOGLE_DRIVE_APPDATA_SCOPE);
}

function extractUploadedJson(route: Route): string {
  const body = route.request().postData() ?? '';
  const match = body.match(
    /Content-Type: application\/json\r\n\r\n([\s\S]*?)\r\n--wordforge_/,
  );
  if (!match) throw new Error('multipart_json_part_missing');
  return match[1];
}

async function installDriveStub(page: Page, initialFiles: FakeDriveFile[] = []) {
  const files = [...initialFiles];
  let nextId = files.length;
  let deleteCount = 0;
  const routeErrors: string[] = [];
  const requestFailures: string[] = [];
  page.on('requestfailed', request => {
    if (request.url().startsWith('https://www.googleapis.com/')) {
      requestFailures.push(
        `${request.method()} ${new URL(request.url()).pathname}: ${request.failure()?.errorText ?? 'unknown'}`,
      );
    }
  });
  const corsHeaders = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
    'access-control-allow-headers': 'Authorization,Content-Type',
  };
  const handleRoute = async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders, body: '' });
      return;
    }
    expect(request.headers().authorization).toBe('Bearer browser-test-access-token');

    if (request.method() === 'GET' && url.pathname === '/drive/v3/files') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          files: files.map(fileMetadata),
        }),
      });
      return;
    }
    if (
      request.method() === 'GET'
      && url.pathname.startsWith('/drive/v3/files/')
      && url.searchParams.get('alt') === 'media'
    ) {
      const fileId = decodeURIComponent(url.pathname.split('/').at(-1) ?? '');
      const file = files.find(candidate => candidate.id === fileId);
      await route.fulfill({
        status: file ? 200 : 404,
        contentType: 'application/json',
        headers: corsHeaders,
        body: file?.text ?? '{}',
      });
      return;
    }
    if (request.method() === 'POST' && url.pathname === '/upload/drive/v3/files') {
      const text = extractUploadedJson(route);
      const document = JSON.parse(text);
      const id = `drive-file-${++nextId}`;
      const file: FakeDriveFile = {
        id,
        name: `wordforge-${document.kind}-${document.revision ?? document.id}.json`,
        createdTime: '2026-07-23T00:00:00.000Z',
        modifiedTime: '2026-07-23T00:00:00.000Z',
        size: String(new TextEncoder().encode(text).byteLength),
        appProperties: document.kind === 'snapshot'
          ? {
              wordforgeKind: 'snapshot',
              wordforgeRevision: document.revision,
              wordforgeParent: document.parentRevision ?? '',
              wordforgeOperation: 'browser-test',
            }
          : {
              wordforgeKind: 'conflict',
              wordforgeConflictId: document.id,
              wordforgeOperation: 'browser-test',
            },
        text,
      };
      files.push(file);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify(fileMetadata(file)),
      });
      return;
    }
    if (request.method() === 'DELETE' && url.pathname.startsWith('/drive/v3/files/')) {
      const fileId = decodeURIComponent(url.pathname.split('/').at(-1) ?? '');
      const index = files.findIndex(file => file.id === fileId);
      if (index >= 0) files.splice(index, 1);
      deleteCount += 1;
      await route.fulfill({ status: 204, headers: corsHeaders, body: '' });
      return;
    }
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({ error: { code: 400 } }),
    });
  };
  await page.route('https://www.googleapis.com/**', async route => {
    try {
      await handleRoute(route);
    } catch (error) {
      routeErrors.push(error instanceof Error ? error.message : String(error));
      await route.fulfill({
        status: 599,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({ error: { code: 599 } }),
      });
    }
  });
  return {
    files,
    getDeleteCount: () => deleteCount,
    getRouteErrors: () => [...routeErrors],
    getRequestFailures: () => [...requestFailures],
  };
}

async function openCloudSettings(page: Page) {
  await page.goto('/');
  await page.getByTitle('設定').click();
  await page.getByRole('tab', { name: '一般與備份' }).click();
  await expect(page.getByTestId('cloud-sync-panel')).toBeVisible();
}

test('settings exposes an accessible Google Drive panel without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await openCloudSettings(page);

  await expect(page.getByRole('heading', { name: 'Google Drive 雲端同步' })).toBeVisible();
  await expect(page.getByTestId('cloud-sync-status')).toContainText('尚未連結');
  await expect(page.getByRole('button', { name: '連結 Google Drive' })).toBeVisible();
  await expect(page.getByText('斷開連結不會刪除雲端資料')).toBeVisible();
  const panel = page.getByTestId('settings-panel');
  expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
});

test('connect, sync now, and disconnect update the visible state', async ({ page }) => {
  await installGoogleStub(page);
  const drive = await installDriveStub(page);
  await openCloudSettings(page);

  await page.getByRole('button', { name: '連結 Google Drive' }).click();
  await expect(page.getByTestId('cloud-sync-status')).toContainText('已連結');
  expect(drive.getRouteErrors()).toEqual([]);
  expect(drive.getRequestFailures()).toEqual([]);
  await expect(page.getByTestId('cloud-last-synced')).not.toContainText('尚未同步');

  await page.getByRole('button', { name: '立即同步' }).click();
  await expect(page.getByTestId('cloud-sync-status')).toContainText('已連結');
  await page.getByRole('button', { name: '斷開連結' }).click();
  await expect(page.getByTestId('cloud-sync-status')).toContainText('尚未連結');
});

test('two remote heads show a conflict and retain the manual export escape hatch', async ({ page }) => {
  const envelopeA = await createBackupEnvelope(emptyPayload(), { snapshotId: 'cloud-a' });
  const envelopeB = await createBackupEnvelope(emptyPayload(), { snapshotId: 'cloud-b' });
  const files: FakeDriveFile[] = [
    {
      id: 'branch-a',
      name: 'wordforge-snapshot-r-a.json',
      createdTime: '2026-07-23T00:00:00.000Z',
      modifiedTime: '2026-07-23T00:00:00.000Z',
      size: '100',
      appProperties: {
        wordforgeKind: 'snapshot',
        wordforgeRevision: 'r-a',
        wordforgeParent: 'r-base',
        wordforgeOperation: 'a',
      },
      text: JSON.stringify({
        schemaVersion: 1,
        kind: 'snapshot',
        revision: 'r-a',
        parentRevision: 'r-base',
        operationId: 'branch-a',
        envelope: envelopeA,
      }),
    },
    {
      id: 'branch-b',
      name: 'wordforge-snapshot-r-b.json',
      createdTime: '2026-07-23T00:00:01.000Z',
      modifiedTime: '2026-07-23T00:00:01.000Z',
      size: '100',
      appProperties: {
        wordforgeKind: 'snapshot',
        wordforgeRevision: 'r-b',
        wordforgeParent: 'r-base',
        wordforgeOperation: 'b',
      },
      text: JSON.stringify({
        schemaVersion: 1,
        kind: 'snapshot',
        revision: 'r-b',
        parentRevision: 'r-base',
        operationId: 'branch-b',
        envelope: envelopeB,
      }),
    },
  ];
  await installGoogleStub(page);
  await installDriveStub(page, files);
  await openCloudSettings(page);

  await page.getByRole('button', { name: '連結 Google Drive' }).click();

  await expect(page.getByTestId('cloud-sync-status')).toContainText('發現衝突');
  await expect(page.getByText('系統沒有自動覆蓋任何一份資料')).toBeVisible();
  await expect(page.getByRole('button', { name: '先匯出本機備份' })).toBeVisible();
  await expect(page.getByRole('button', { name: '採用雲端資料' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '以這台裝置為準' })).toHaveCount(0);
});

test('a first-connect conflict offers explicit cloud or device choices', async ({ page }) => {
  const remotePayload = emptyPayload();
  remotePayload.settings.globalDailyLimit = 99;
  const envelope = await createBackupEnvelope(remotePayload, {
    snapshotId: 'existing-cloud',
  });
  const remoteFile: FakeDriveFile = {
    id: 'existing-cloud',
    name: 'wordforge-snapshot-r-cloud.json',
    createdTime: '2026-07-23T00:00:00.000Z',
    modifiedTime: '2026-07-23T00:00:00.000Z',
    size: '100',
    appProperties: {
      wordforgeKind: 'snapshot',
      wordforgeRevision: 'r-cloud',
      wordforgeParent: '',
      wordforgeOperation: 'cloud',
    },
    text: JSON.stringify({
      schemaVersion: 1,
      kind: 'snapshot',
      revision: 'r-cloud',
      parentRevision: null,
      operationId: 'existing-cloud',
      envelope,
    }),
  };
  await installGoogleStub(page);
  await installDriveStub(page, [remoteFile]);
  await openCloudSettings(page);

  await page.getByRole('button', { name: '連結 Google Drive' }).click();

  await expect(page.getByTestId('cloud-sync-status')).toContainText('發現衝突');
  await expect(page.getByRole('button', { name: '採用雲端資料' })).toBeVisible();
  await expect(page.getByRole('button', { name: '以這台裝置為準' })).toBeVisible();
  const panel = page.getByTestId('cloud-sync-panel');
  expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
});

test('permanent deletion requires confirmation then disconnects without re-uploading', async ({ page }) => {
  await installGoogleStub(page);
  const drive = await installDriveStub(page);
  await openCloudSettings(page);
  await page.getByRole('button', { name: '連結 Google Drive' }).click();
  await expect(page.getByTestId('cloud-sync-status')).toContainText('已連結');

  await page.getByRole('button', { name: '刪除雲端備份' }).click();
  await expect(page.getByTestId('cloud-delete-confirm')).toBeVisible();
  await page.getByRole('button', { name: '取消刪除' }).click();
  expect(drive.getDeleteCount()).toBe(0);

  await page.getByRole('button', { name: '刪除雲端備份' }).click();
  await page.getByRole('button', { name: '確認永久刪除' }).click();
  await expect(page.getByTestId('cloud-sync-status')).toContainText('尚未連結');
  expect(drive.getDeleteCount()).toBe(1);
  expect(drive.files).toHaveLength(0);
});
