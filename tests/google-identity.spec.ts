import { expect, test } from '@playwright/test';
import {
  GOOGLE_DRIVE_APPDATA_SCOPE,
  GoogleAuthorizationRequiredError,
  GoogleIdentityClient,
  GoogleIdentityConfigurationError,
  GooglePopupError,
  GoogleScopeError,
  type GoogleIdentityNamespace,
  type GoogleTokenClientConfig,
} from '../src/lib/googleIdentity';

function createHarness(now = 1_000) {
  let config: GoogleTokenClientConfig | null = null;
  let requestCount = 0;
  let initCount = 0;
  const google: GoogleIdentityNamespace = {
    accounts: {
      oauth2: {
        initTokenClient: nextConfig => {
          initCount += 1;
          config = nextConfig;
          return {
            requestAccessToken: () => {
              requestCount += 1;
            },
          };
        },
      },
    },
  };
  const client = new GoogleIdentityClient({
    clientId: 'public-client-id.apps.googleusercontent.com',
    loadIdentity: async () => google,
    now: () => now,
  });
  return {
    client,
    getConfig: () => config,
    getRequestCount: () => requestCount,
    getInitCount: () => initCount,
  };
}

async function waitForConfig(harness: ReturnType<typeof createHarness>) {
  await expect.poll(() => harness.getConfig()).not.toBeNull();
  return harness.getConfig()!;
}

test('connect requests only drive.appdata and keeps a valid token in memory', async () => {
  const harness = createHarness();
  const pending = harness.client.connect();
  const config = await waitForConfig(harness);

  expect(config.client_id).toBe('public-client-id.apps.googleusercontent.com');
  expect(config.scope).toBe(GOOGLE_DRIVE_APPDATA_SCOPE);
  expect(harness.getRequestCount()).toBe(1);

  config.callback({
    access_token: 'memory-only-token',
    expires_in: 3600,
    scope: GOOGLE_DRIVE_APPDATA_SCOPE,
  });

  await expect(pending).resolves.toEqual({
    value: 'memory-only-token',
    expiresAt: 3_601_000,
    scope: GOOGLE_DRIVE_APPDATA_SCOPE,
  });
  expect(harness.client.hasValidAccessToken()).toBe(true);
  expect(harness.client.getValidAccessToken()).toBe('memory-only-token');
});

test('connect rejects a response that does not grant drive.appdata', async () => {
  const harness = createHarness();
  const pending = harness.client.connect();
  const config = await waitForConfig(harness);

  config.callback({
    access_token: 'wrong-scope-token',
    expires_in: 3600,
    scope: 'openid email',
  });

  await expect(pending).rejects.toBeInstanceOf(GoogleScopeError);
  expect(harness.client.hasValidAccessToken()).toBe(false);
});

test('a token is treated as expired sixty seconds before its server expiry', async () => {
  let now = 1_000;
  const harness = createHarness(now);
  const client = new GoogleIdentityClient({
    clientId: 'public-client-id.apps.googleusercontent.com',
    loadIdentity: async () => ({
      accounts: {
        oauth2: {
          initTokenClient: config => ({
            requestAccessToken: () => config.callback({
              access_token: 'short-token',
              expires_in: 120,
              scope: GOOGLE_DRIVE_APPDATA_SCOPE,
            }),
          }),
        },
      },
    }),
    now: () => now,
  });

  await client.connect();
  expect(client.getValidAccessToken()).toBe('short-token');
  now = 61_000;
  expect(client.hasValidAccessToken()).toBe(false);
  expect(() => client.getValidAccessToken()).toThrow(GoogleAuthorizationRequiredError);
  expect(harness.getRequestCount()).toBe(0);
});

test('popup errors reject the current connection without creating a token', async () => {
  const harness = createHarness();
  const pending = harness.client.connect();
  const config = await waitForConfig(harness);

  config.error_callback?.({ type: 'popup_closed' });

  await expect(pending).rejects.toEqual(expect.objectContaining({
    name: 'GooglePopupError',
    code: 'popup_closed',
  }));
  expect(harness.client.hasValidAccessToken()).toBe(false);
  expect(new GooglePopupError('popup_failed_to_open')).toBeInstanceOf(Error);
});

test('parallel connect calls share one GIS request and disconnect clears the token', async () => {
  const harness = createHarness();
  const first = harness.client.connect();
  const second = harness.client.connect();
  expect(second).toBe(first);
  const config = await waitForConfig(harness);

  expect(harness.getInitCount()).toBe(1);
  expect(harness.getRequestCount()).toBe(1);
  config.callback({
    access_token: 'connected-token',
    expires_in: 3600,
    scope: GOOGLE_DRIVE_APPDATA_SCOPE,
  });
  await first;

  harness.client.disconnect();
  expect(harness.client.hasValidAccessToken()).toBe(false);
  expect(() => harness.client.getValidAccessToken()).toThrow(GoogleAuthorizationRequiredError);
});

test('an empty client id fails before the GIS script is loaded', async () => {
  let loaded = false;
  const client = new GoogleIdentityClient({
    clientId: '   ',
    loadIdentity: async () => {
      loaded = true;
      throw new Error('must not load');
    },
  });

  await expect(client.connect()).rejects.toBeInstanceOf(GoogleIdentityConfigurationError);
  expect(loaded).toBe(false);
});
