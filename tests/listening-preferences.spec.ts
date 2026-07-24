import { expect, test } from '@playwright/test';
import {
  LISTENING_RATE_OPTIONS,
  LISTENING_PREFERENCES_STORAGE_KEY,
  assertValidListeningPreferences,
  createDefaultListeningPreferences,
  createPlaylistSeed,
  normalizeListeningPreferences,
  readListeningPreferences,
  saveListeningPreferences,
  setLastListeningCard,
} from '../src/lib/listeningPreferences';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

test('defaults to a paused-safe 1/1 sequential today configuration', () => {
  expect(createDefaultListeningPreferences('2026-07-23T00:00:00.000Z')).toEqual({
    schemaVersion: 1,
    source: 'today',
    order: 'sequential',
    loopPlaylist: false,
    frontRepeats: 1,
    exampleRepeats: 1,
    playbackRate: 0.85,
    preferredVoice: null,
    shuffleSeedByMode: {},
    lastCardIdByMode: {},
    updatedAt: '2026-07-23T00:00:00.000Z',
  });
});

test('defaults audio preferences to 0.85x and automatic voice selection', () => {
  expect(LISTENING_RATE_OPTIONS).toEqual([0.5, 0.75, 0.85, 1, 1.25, 1.5, 1.75, 2]);
  expect(createDefaultListeningPreferences('2026-07-24T00:00:00.000Z')).toMatchObject({
    playbackRate: 0.85,
    preferredVoice: null,
  });
});

test('normalizes legacy and tampered audio preferences to safe values', () => {
  const legacy = normalizeListeningPreferences({
    ...createDefaultListeningPreferences(),
    playbackRate: undefined,
    preferredVoice: undefined,
  });
  expect(legacy).toMatchObject({ playbackRate: 0.85, preferredVoice: null });

  for (const playbackRate of [0.9, 9, Number.NaN, Number.POSITIVE_INFINITY, '1.25']) {
    const tampered = normalizeListeningPreferences({
      ...createDefaultListeningPreferences(),
      playbackRate,
      preferredVoice: { voiceURI: '', name: 'Ava', lang: 'en-US' },
    });
    expect(tampered).toMatchObject({ playbackRate: 0.85, preferredVoice: null });
  }
});

test('preserves an approved rate and a complete preferred voice descriptor', () => {
  const preferredVoice = {
    voiceURI: 'urn:voice:ava',
    name: 'Microsoft Ava',
    lang: 'en-US',
  };
  const normalized = normalizeListeningPreferences({
    ...createDefaultListeningPreferences(),
    playbackRate: 1.25,
    preferredVoice,
  });
  expect(normalized).toMatchObject({ playbackRate: 1.25, preferredVoice });
});

test('round-trips audio preferences through the existing localStorage key', () => {
  const storage = new MemoryStorage();
  const preferredVoice = {
    voiceURI: 'urn:voice:ava',
    name: 'Microsoft Ava',
    lang: 'en-US',
  };
  saveListeningPreferences({
    ...createDefaultListeningPreferences('2026-07-24T00:00:00.000Z'),
    playbackRate: 1.75,
    preferredVoice,
  }, storage);

  expect(readListeningPreferences(storage)).toMatchObject({
    playbackRate: 1.75,
    preferredVoice,
  });
});

test('strict validation requires complete current audio fields and rejects invalid values', () => {
  const legacy = createDefaultListeningPreferences();
  const withoutAudio: Partial<typeof legacy> = { ...legacy };
  delete withoutAudio.playbackRate;
  delete withoutAudio.preferredVoice;
  expect(() => assertValidListeningPreferences(withoutAudio))
    .toThrow('invalid_listening_preferences');

  expect(() => assertValidListeningPreferences({
    ...legacy,
    playbackRate: 0.9,
  })).toThrow('invalid_listening_preferences');
  expect(() => assertValidListeningPreferences({
    ...legacy,
    preferredVoice: { voiceURI: 'x', name: '', lang: 'en-US' },
  })).toThrow('invalid_listening_preferences');
});

test('clamps counts and repairs invalid localStorage fields', () => {
  const normalized = normalizeListeningPreferences({
    schemaVersion: 1,
    source: 'broken',
    order: 'broken',
    loopPlaylist: 'yes',
    frontRepeats: 99,
    exampleRepeats: -3,
    shuffleSeedByMode: { vocab: 8, phrase: 'phrase-seed' },
    lastCardIdByMode: { vocab: 'card-1', phrase: false },
    updatedAt: 'invalid',
  }, '2026-07-23T01:00:00.000Z');

  expect(normalized).toMatchObject({
    source: 'today',
    order: 'sequential',
    loopPlaylist: false,
    frontRepeats: 5,
    exampleRepeats: 0,
    shuffleSeedByMode: { phrase: 'phrase-seed' },
    lastCardIdByMode: { vocab: 'card-1' },
    updatedAt: '2026-07-23T01:00:00.000Z',
  });
});

test('reads malformed JSON as defaults and saves normalized values', () => {
  const storage = new MemoryStorage();
  storage.setItem(LISTENING_PREFERENCES_STORAGE_KEY, '{bad json');
  expect(readListeningPreferences(storage).frontRepeats).toBe(1);

  saveListeningPreferences({
    ...createDefaultListeningPreferences(),
    frontRepeats: 8,
  }, storage);

  expect(JSON.parse(storage.getItem(LISTENING_PREFERENCES_STORAGE_KEY)!))
    .toMatchObject({ frontRepeats: 5, schemaVersion: 1 });
});

test('strict validation rejects out-of-range portable backup values', () => {
  expect(() => assertValidListeningPreferences({
    ...createDefaultListeningPreferences(),
    frontRepeats: 6,
  })).toThrow('invalid_listening_preferences');

  expect(() => assertValidListeningPreferences({
    ...createDefaultListeningPreferences(),
    frontRepeats: 0,
    exampleRepeats: 5,
  })).not.toThrow();
});

test('playlist seeds encode a stable selection context and use fresh entropy', () => {
  const first = createPlaylistSeed('vocab', 'today', ['deck-b', 'deck-a']);
  const second = createPlaylistSeed('vocab', 'today', ['deck-a', 'deck-b']);

  expect(first).toContain('vocab:today:deck-a,deck-b:');
  expect(second).toContain('vocab:today:deck-a,deck-b:');
  expect(second).not.toBe(first);
});

test('last card updates only the selected deck mode and can be cleared', () => {
  const initial = createDefaultListeningPreferences('2026-07-23T00:00:00.000Z');
  const vocab = setLastListeningCard(initial, 'vocab', 'card-1', '2026-07-23T01:00:00.000Z');
  const phrase = setLastListeningCard(vocab, 'phrase', 'phrase-1', '2026-07-23T02:00:00.000Z');
  const cleared = setLastListeningCard(phrase, 'vocab', undefined, '2026-07-23T03:00:00.000Z');

  expect(phrase.lastCardIdByMode).toEqual({ vocab: 'card-1', phrase: 'phrase-1' });
  expect(cleared.lastCardIdByMode).toEqual({ phrase: 'phrase-1' });
  expect(cleared.updatedAt).toBe('2026-07-23T03:00:00.000Z');
});
