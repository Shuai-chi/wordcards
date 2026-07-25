import { GoogleAuthorizationRequiredError } from './googleIdentity';
import { SyncProviderUnavailableError } from './sync';

const DRIVE_API_ROOT = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_ROOT = 'https://www.googleapis.com/upload/drive/v3';
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 250;
const RETRY_JITTER_MS = 100;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const RETRYABLE_403_REASONS = new Set([
  'rateLimitExceeded',
  'userRateLimitExceeded',
  'sharingRateLimitExceeded',
]);

export interface DriveAppDataFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  size: number;
  appProperties: Record<string, string>;
}

export interface DriveAppDataTransport {
  listFiles: () => Promise<DriveAppDataFile[]>;
  downloadText: (fileId: string) => Promise<string>;
  createJsonFile: (input: {
    name: string;
    appProperties: Record<string, string>;
    text: string;
  }) => Promise<DriveAppDataFile>;
  deleteFile: (fileId: string) => Promise<void>;
}

export class GoogleDrivePermissionError extends Error {
  readonly code: string;

  constructor(code = 'google_drive_permission_denied') {
    super(code);
    this.name = 'GoogleDrivePermissionError';
    this.code = code;
  }
}

export class GoogleDriveResponseError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code = 'google_drive_request_failed') {
    super(code);
    this.name = 'GoogleDriveResponseError';
    this.status = status;
    this.code = code;
  }
}

interface GoogleErrorPayload {
  error?: {
    errors?: Array<{ reason?: string }>;
  };
}

interface DriveListPayload {
  nextPageToken?: string;
  files?: unknown[];
}

export interface GoogleDriveTransportOptions {
  getAccessToken: () => string;
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

function errorReason(text: string): string | null {
  try {
    const parsed = JSON.parse(text) as GoogleErrorPayload;
    const reason = parsed.error?.errors?.[0]?.reason;
    return typeof reason === 'string' ? reason : null;
  } catch {
    return null;
  }
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const entries = Object.entries(value)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string');
  return Object.fromEntries(entries);
}

function normalizeDriveFile(value: unknown): DriveAppDataFile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new GoogleDriveResponseError(200, 'invalid_drive_file_metadata');
  }
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string' || !raw.id || typeof raw.name !== 'string' || !raw.name) {
    throw new GoogleDriveResponseError(200, 'invalid_drive_file_metadata');
  }
  const parsedSize = Number(raw.size ?? 0);
  return {
    id: raw.id,
    name: raw.name,
    createdTime: typeof raw.createdTime === 'string' ? raw.createdTime : '',
    modifiedTime: typeof raw.modifiedTime === 'string' ? raw.modifiedTime : '',
    size: Number.isFinite(parsedSize) && parsedSize >= 0 ? parsedSize : 0,
    appProperties: normalizeStringRecord(raw.appProperties),
  };
}

export class GoogleDriveTransport implements DriveAppDataTransport {
  private readonly getAccessToken: () => string;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly random: () => number;

  constructor(options: GoogleDriveTransportOptions) {
    this.getAccessToken = options.getAccessToken;
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
    this.sleep = options.sleep ?? defaultSleep;
    this.random = options.random ?? Math.random;
  }

  async listFiles(): Promise<DriveAppDataFile[]> {
    const files: DriveAppDataFile[] = [];
    let pageToken: string | null = null;
    do {
      const url = new URL(`${DRIVE_API_ROOT}/files`);
      url.searchParams.set('spaces', 'appDataFolder');
      url.searchParams.set('q', 'trashed = false');
      url.searchParams.set('pageSize', '1000');
      url.searchParams.set(
        'fields',
        'nextPageToken,files(id,name,createdTime,modifiedTime,size,appProperties)',
      );
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const response = await this.request(url, { method: 'GET' });
      const payload = await response.json() as DriveListPayload;
      const pageFiles = Array.isArray(payload.files) ? payload.files : [];
      files.push(...pageFiles.map(normalizeDriveFile));
      pageToken = typeof payload.nextPageToken === 'string' && payload.nextPageToken
        ? payload.nextPageToken
        : null;
    } while (pageToken);
    return files;
  }

  async downloadText(fileId: string): Promise<string> {
    const url = new URL(`${DRIVE_API_ROOT}/files/${encodeURIComponent(fileId)}`);
    url.searchParams.set('alt', 'media');
    return (await this.request(url, { method: 'GET' })).text();
  }

  async createJsonFile(input: {
    name: string;
    appProperties: Record<string, string>;
    text: string;
  }): Promise<DriveAppDataFile> {
    const boundary = `wordforge_${Math.floor(this.random() * 1_000_000_000)}`;
    const metadata = {
      name: input.name,
      parents: ['appDataFolder'],
      mimeType: 'application/json',
      appProperties: input.appProperties,
    };
    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      'Content-Type: application/json',
      '',
      input.text,
      `--${boundary}--`,
      '',
    ].join('\r\n');
    const url = new URL(`${DRIVE_UPLOAD_ROOT}/files`);
    url.searchParams.set('uploadType', 'multipart');
    url.searchParams.set(
      'fields',
      'id,name,createdTime,modifiedTime,size,appProperties',
    );
    const response = await this.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });
    return normalizeDriveFile(await response.json());
  }

  async deleteFile(fileId: string): Promise<void> {
    const url = new URL(`${DRIVE_API_ROOT}/files/${encodeURIComponent(fileId)}`);
    await this.request(url, { method: 'DELETE' });
  }

  private async request(url: URL, init: RequestInit): Promise<Response> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const token = this.getAccessToken();
      let response: Response;
      try {
        const headers = new Headers(init.headers);
        headers.set('Authorization', `Bearer ${token}`);
        response = await this.fetchImpl(url, { ...init, headers });
      } catch {
        if (attempt === MAX_ATTEMPTS - 1) throw new SyncProviderUnavailableError();
        await this.waitBeforeRetry(attempt);
        continue;
      }

      if (response.ok) return response;

      const errorText = await response.text();
      const reason = errorReason(errorText);
      if (response.status === 401) {
        throw new GoogleAuthorizationRequiredError('google_token_rejected');
      }
      if (
        response.status === 403
        && reason
        && RETRYABLE_403_REASONS.has(reason)
      ) {
        if (attempt === MAX_ATTEMPTS - 1) throw new SyncProviderUnavailableError();
        await this.waitBeforeRetry(attempt);
        continue;
      }
      if (response.status === 403) {
        throw new GoogleDrivePermissionError(reason ?? undefined);
      }
      if (RETRYABLE_STATUS_CODES.has(response.status)) {
        if (attempt === MAX_ATTEMPTS - 1) throw new SyncProviderUnavailableError();
        await this.waitBeforeRetry(attempt);
        continue;
      }
      throw new GoogleDriveResponseError(
        response.status,
        reason ?? 'google_drive_request_failed',
      );
    }
    throw new SyncProviderUnavailableError();
  }

  private async waitBeforeRetry(attempt: number): Promise<void> {
    const jitter = Math.floor(this.random() * RETRY_JITTER_MS);
    await this.sleep(RETRY_BASE_MS * (2 ** attempt) + jitter);
  }
}
