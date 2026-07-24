import type { DeckType } from './types';

export const LISTENING_PREFERENCES_STORAGE_KEY = 'wordforge_listening_preferences_v1';
export const LISTENING_REPEAT_MIN = 0;
export const LISTENING_REPEAT_MAX = 5;
export const LISTENING_RATE_OPTIONS = [
  0.5, 0.75, 0.85, 1, 1.25, 1.5, 1.75, 2,
] as const;

export type ListeningRate = typeof LISTENING_RATE_OPTIONS[number];

export interface PreferredVoiceV1 {
  voiceURI: string;
  name: string;
  lang: string;
}

export interface ListeningPreferencesV1 {
  schemaVersion: 1;
  source: 'today' | 'all';
  order: 'sequential' | 'shuffle';
  loopPlaylist: boolean;
  frontRepeats: number;
  exampleRepeats: number;
  playbackRate: ListeningRate;
  preferredVoice: PreferredVoiceV1 | null;
  shuffleSeedByMode: Partial<Record<DeckType, string>>;
  lastCardIdByMode: Partial<Record<DeckType, string>>;
  updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isListeningRate(value: unknown): value is ListeningRate {
  return typeof value === 'number'
    && LISTENING_RATE_OPTIONS.some(option => option === value);
}

function normalizePreferredVoice(value: unknown): PreferredVoiceV1 | null {
  if (
    !isRecord(value)
    || typeof value.voiceURI !== 'string'
    || value.voiceURI.trim().length === 0
    || typeof value.name !== 'string'
    || value.name.trim().length === 0
    || typeof value.lang !== 'string'
    || value.lang.trim().length === 0
  ) {
    return null;
  }
  return {
    voiceURI: value.voiceURI.trim(),
    name: value.name.trim(),
    lang: value.lang.trim(),
  };
}

function isValidTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function clampRepeat(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(
    LISTENING_REPEAT_MIN,
    Math.min(LISTENING_REPEAT_MAX, Math.round(value)),
  );
}

function normalizeModeMap(value: unknown): Partial<Record<DeckType, string>> {
  if (!isRecord(value)) return {};
  const normalized: Partial<Record<DeckType, string>> = {};
  for (const mode of ['vocab', 'phrase'] as const) {
    const candidate = value[mode];
    if (typeof candidate === 'string' && candidate.length > 0) normalized[mode] = candidate;
  }
  return normalized;
}

function assertModeMap(value: unknown): void {
  if (!isRecord(value)) throw new Error('invalid_listening_preferences');
  for (const [mode, candidate] of Object.entries(value)) {
    if (
      (mode !== 'vocab' && mode !== 'phrase')
      || typeof candidate !== 'string'
      || candidate.length === 0
    ) {
      throw new Error('invalid_listening_preferences');
    }
  }
}

export function createDefaultListeningPreferences(
  now = new Date().toISOString(),
): ListeningPreferencesV1 {
  return {
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
    updatedAt: now,
  };
}

export function normalizeListeningPreferences(
  raw: unknown,
  now = new Date().toISOString(),
): ListeningPreferencesV1 {
  const defaults = createDefaultListeningPreferences(now);
  if (!isRecord(raw) || raw.schemaVersion !== 1) return defaults;

  return {
    schemaVersion: 1,
    source: raw.source === 'all' ? 'all' : 'today',
    order: raw.order === 'shuffle' ? 'shuffle' : 'sequential',
    loopPlaylist: typeof raw.loopPlaylist === 'boolean' ? raw.loopPlaylist : false,
    frontRepeats: clampRepeat(raw.frontRepeats, defaults.frontRepeats),
    exampleRepeats: clampRepeat(raw.exampleRepeats, defaults.exampleRepeats),
    playbackRate: isListeningRate(raw.playbackRate) ? raw.playbackRate : 0.85,
    preferredVoice: normalizePreferredVoice(raw.preferredVoice),
    shuffleSeedByMode: normalizeModeMap(raw.shuffleSeedByMode),
    lastCardIdByMode: normalizeModeMap(raw.lastCardIdByMode),
    updatedAt: isValidTimestamp(raw.updatedAt) ? raw.updatedAt : now,
  };
}

export function assertValidListeningPreferences(
  raw: unknown,
): asserts raw is ListeningPreferencesV1 {
  if (
    !isRecord(raw)
    || raw.schemaVersion !== 1
    || (raw.source !== 'today' && raw.source !== 'all')
    || (raw.order !== 'sequential' && raw.order !== 'shuffle')
    || typeof raw.loopPlaylist !== 'boolean'
    || !Number.isInteger(raw.frontRepeats)
    || Number(raw.frontRepeats) < LISTENING_REPEAT_MIN
    || Number(raw.frontRepeats) > LISTENING_REPEAT_MAX
    || !Number.isInteger(raw.exampleRepeats)
    || Number(raw.exampleRepeats) < LISTENING_REPEAT_MIN
    || Number(raw.exampleRepeats) > LISTENING_REPEAT_MAX
    || !isListeningRate(raw.playbackRate)
    || (
      raw.preferredVoice !== null
      && normalizePreferredVoice(raw.preferredVoice) === null
    )
    || !isValidTimestamp(raw.updatedAt)
  ) {
    throw new Error('invalid_listening_preferences');
  }
  assertModeMap(raw.shuffleSeedByMode);
  assertModeMap(raw.lastCardIdByMode);
}

export function readListeningPreferences(
  storage: Storage = window.localStorage,
): ListeningPreferencesV1 {
  const raw = storage.getItem(LISTENING_PREFERENCES_STORAGE_KEY);
  if (!raw) return createDefaultListeningPreferences();
  try {
    return normalizeListeningPreferences(JSON.parse(raw));
  } catch {
    return createDefaultListeningPreferences();
  }
}

export function saveListeningPreferences(
  value: ListeningPreferencesV1,
  storage: Storage = window.localStorage,
): ListeningPreferencesV1 {
  const normalized = normalizeListeningPreferences(value);
  storage.setItem(LISTENING_PREFERENCES_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function randomHex(): string {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
    return [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}

export function createPlaylistSeed(
  mode: DeckType,
  source: ListeningPreferencesV1['source'],
  selectedDeckIds: string[],
): string {
  const context = [...new Set(selectedDeckIds)].sort().join(',');
  return `${mode}:${source}:${context}:${randomHex()}`;
}

export function setLastListeningCard(
  value: ListeningPreferencesV1,
  mode: DeckType,
  cardId: string | undefined,
  now = new Date().toISOString(),
): ListeningPreferencesV1 {
  const lastCardIdByMode = { ...value.lastCardIdByMode };
  if (cardId) lastCardIdByMode[mode] = cardId;
  else delete lastCardIdByMode[mode];
  return normalizeListeningPreferences({
    ...value,
    lastCardIdByMode,
    updatedAt: now,
  }, now);
}
