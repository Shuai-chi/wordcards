import { expect, test } from '@playwright/test';
import { GoogleAuthorizationRequiredError } from '../src/lib/googleIdentity';
import {
  GoogleDrivePermissionError,
  GoogleDriveTransport,
} from '../src/lib/googleDriveTransport';
import { SyncProviderUnavailableError } from '../src/lib/sync';

interface RecordedCall {
  url: string;
  init: RequestInit;
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function createFetchQueue(items: Array<Response | Error>) {
  const calls: RecordedCall[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });
    const next = items.shift();
    if (!next) throw new Error('unexpected_fetch');
    if (next instanceof Error) throw next;
    return next;
  }) as typeof fetch;
  return { calls, fetchImpl };
}

function authorization(call: RecordedCall): string | null {
  return new Headers(call.init.headers).get('authorization');
}

test('lists appData files and downloads JSON text with a bearer header', async () => {
  const queue = createFetchQueue([
    jsonResponse({
      files: [{
        id: 'file-1',
        name: 'wordforge-snapshot-r1.json',
        createdTime: '2026-07-23T00:00:00.000Z',
        modifiedTime: '2026-07-23T00:01:00.000Z',
        size: '321',
        appProperties: { wordforgeKind: 'snapshot' },
      }],
    }),
    new Response('{"schemaVersion":1}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  ]);
  const transport = new GoogleDriveTransport({
    getAccessToken: () => 'test-access-token',
    fetchImpl: queue.fetchImpl,
  });

  await expect(transport.listFiles()).resolves.toEqual([{
    id: 'file-1',
    name: 'wordforge-snapshot-r1.json',
    createdTime: '2026-07-23T00:00:00.000Z',
    modifiedTime: '2026-07-23T00:01:00.000Z',
    size: 321,
    appProperties: { wordforgeKind: 'snapshot' },
  }]);
  await expect(transport.downloadText('file-1')).resolves.toBe('{"schemaVersion":1}');

  const listUrl = new URL(queue.calls[0].url);
  expect(listUrl.origin + listUrl.pathname).toBe('https://www.googleapis.com/drive/v3/files');
  expect(listUrl.searchParams.get('spaces')).toBe('appDataFolder');
  expect(listUrl.searchParams.get('q')).toBe('trashed = false');
  expect(listUrl.searchParams.get('fields')).toContain('appProperties');
  expect(authorization(queue.calls[0])).toBe('Bearer test-access-token');

  const downloadUrl = new URL(queue.calls[1].url);
  expect(downloadUrl.pathname).toBe('/drive/v3/files/file-1');
  expect(downloadUrl.searchParams.get('alt')).toBe('media');
  expect(authorization(queue.calls[1])).toBe('Bearer test-access-token');
});

test('creates multipart JSON in appDataFolder and permanently deletes by id', async () => {
  const queue = createFetchQueue([
    jsonResponse({
      id: 'created-1',
      name: 'wordforge-snapshot-r1.json',
      createdTime: '2026-07-23T00:00:00.000Z',
      modifiedTime: '2026-07-23T00:00:00.000Z',
      size: '99',
      appProperties: {
        wordforgeKind: 'snapshot',
        wordforgeRevision: 'r1',
      },
    }),
    new Response(null, { status: 204 }),
  ]);
  const transport = new GoogleDriveTransport({
    getAccessToken: () => 'test-access-token',
    fetchImpl: queue.fetchImpl,
    random: () => 0,
  });

  const created = await transport.createJsonFile({
    name: 'wordforge-snapshot-r1.json',
    appProperties: {
      wordforgeKind: 'snapshot',
      wordforgeRevision: 'r1',
    },
    text: '{"kind":"snapshot"}',
  });
  expect(created.id).toBe('created-1');
  await transport.deleteFile(created.id);

  const createUrl = new URL(queue.calls[0].url);
  expect(createUrl.origin + createUrl.pathname).toBe(
    'https://www.googleapis.com/upload/drive/v3/files',
  );
  expect(createUrl.searchParams.get('uploadType')).toBe('multipart');
  const createHeaders = new Headers(queue.calls[0].init.headers);
  expect(createHeaders.get('content-type')).toMatch(
    /^multipart\/related; boundary=wordforge_/,
  );
  expect(authorization(queue.calls[0])).toBe('Bearer test-access-token');
  const body = String(queue.calls[0].init.body);
  expect(body).toContain('"parents":["appDataFolder"]');
  expect(body).toContain('"mimeType":"application/json"');
  expect(body).toContain('"wordforgeKind":"snapshot"');
  expect(body).toContain('{"kind":"snapshot"}');

  expect(queue.calls[1].init.method).toBe('DELETE');
  expect(new URL(queue.calls[1].url).pathname).toBe('/drive/v3/files/created-1');
});

test('401 requires a new authorization without retrying', async () => {
  const queue = createFetchQueue([
    jsonResponse({
      error: {
        code: 401,
        message: 'Invalid Credentials',
        errors: [{ reason: 'authError' }],
      },
    }, 401),
  ]);
  const transport = new GoogleDriveTransport({
    getAccessToken: () => 'expired-test-token',
    fetchImpl: queue.fetchImpl,
  });

  await expect(transport.listFiles()).rejects.toBeInstanceOf(
    GoogleAuthorizationRequiredError,
  );
  expect(queue.calls).toHaveLength(1);
});

test('non-rate-limit 403 is a permission error without retrying', async () => {
  const queue = createFetchQueue([
    jsonResponse({
      error: {
        code: 403,
        message: 'Insufficient Permission',
        errors: [{ reason: 'insufficientPermissions' }],
      },
    }, 403),
  ]);
  const transport = new GoogleDriveTransport({
    getAccessToken: () => 'test-access-token',
    fetchImpl: queue.fetchImpl,
  });

  await expect(transport.listFiles()).rejects.toBeInstanceOf(
    GoogleDrivePermissionError,
  );
  expect(queue.calls).toHaveLength(1);
});

test('rate limits and transient server errors use bounded exponential backoff', async () => {
  const sleeps: number[] = [];
  const queue = createFetchQueue([
    jsonResponse({
      error: {
        code: 403,
        message: 'User rate limit exceeded',
        errors: [{ reason: 'userRateLimitExceeded' }],
      },
    }, 403),
    jsonResponse({ error: { code: 503, message: 'Backend unavailable' } }, 503),
    jsonResponse({ files: [] }),
  ]);
  const transport = new GoogleDriveTransport({
    getAccessToken: () => 'test-access-token',
    fetchImpl: queue.fetchImpl,
    sleep: async milliseconds => {
      sleeps.push(milliseconds);
    },
    random: () => 0,
  });

  await expect(transport.listFiles()).resolves.toEqual([]);
  expect(queue.calls).toHaveLength(3);
  expect(sleeps).toEqual([250, 500]);
});

test('network failures exhaust three attempts as provider unavailable', async () => {
  const sleeps: number[] = [];
  const queue = createFetchQueue([
    new TypeError('Failed to fetch'),
    new TypeError('Failed to fetch'),
    new TypeError('Failed to fetch'),
  ]);
  const transport = new GoogleDriveTransport({
    getAccessToken: () => 'test-access-token',
    fetchImpl: queue.fetchImpl,
    sleep: async milliseconds => {
      sleeps.push(milliseconds);
    },
    random: () => 0,
  });

  await expect(transport.listFiles()).rejects.toBeInstanceOf(
    SyncProviderUnavailableError,
  );
  expect(queue.calls).toHaveLength(3);
  expect(sleeps).toEqual([250, 500]);
});
