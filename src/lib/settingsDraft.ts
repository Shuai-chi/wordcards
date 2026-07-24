import type { IconAssetRecord } from './iconAssets';
import type { AppearanceSettingsV1, ThemeSelection } from './theme';
import { UI_SCALE_CONSTRAINTS, type UiPreferencesV1, type UiScaleKey } from './uiPreferences';

export type DefinitionLanguagePreference = 'deck' | 'user' | 'bilingual';

export interface SettingsDraft {
  limit: number;
  defLangPref: DefinitionLanguagePreference;
  appearance: AppearanceSettingsV1;
  uiPreferences: UiPreferencesV1;
  iconRecords: IconAssetRecord[];
}

function themeSelectionEqual(a: ThemeSelection, b: ThemeSelection): boolean {
  if (a.presetId !== b.presetId) return false;
  if (!a.custom || !b.custom) return a.custom === b.custom;
  return a.custom.background === b.custom.background
    && a.custom.card === b.custom.card
    && a.custom.primary === b.custom.primary
    && a.custom.accent === b.custom.accent;
}

function appearanceEqual(a: AppearanceSettingsV1, b: AppearanceSettingsV1): boolean {
  return a.schemaVersion === b.schemaVersion
    && a.mode === b.mode
    && themeSelectionEqual(a.light, b.light)
    && themeSelectionEqual(a.dark, b.dark);
}

function uiPreferencesEqual(a: UiPreferencesV1, b: UiPreferencesV1): boolean {
  if (a.schemaVersion !== b.schemaVersion || a.activeIconProfileId !== b.activeIconProfileId) return false;
  const scaleKeys = Object.keys(UI_SCALE_CONSTRAINTS) as UiScaleKey[];
  if (scaleKeys.some(key => a.scales[key] !== b.scales[key])) return false;
  if (a.iconProfiles.length !== b.iconProfiles.length) return false;

  const profilesA = [...a.iconProfiles].sort((left, right) => left.id.localeCompare(right.id));
  const profilesB = [...b.iconProfiles].sort((left, right) => left.id.localeCompare(right.id));
  return profilesA.every((profile, index) => (
    profile.id === profilesB[index]?.id && profile.name === profilesB[index]?.name
  ));
}

function iconRecordEqual(a: IconAssetRecord, b: IconAssetRecord): boolean {
  return a.id === b.id
    && a.profileId === b.profileId
    && a.slot === b.slot
    && a.mimeType === b.mimeType
    && a.fileName === b.fileName
    && a.fit === b.fit
    && a.zoom === b.zoom
    && a.offsetX === b.offsetX
    && a.offsetY === b.offsetY
    && a.blob.size === b.blob.size
    && a.blob.type === b.blob.type
    && a.blob === b.blob;
}

function iconRecordsEqual(a: IconAssetRecord[], b: IconAssetRecord[]): boolean {
  if (a.length !== b.length) return false;
  const recordsA = [...a].sort((left, right) => left.id.localeCompare(right.id));
  const recordsB = [...b].sort((left, right) => left.id.localeCompare(right.id));
  return recordsA.every((record, index) => (
    recordsB[index] !== undefined && iconRecordEqual(record, recordsB[index])
  ));
}

export function areSettingsDraftsEqual(a: SettingsDraft, b: SettingsDraft): boolean {
  return a.limit === b.limit
    && a.defLangPref === b.defLangPref
    && appearanceEqual(a.appearance, b.appearance)
    && uiPreferencesEqual(a.uiPreferences, b.uiPreferences)
    && iconRecordsEqual(a.iconRecords, b.iconRecords);
}
