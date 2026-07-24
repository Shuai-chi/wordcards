import type { Card, Deck, Report } from './types';
import { DB } from './db';
import { APPEARANCE_STORAGE_KEY, readAppearanceSettings } from './theme';
import {
  UI_PREFERENCES_STORAGE_KEY,
  normalizeUiPreferences,
  readUiPreferences,
} from './uiPreferences';
import {
  ICON_MAX_FILE_BYTES,
  ICON_SLOTS,
  assertIconFileMetadata,
  assertIconSignature,
  createIconAssetId,
  normalizeIconTransform,
  validateIconFile,
  type IconAssetRecord,
  type IconSlot,
  type SupportedIconMime,
} from './iconAssets';
import { ICON_PROFILE_IDS, type IconProfileId } from './uiPreferences';
import { createPortableUuid, sha256Hex } from './portableCrypto';
import {
  LISTENING_PREFERENCES_STORAGE_KEY,
  assertValidListeningPreferences,
  normalizeListeningPreferences,
  readListeningPreferences,
} from './listeningPreferences';

export const BACKUP_FORMAT = 'wordforge-backup' as const;
export const BACKUP_SCHEMA_VERSION = 3;
export const DEFAULT_MAX_BACKUP_BYTES = 25 * 1024 * 1024;
const STORAGE_KEYS = [
  'srs_ui_lang',
  'srs_def_lang_pref',
  'srs_global_limit',
  'srs_selected_decks',
  APPEARANCE_STORAGE_KEY,
  UI_PREFERENCES_STORAGE_KEY,
  LISTENING_PREFERENCES_STORAGE_KEY,
] as const;

const UI_LANGUAGES = new Set(['zh-TW', 'en', 'ja', 'ko', 'de', 'es', 'fr', 'th']);
const DEFINITION_LANGUAGES = new Set(['deck', 'user', 'bilingual']);
const CARD_STATES = new Set(['new', 'learning', 'relearning', 'graduated']);

export interface BackupSettingsV1 {
  uiLanguage: string;
  definitionLanguage: 'deck' | 'user' | 'bilingual';
  globalDailyLimit: number;
  selectedDeckIds: string[];
  appearance: unknown;
  uiPreferences?: unknown;
  listeningPreferences?: unknown;
}

export interface BackupIconAssetV2 {
  id: `${IconProfileId}:${IconSlot}`;
  profileId: IconProfileId;
  slot: IconSlot;
  base64: string;
  mimeType: SupportedIconMime;
  fileName: string;
  fit: 'contain' | 'cover';
  zoom: number;
  offsetX: number;
  offsetY: number;
  updatedAt: string;
}

export interface BackupPayloadV1 {
  settings: BackupSettingsV1;
  decks: Deck[];
  cards: Card[];
  reports: Report[];
  iconAssets?: BackupIconAssetV2[];
}

export interface BackupEnvelopeV1 {
  manifest: {
    format: 'wordforge-backup';
    schemaVersion: number;
    appVersion: string;
    createdAt: string;
    snapshotId: string;
    payloadHash: string;
    counts: { decks: number; cards: number; reports: number; iconAssets: number };
  };
  payload: BackupPayloadV1;
}

export interface BackupRepository {
  readAll: () => Promise<BackupPayloadV1>;
  replaceAll: (payload: BackupPayloadV1) => Promise<void>;
}

export interface PreparedBackup {
  envelope: BackupEnvelopeV1;
  text: string;
  fileName: string;
}

export class BackupValidationError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
    this.name = 'BackupValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  const serialized = JSON.stringify(value);
  return serialized === undefined ? 'null' : serialized;
}

