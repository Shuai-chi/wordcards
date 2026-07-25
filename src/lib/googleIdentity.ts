export const GOOGLE_DRIVE_APPDATA_SCOPE =
  'https://www.googleapis.com/auth/drive.appdata';

const GOOGLE_IDENTITY_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const TOKEN_EXPIRY_SAFETY_WINDOW_MS = 60_000;

export interface GoogleAccessToken {
  value: string;
  expiresAt: number;
  scope: string;
}

export interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number | string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export interface GooglePopupErrorResponse {
  type: string;
}

export interface GoogleTokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: GoogleTokenResponse) => void;
  error_callback?: (response: GooglePopupErrorResponse) => void;
}

export interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

export interface GoogleIdentityNamespace {
  accounts: {
    oauth2: {
      initTokenClient: (config: GoogleTokenClientConfig) => GoogleTokenClient;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityNamespace;
  }
}

export class GoogleIdentityConfigurationError extends Error {
  readonly code = 'google_client_id_missing';

  constructor() {
    super('google_client_id_missing');
    this.name = 'GoogleIdentityConfigurationError';
  }
}

export class GoogleAuthorizationRequiredError extends Error {
  readonly code: string;

  constructor(code = 'google_authorization_required') {
    super(code);
    this.name = 'GoogleAuthorizationRequiredError';
    this.code = code;
  }
}

export class GoogleScopeError extends Error {
  readonly code = 'google_scope_missing';

  constructor() {
    super('google_scope_missing');
    this.name = 'GoogleScopeError';
  }
}

export class GooglePopupError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = 'GooglePopupError';
    this.code = code;
  }
}

let identityScriptPromise: Promise<GoogleIdentityNamespace> | null = null;

export function loadGoogleIdentityScript(): Promise<GoogleIdentityNamespace> {
  if (typeof window !== 'undefined' && window.google?.accounts.oauth2) {
    return Promise.resolve(window.google);
  }
  if (identityScriptPromise) return identityScriptPromise;
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('google_identity_requires_browser'));
  }

  identityScriptPromise = new Promise((resolve, reject) => {
    const resolveNamespace = () => {
      if (window.google?.accounts.oauth2) resolve(window.google);
      else {
        identityScriptPromise = null;
        reject(new Error('google_identity_unavailable'));
      }
    };
    const rejectLoad = () => {
      identityScriptPromise = null;
      reject(new Error('google_identity_script_failed'));
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SCRIPT_URL}"]`,
    );
    if (existing) {
      existing.addEventListener('load', resolveNamespace, { once: true });
      existing.addEventListener('error', rejectLoad, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_IDENTITY_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', resolveNamespace, { once: true });
    script.addEventListener('error', rejectLoad, { once: true });
    document.head.appendChild(script);
  });
  return identityScriptPromise;
}

interface PendingConnection {
  promise: Promise<GoogleAccessToken>;
  resolve: (token: GoogleAccessToken) => void;
  reject: (error: unknown) => void;
}

export interface GoogleIdentityClientOptions {
  clientId: string;
  loadIdentity?: () => Promise<GoogleIdentityNamespace>;
  now?: () => number;
}

export class GoogleIdentityClient {
  private readonly clientId: string;
  private readonly loadIdentity: () => Promise<GoogleIdentityNamespace>;
  private readonly now: () => number;
  private token: GoogleAccessToken | null = null;
  private pending: PendingConnection | null = null;

  constructor(options: GoogleIdentityClientOptions) {
    this.clientId = options.clientId.trim();
    this.loadIdentity = options.loadIdentity ?? loadGoogleIdentityScript;
    this.now = options.now ?? Date.now;
  }

  connect(): Promise<GoogleAccessToken> {
    if (this.pending) return this.pending.promise;
    if (!this.clientId) return Promise.reject(new GoogleIdentityConfigurationError());

    let resolveConnection!: (token: GoogleAccessToken) => void;
    let rejectConnection!: (error: unknown) => void;
    const promise = new Promise<GoogleAccessToken>((resolve, reject) => {
      resolveConnection = resolve;
      rejectConnection = reject;
    });
    this.pending = {
      promise,
      resolve: resolveConnection,
      reject: rejectConnection,
    };

    void this.startConnection();
    return promise;
  }

  getValidAccessToken(): string {
    if (!this.hasValidAccessToken()) {
      this.token = null;
      throw new GoogleAuthorizationRequiredError();
    }
    return this.token!.value;
  }

  hasValidAccessToken(): boolean {
    return Boolean(
      this.token
      && this.token.expiresAt - TOKEN_EXPIRY_SAFETY_WINDOW_MS > this.now(),
    );
  }

  disconnect(): void {
    this.token = null;
    if (this.pending) {
      const pending = this.pending;
      this.pending = null;
      pending.reject(new GoogleAuthorizationRequiredError('google_disconnected'));
    }
  }

  private async startConnection(): Promise<void> {
    try {
      const google = await this.loadIdentity();
      if (!this.pending) return;
      const client = google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
        scope: GOOGLE_DRIVE_APPDATA_SCOPE,
        callback: response => this.handleTokenResponse(response),
        error_callback: response => this.rejectPending(new GooglePopupError(response.type)),
      });
      client.requestAccessToken();
    } catch (error) {
      this.rejectPending(error);
    }
  }

  private handleTokenResponse(response: GoogleTokenResponse): void {
    if (response.error) {
      this.rejectPending(new GoogleAuthorizationRequiredError(response.error));
      return;
    }
    const scopes = new Set((response.scope ?? '').split(/\s+/).filter(Boolean));
    if (!scopes.has(GOOGLE_DRIVE_APPDATA_SCOPE)) {
      this.rejectPending(new GoogleScopeError());
      return;
    }

    const expiresInSeconds = Number(response.expires_in);
    if (
      typeof response.access_token !== 'string'
      || response.access_token.length === 0
      || !Number.isFinite(expiresInSeconds)
      || expiresInSeconds <= 0
    ) {
      this.rejectPending(new GoogleAuthorizationRequiredError('google_invalid_token_response'));
      return;
    }

    const token: GoogleAccessToken = {
      value: response.access_token,
      expiresAt: this.now() + expiresInSeconds * 1_000,
      scope: response.scope ?? '',
    };
    this.token = token;
    const pending = this.pending;
    this.pending = null;
    pending?.resolve(token);
  }

  private rejectPending(error: unknown): void {
    this.token = null;
    const pending = this.pending;
    this.pending = null;
    pending?.reject(error);
  }
}
