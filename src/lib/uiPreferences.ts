export const UI_PREFERENCES_STORAGE_KEY = 'wordforge_ui_preferences_v1';

export const ICON_PROFILE_IDS = ['profile-1', 'profile-2', 'profile-3'] as const;
export type IconProfileId = typeof ICON_PROFILE_IDS[number];

export const UI_SCALE_CONSTRAINTS = {
  base: { min: 0.9, max: 1.15, step: 0.05, defaultValue: 1 },
  pageHeading: { min: 0.9, max: 1.25, step: 0.05, defaultValue: 1 },
  cardTitle: { min: 0.9, max: 1.25, step: 0.05, defaultValue: 1 },
  cardBody: { min: 0.9, max: 1.15, step: 0.05, defaultValue: 1 },
  statNumber: { min: 0.9, max: 1.3, step: 0.05, defaultValue: 1 },
  icon: { min: 0.8, max: 1.25, step: 0.05, defaultValue: 1 },
  studyPrompt: { min: 0.9, max: 1.25, step: 0.05, defaultValue: 1 },
  studyContent: { min: 0.9, max: 1.2, step: 0.05, defaultValue: 1 },
} as const;

export type UiScaleKey = keyof typeof UI_SCALE_CONSTRAINTS;
export type UiScaleValues = Record<UiScaleKey, number>;

export interface IconProfileMetadata {
  id: IconProfileId;
  name: string;
}

export interface UiPreferencesV1 {
  schemaVersion: 1;
  scales: UiScaleValues;
  iconProfiles: [IconProfileMetadata, IconProfileMetadata, IconProfileMetadata];
  activeIconProfileId: IconProfileId;
  updatedAt: string;
}

const DEFAULT_PROFILE_NAMES: Record<IconProfileId, string> = {
  'profile-1': '設定 1',
  'profile-2': '設定 2',
  'profile-3': '設定 3',
};

const SCALE_TO_CSS_VAR: Record<UiScaleKey, string> = {
  base: '--font-scale-base',
  pageHeading: '--font-scale-heading',
  cardTitle: '--font-scale-card-title',
  cardBody: '--font-scale-card-body',
  statNumber: '--font-scale-stat-number',
  icon: '--icon-scale',
  studyPrompt: '--font-scale-study-prompt',
  studyContent: '--font-scale-study-content',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeScale(key: UiScaleKey, value: unknown): number {
  const constraint = UI_SCALE_CONSTRAINTS[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) return constraint.defaultValue;
  const clamped = Math.max(constraint.min, Math.min(constraint.max, value));
  const stepped = constraint.min + Math.round((clamped - constraint.min) / constraint.step) * constraint.step;
  return Number(Math.max(constraint.min, Math.min(constraint.max, stepped)).toFixed(2));
}

function normalizeProfileName(value: unknown, id: IconProfileId): string {
  if (typeof value !== 'string') return DEFAULT_PROFILE_NAMES[id];
  const trimmed = value.trim();
  return trimmed ? [...trimmed].slice(0, 24).join('') : DEFAULT_PROFILE_NAMES[id];
}

export function createDefaultUiPreferences(now = new Date().toISOString()): UiPreferencesV1 {
  return {
    schemaVersion: 1,
    scales: Object.fromEntries(
      (Object.keys(UI_SCALE_CONSTRAINTS) as UiScaleKey[])
        .map(key => [key, UI_SCALE_CONSTRAINTS[key].defaultValue]),
    ) as UiScaleValues,
    iconProfiles: ICON_PROFILE_IDS.map(id => ({ id, name: DEFAULT_PROFILE_NAMES[id] })) as UiPreferencesV1['iconProfiles'],
    activeIconProfileId: 'profile-1',
    updatedAt: now,
  };
}

export function normalizeUiPreferences(value: unknown, now = new Date().toISOString()): UiPreferencesV1 {
  const defaults = createDefaultUiPreferences(now);
  if (!isRecord(value) || value.schemaVersion !== 1) return defaults;

  const rawScales = isRecord(value.scales) ? value.scales : {};
  const rawProfiles = Array.isArray(value.iconProfiles) ? value.iconProfiles : [];
  const iconProfiles = ICON_PROFILE_IDS.map(id => {
    const raw = rawProfiles.find(profile => isRecord(profile) && profile.id === id);
    return { id, name: normalizeProfileName(isRecord(raw) ? raw.name : undefined, id) };
  }) as UiPreferencesV1['iconProfiles'];
  const activeIconProfileId = ICON_PROFILE_IDS.includes(value.activeIconProfileId as IconProfileId)
    ? value.activeIconProfileId as IconProfileId
    : defaults.activeIconProfileId;

  return {
    schemaVersion: 1,
    scales: Object.fromEntries(
      (Object.keys(UI_SCALE_CONSTRAINTS) as UiScaleKey[])
        .map(key => [key, normalizeScale(key, rawScales[key])]),
    ) as UiScaleValues,
    iconProfiles,
    activeIconProfileId,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : now,
  };
}

export function readUiPreferences(storage: Storage = window.localStorage): UiPreferencesV1 {
  const raw = storage.getItem(UI_PREFERENCES_STORAGE_KEY);
  if (!raw) return createDefaultUiPreferences();
  try {
    return normalizeUiPreferences(JSON.parse(raw));
  } catch {
    return createDefaultUiPreferences();
  }
}

export function saveUiPreferences(settings: UiPreferencesV1, storage: Storage = window.localStorage): void {
  storage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(normalizeUiPreferences(settings)));
}

function withUpdatedAt(settings: UiPreferencesV1): UiPreferencesV1 {
  return { ...settings, updatedAt: new Date().toISOString() };
}

export function setUiScale(settings: UiPreferencesV1, key: UiScaleKey, value: number): UiPreferencesV1 {
  return withUpdatedAt({
    ...settings,
    scales: { ...settings.scales, [key]: normalizeScale(key, value) },
  });
}

export function resetUiScale(settings: UiPreferencesV1, key: UiScaleKey): UiPreferencesV1 {
  return setUiScale(settings, key, UI_SCALE_CONSTRAINTS[key].defaultValue);
}

export function resetAllUiScales(settings: UiPreferencesV1): UiPreferencesV1 {
  return withUpdatedAt({ ...settings, scales: createDefaultUiPreferences().scales });
}

export function renameIconProfile(
  settings: UiPreferencesV1,
  profileId: IconProfileId,
  name: string,
): UiPreferencesV1 {
  const draftName = [...name].slice(0, 24).join('');
  return withUpdatedAt({
    ...settings,
    iconProfiles: settings.iconProfiles.map(profile => (
      profile.id === profileId
        ? { ...profile, name: draftName }
        : profile
    )) as UiPreferencesV1['iconProfiles'],
  });
}

export function selectIconProfile(settings: UiPreferencesV1, profileId: IconProfileId): UiPreferencesV1 {
  return withUpdatedAt({ ...settings, activeIconProfileId: profileId });
}

export function applyUiPreferences(
  settings: UiPreferencesV1,
  root: HTMLElement = document.documentElement,
): void {
  const normalized = normalizeUiPreferences(settings);
  for (const key of Object.keys(UI_SCALE_CONSTRAINTS) as UiScaleKey[]) {
    root.style.setProperty(SCALE_TO_CSS_VAR[key], String(normalized.scales[key]));
  }
}