export async function hashBackupPayload(payload: BackupPayloadV1): Promise<string> {
  const bytes = new TextEncoder().encode(stableStringify(payload));
  return `sha256:${await sha256Hex(bytes)}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    throw new BackupValidationError('invalid_icon_base64');
  }
}

async function iconRecordToBackup(record: IconAssetRecord): Promise<BackupIconAssetV2> {
  return {
    id: record.id,
    profileId: record.profileId,
    slot: record.slot,
    base64: bytesToBase64(new Uint8Array(await record.blob.arrayBuffer())),
    mimeType: record.mimeType,
    fileName: record.fileName,
    fit: record.fit,
    zoom: record.zoom,
    offsetX: record.offsetX,
    offsetY: record.offsetY,
    updatedAt: record.updatedAt,
  };
}

function backupIconToRecord(asset: BackupIconAssetV2): IconAssetRecord {
  const bytes = base64ToBytes(asset.base64);
  const transform = normalizeIconTransform(asset);
  return {
    id: createIconAssetId(asset.profileId, asset.slot),
    profileId: asset.profileId,
    slot: asset.slot,
    blob: new Blob([bytes], { type: asset.mimeType }),
    mimeType: asset.mimeType,
    fileName: asset.fileName,
    ...transform,
    updatedAt: asset.updatedAt,
  };
}

function normalizePayloadForCurrentSchema(payload: BackupPayloadV1): BackupPayloadV1 {
  const serializablePayload = JSON.parse(JSON.stringify(payload)) as BackupPayloadV1;
  return {
    ...serializablePayload,
    settings: {
      ...serializablePayload.settings,
      uiPreferences: normalizeUiPreferences(serializablePayload.settings.uiPreferences),
      listeningPreferences: normalizeListeningPreferences(
        serializablePayload.settings.listeningPreferences,
      ),
    },
    iconAssets: Array.isArray(serializablePayload.iconAssets) ? serializablePayload.iconAssets : [],
  };
}

function validateListeningPreferences(value: unknown): void {
  try {
    if (!isRecord(value)) throw new Error('invalid_listening_preferences');
    const legacyCompatible = {
      ...value,
      playbackRate: Object.hasOwn(value, 'playbackRate')
        ? value.playbackRate
        : 0.85,
      preferredVoice: Object.hasOwn(value, 'preferredVoice')
        ? value.preferredVoice
        : null,
    };
    assertValidListeningPreferences(legacyCompatible);
  } catch {
    throw new BackupValidationError('invalid_listening_preferences');
  }
}

async function validateIconAssets(value: unknown): Promise<void> {
  if (!Array.isArray(value)) throw new BackupValidationError('invalid_icon_assets');
  const ids: string[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) throw new BackupValidationError('invalid_icon_asset');
    const profileId = raw.profileId as IconProfileId;
    const slot = raw.slot as IconSlot;
    if (!ICON_PROFILE_IDS.includes(profileId) || !ICON_SLOTS.includes(slot)) {
      throw new BackupValidationError('invalid_icon_slot');
    }
    const expectedId = createIconAssetId(profileId, slot);
    if (raw.id !== expectedId) throw new BackupValidationError('invalid_icon_id');
    ids.push(expectedId);
    if (typeof raw.base64 !== 'string') throw new BackupValidationError('invalid_icon_base64');
    if (raw.mimeType !== 'image/png' && raw.mimeType !== 'image/jpeg' && raw.mimeType !== 'image/webp') {
      throw new BackupValidationError('unsupported_icon_type');
    }
    const bytes = base64ToBytes(raw.base64);
    try {
      assertIconFileMetadata({ type: raw.mimeType, size: bytes.byteLength });
      assertIconSignature(raw.mimeType, bytes.subarray(0, 12));
      if (typeof createImageBitmap === 'function' || typeof Image !== 'undefined') {
        await validateIconFile(new File([bytes], raw.fileName as string, { type: raw.mimeType }));
      }
    } catch (error) {
      throw new BackupValidationError(error instanceof Error ? error.message : 'invalid_icon_asset');
    }
    if (bytes.byteLength > ICON_MAX_FILE_BYTES) throw new BackupValidationError('icon_file_too_large');
    if (typeof raw.fileName !== 'string' || !raw.fileName || [...raw.fileName].length > 255) {
      throw new BackupValidationError('invalid_icon_filename');
    }
    if (typeof raw.updatedAt !== 'string') throw new BackupValidationError('invalid_icon_timestamp');
    const transform = normalizeIconTransform(raw);
    if (
      transform.fit !== raw.fit
      || transform.zoom !== raw.zoom
      || transform.offsetX !== raw.offsetX
      || transform.offsetY !== raw.offsetY
    ) throw new BackupValidationError('invalid_icon_transform');
  }
  assertUnique(ids, 'duplicate_icon_id');
}

function assertUnique(values: string[], code: string): void {
  if (new Set(values).size !== values.length) throw new BackupValidationError(code);
}

function assertFiniteNonNegative(value: unknown, code: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new BackupValidationError(code);
  }
}

function validatePayload(payload: unknown): asserts payload is BackupPayloadV1 {
  if (!isRecord(payload) || !isRecord(payload.settings)) throw new BackupValidationError('invalid_payload');
  if (!Array.isArray(payload.decks) || !Array.isArray(payload.cards) || !Array.isArray(payload.reports)) {
    throw new BackupValidationError('invalid_payload');
  }

  const settings = payload.settings;
  if (!UI_LANGUAGES.has(String(settings.uiLanguage))) throw new BackupValidationError('invalid_ui_language');
  if (!DEFINITION_LANGUAGES.has(String(settings.definitionLanguage))) {
    throw new BackupValidationError('invalid_definition_language');
  }
  if (!Number.isInteger(settings.globalDailyLimit) || Number(settings.globalDailyLimit) < 0 || Number(settings.globalDailyLimit) > 1000) {
    throw new BackupValidationError('invalid_global_limit');
  }
  if (!Array.isArray(settings.selectedDeckIds) || settings.selectedDeckIds.some(id => typeof id !== 'string')) {
    throw new BackupValidationError('invalid_selected_decks');
  }
  if (!isRecord(settings.appearance)) throw new BackupValidationError('invalid_appearance');

  const decks = payload.decks as unknown[];
  const cards = payload.cards as unknown[];
  const reports = payload.reports as unknown[];
  if (decks.some(deck => !isRecord(deck) || typeof deck.id !== 'string' || !deck.id || typeof deck.name !== 'string')) {
    throw new BackupValidationError('invalid_deck');
  }
  if (cards.some(card => (
    !isRecord(card)
    || typeof card.id !== 'string'
    || !card.id
    || typeof card.deckId !== 'string'
    || typeof card.front !== 'string'
    || typeof card.back !== 'string'
    || !CARD_STATES.has(String(card.state))
  ))) {
    throw new BackupValidationError('invalid_card');
  }
  if (reports.some(report => !isRecord(report) || typeof report.dateStr !== 'string' || !isRecord(report.clicks))) {
    throw new BackupValidationError('invalid_report');
  }

  const typedDecks = payload.decks as Deck[];
  const typedCards = payload.cards as Card[];
  const typedReports = payload.reports as Report[];
  assertUnique(typedDecks.map(deck => deck.id), 'duplicate_deck_id');
  assertUnique(typedCards.map(card => card.id), 'duplicate_card_id');
  assertUnique(typedReports.map(report => report.dateStr), 'duplicate_report_date');
  assertUnique(settings.selectedDeckIds as string[], 'duplicate_selected_deck_id');

  const deckIds = new Set(typedDecks.map(deck => deck.id));
  if (typedCards.some(card => !deckIds.has(card.deckId))) throw new BackupValidationError('orphan_card');
  if (typedDecks.some(deck => !typedCards.some(card => card.deckId === deck.id))) {
    throw new BackupValidationError('empty_deck');
  }
  if ((settings.selectedDeckIds as string[]).some(id => !deckIds.has(id))) {
    throw new BackupValidationError('unknown_selected_deck');
  }

  for (const card of typedCards) {
    assertFiniteNonNegative(card.interval, 'invalid_card_interval');
    assertFiniteNonNegative(card.easeFactor, 'invalid_card_ease');
    assertFiniteNonNegative(card.failCount, 'invalid_card_fail_count');
    assertFiniteNonNegative(card.hardCount, 'invalid_card_hard_count');
  }
  for (const report of typedReports) {
    assertFiniteNonNegative(report.uniqueCards, 'invalid_report_count');
    for (const value of Object.values(report.clicks)) assertFiniteNonNegative(value, 'invalid_report_clicks');
  }
}

function captureRawSettings(storage: Storage): Map<string, string | null> {
  return new Map(STORAGE_KEYS.map(key => [key, storage.getItem(key)]));
}

function restoreRawSettings(storage: Storage, settings: Map<string, string | null>): void {
  for (const [key, value] of settings) {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  }
}

function applySettings(settings: BackupSettingsV1, storage: Storage): void {
  const listeningPreferences = normalizeListeningPreferences(settings.listeningPreferences);
  assertValidListeningPreferences(listeningPreferences);
  storage.setItem('srs_ui_lang', settings.uiLanguage);
  storage.setItem('srs_def_lang_pref', settings.definitionLanguage);
  storage.setItem('srs_global_limit', String(settings.globalDailyLimit));
  storage.setItem('srs_selected_decks', JSON.stringify(settings.selectedDeckIds));
  storage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(settings.appearance));
  storage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(normalizeUiPreferences(settings.uiPreferences)));
  storage.setItem(LISTENING_PREFERENCES_STORAGE_KEY, JSON.stringify(listeningPreferences));
}

function readSelectedDeckIds(storage: Storage): string[] {
  try {
    const value = JSON.parse(storage.getItem('srs_selected_decks') ?? '[]');
    return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function readBackupSettings(storage: Storage): BackupSettingsV1 {
  const uiLanguage = storage.getItem('srs_ui_lang') ?? 'zh-TW';
  const definitionLanguage = storage.getItem('srs_def_lang_pref') ?? 'deck';
  const rawLimit = Number.parseInt(storage.getItem('srs_global_limit') ?? '30', 10);
  return {
    uiLanguage: UI_LANGUAGES.has(uiLanguage) ? uiLanguage : 'zh-TW',
    definitionLanguage: DEFINITION_LANGUAGES.has(definitionLanguage)
      ? definitionLanguage as BackupSettingsV1['definitionLanguage']
      : 'deck',
    globalDailyLimit: Number.isInteger(rawLimit) ? Math.max(0, Math.min(1000, rawLimit)) : 30,
    selectedDeckIds: readSelectedDeckIds(storage),
    appearance: readAppearanceSettings(storage),
    uiPreferences: readUiPreferences(storage),
    listeningPreferences: readListeningPreferences(storage),
  };
}

function createBrowserRepository(storage: Storage): BackupRepository {
  return {
    readAll: async () => {
      const [data, iconRecords] = await Promise.all([DB.getAllData(), DB.getAllIconAssets()]);
      return {
        settings: readBackupSettings(storage),
        ...data,
        iconAssets: await Promise.all(iconRecords.map(iconRecordToBackup)),
      };
    },
    replaceAll: async payload => {
      await DB.replaceAllData({
        decks: payload.decks,
        cards: payload.cards,
        reports: payload.reports,
      });
      await DB.replaceAllIconAssets((payload.iconAssets ?? []).map(backupIconToRecord));
    },
  };
}

export async function createBackupEnvelope(
  payload: BackupPayloadV1,
  options: { createdAt?: string; snapshotId?: string; appVersion?: string } = {},
): Promise<BackupEnvelopeV1> {
  const serializablePayload = normalizePayloadForCurrentSchema(payload);
  const counts = {
    decks: serializablePayload.decks.length,
    cards: serializablePayload.cards.length,
    reports: serializablePayload.reports.length,
    iconAssets: serializablePayload.iconAssets?.length ?? 0,
  };
  return {
    manifest: {
      format: BACKUP_FORMAT,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      appVersion: options.appVersion ?? '1.1.0',
      createdAt: options.createdAt ?? new Date().toISOString(),
      snapshotId: options.snapshotId ?? createPortableUuid(),
      payloadHash: await hashBackupPayload(serializablePayload),
      counts,
    },
    payload: serializablePayload,
  };
}

export async function validateBackupText(
  text: string,
  maxBytes = DEFAULT_MAX_BACKUP_BYTES,
): Promise<{ envelope: BackupEnvelopeV1; summary: BackupEnvelopeV1['manifest']['counts'] }> {
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new BackupValidationError('file_too_large');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupValidationError('invalid_json');
  }
  if (!isRecord(parsed) || !isRecord(parsed.manifest)) throw new BackupValidationError('invalid_manifest');
  const manifest = parsed.manifest;
  if (manifest.format !== BACKUP_FORMAT) throw new BackupValidationError('invalid_format');
  if (
    manifest.schemaVersion !== 1
    && manifest.schemaVersion !== 2
    && manifest.schemaVersion !== BACKUP_SCHEMA_VERSION
  ) {
    throw new BackupValidationError('unsupported_schema');
  }
  if (typeof manifest.payloadHash !== 'string') throw new BackupValidationError('invalid_hash');
  if (!isRecord(manifest.counts)) throw new BackupValidationError('invalid_counts');

  validatePayload(parsed.payload);
  const parsedEnvelope = parsed as unknown as BackupEnvelopeV1;
  const sourceIconAssets = parsedEnvelope.payload.iconAssets ?? [];
  if (Number(manifest.schemaVersion) >= 2) {
    await validateIconAssets(parsedEnvelope.payload.iconAssets);
  }
  if (manifest.schemaVersion === BACKUP_SCHEMA_VERSION) {
    validateListeningPreferences(parsedEnvelope.payload.settings.listeningPreferences);
  }
  const actualSourceCounts = {
    decks: parsedEnvelope.payload.decks.length,
    cards: parsedEnvelope.payload.cards.length,
    reports: parsedEnvelope.payload.reports.length,
    ...(Number(manifest.schemaVersion) >= 2 ? { iconAssets: sourceIconAssets.length } : {}),
  };
  if (stableStringify(manifest.counts) !== stableStringify(actualSourceCounts)) {
    throw new BackupValidationError('count_mismatch');
  }
  if (await hashBackupPayload(parsedEnvelope.payload) !== manifest.payloadHash) {
    throw new BackupValidationError('hash_mismatch');
  }
  const envelope = await createBackupEnvelope(normalizePayloadForCurrentSchema(parsedEnvelope.payload), {
    appVersion: String(manifest.appVersion ?? '1.1.0'),
    createdAt: String(manifest.createdAt ?? new Date().toISOString()),
    snapshotId: String(manifest.snapshotId ?? createPortableUuid()),
  });
  const summary = envelope.manifest.counts;
  return { envelope, summary };
}

export async function importBackupText(
  text: string,
  repository: BackupRepository,
  storage: Storage,
): Promise<BackupEnvelopeV1['manifest']['counts']> {
  const dryRun = await validateBackupText(text);
  const priorPayload = await repository.readAll();
  const priorSettings = captureRawSettings(storage);
  try {
    await repository.replaceAll(dryRun.envelope.payload);
    applySettings(dryRun.envelope.payload.settings, storage);
    return dryRun.summary;
  } catch (error) {
    try {
      await repository.replaceAll(priorPayload);
      restoreRawSettings(storage, priorSettings);
    } catch (rollbackError) {
      throw new Error(`import_rollback_failed: ${String(rollbackError)}`, { cause: error });
    }
    throw new Error('import_rolled_back', { cause: error });
  }
}

export async function prepareLocalBackup(storage: Storage = window.localStorage): Promise<PreparedBackup> {
  const payload = await createBrowserRepository(storage).readAll();
  const envelope = await createBackupEnvelope(payload);
  const text = JSON.stringify(envelope, null, 2);
  await validateBackupText(text);
  const date = envelope.manifest.createdAt.slice(0, 10);
  return { envelope, text, fileName: `wordforge-backup-${date}.json` };
}

export function downloadPreparedBackup(prepared: PreparedBackup): void {
  const url = URL.createObjectURL(new Blob([prepared.text], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = prepared.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function importLocalBackup(
  text: string,
  storage: Storage = window.localStorage,
): Promise<BackupEnvelopeV1['manifest']['counts']> {
  return importBackupText(text, createBrowserRepository(storage), storage);
}
