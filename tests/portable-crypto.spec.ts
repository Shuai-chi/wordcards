import { expect, test } from '@playwright/test';
import { createPortableUuid, sha256Hex } from '../src/lib/portableCrypto';

const encoder = new TextEncoder();

test('falls back to a standards-compatible SHA-256 implementation', async () => {
  const cryptoWithoutSubtle = {} as Crypto;

  await expect(sha256Hex(encoder.encode(''), cryptoWithoutSubtle))
    .resolves.toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  await expect(sha256Hex(encoder.encode('abc'), cryptoWithoutSubtle))
    .resolves.toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('builds an RFC 4122 v4 UUID when randomUUID is unavailable', () => {
  const bytes = Uint8Array.from([
    0x00, 0x11, 0x22, 0x33,
    0x44, 0x55,
    0x66, 0x77,
    0x88, 0x99,
    0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF,
  ]);
  const cryptoWithoutRandomUuid = {
    getRandomValues: (target: Uint8Array) => {
      target.set(bytes);
      return target;
    },
  } as unknown as Crypto;

  expect(createPortableUuid(cryptoWithoutRandomUuid))
    .toBe('00112233-4455-4677-8899-aabbccddeeff');
});

