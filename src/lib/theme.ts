export type ThemeMode = 'system' | 'light' | 'dark';
export type EffectiveTheme = 'light' | 'dark';

export interface ThemeCoreTokens {
  background: string;
  card: string;
  primary: string;
  accent: string;
}

export interface ThemePreset extends ThemeCoreTokens {
  id: string;
  name: string;
  mode: EffectiveTheme;
}

export interface ThemeSelection {
  presetId: string;
  custom?: ThemeCoreTokens;
}

export interface AppearanceSettingsV1 {
  schemaVersion: 1;
  mode: ThemeMode;
  light: ThemeSelection;
  dark: ThemeSelection;
  updatedAt: string;
}

export interface ResolvedThemeTokens extends ThemeCoreTokens {
  foreground: string;
  primaryLight: string;
  primaryForeground: string;
  secondary: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  cardForeground: string;
  surface: string;
  overlay: string;
}

export const APPEARANCE_STORAGE_KEY = 'wordforge_appearance_v1';

export const THEME_PRESETS: Record<EffectiveTheme, ThemePreset[]> = {
  light: [
    {
      id: 'ocean',
      name: '清朗海洋 Ocean',
      mode: 'light',
      background: '#F8FAFC',
      card: '#FFFFFF',
      primary: '#2563EB',
      accent: '#7C3AED',
    },
    {
      id: 'forest',
      name: '靜謐森林 Forest',
      mode: 'light',
      background: '#F7FAF7',
      card: '#FFFFFF',
      primary: '#166534',
      accent: '#0F766E',
    },
    {
      id: 'amber',
      name: '暖陽琥珀 Amber',
      mode: 'light',
      background: '#FFFBEB',
      card: '#FFFFFF',
      primary: '#B45309',
      accent: '#9A3412',
    },
  ],
  dark: [
    {
      id: 'midnight',
      name: '午夜藍 Midnight',
      mode: 'dark',
      background: '#0F172A',
      card: '#1E293B',
      primary: '#93C5FD',
      accent: '#C4B5FD',
    },
    {
      id: 'deep-forest',
      name: '深林 Deep Forest',
      mode: 'dark',
      background: '#0B1712',
      card: '#13241B',
      primary: '#6EE7B7',
      accent: '#67E8F9',
    },
    {
      id: 'graphite-rose',
      name: '石墨玫瑰 Graphite Rose',
      mode: 'dark',
      background: '#18181B',
      card: '#27272A',
      primary: '#FDA4AF',
      accent: '#C4B5FD',
    },
  ],
};

const DEFAULT_SELECTIONS: Record<EffectiveTheme, ThemeSelection> = {
  light: { presetId: 'ocean' },
  dark: { presetId: 'midnight' },
};

const TOKEN_TO_CSS_VAR: Record<keyof ResolvedThemeTokens, string> = {
  background: '--background',
  foreground: '--foreground',
  primary: '--primary',
  primaryLight: '--primary-light',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  accent: '--accent',
  muted: '--muted',
  border: '--border',
  success: '--success',
  warning: '--warning',
  danger: '--danger',
  card: '--card',
  cardForeground: '--card-foreground',
  surface: '--surface',
  overlay: '--overlay',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isHexColor(value: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(value);
}

export function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  if (/^#[0-9A-F]{6}$/i.test(trimmed)) return trimmed.toUpperCase();
  if (/^#[0-9A-F]{3}$/i.test(trimmed)) {
    return `#${trimmed.slice(1).split('').map(char => char + char).join('')}`.toUpperCase();
  }
  return null;
}

function parseHex(hex: string): [number, number, number] {
  const normalized = normalizeHex(hex) ?? '#000000';
  return [
    parseInt(normalized.slice(1, 3), 16),
    parseInt(normalized.slice(3, 5), 16),
    parseInt(normalized.slice(5, 7), 16),
  ];
}

function toHex([red, green, blue]: [number, number, number]): string {
  return `#${[red, green, blue]
    .map(channel => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

export function mixColors(from: string, to: string, toWeight: number): string {
  const fromRgb = parseHex(from);
  const toRgb = parseHex(to);
  const weight = Math.max(0, Math.min(1, toWeight));
  return toHex(fromRgb.map((channel, index) => channel + (toRgb[index] - channel) * weight) as [number, number, number]);
}

function relativeLuminance(hex: string): number {
  const channels = parseHex(hex).map(channel => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(first: string, second: string): number {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function chooseForeground(backgrounds: string[]): string {
  const candidates = ['#0F172A', '#FFFFFF'];
  return candidates.reduce((best, candidate) => {
    const candidateScore = Math.min(...backgrounds.map(background => contrastRatio(candidate, background)));
    const bestScore = Math.min(...backgrounds.map(background => contrastRatio(best, background)));
    return candidateScore > bestScore ? candidate : best;
  });
}

function deriveReadableBlend(foreground: string, background: string, surfaces: string[], minimum: number): string {
  for (let backgroundWeight = 0.62; backgroundWeight >= 0; backgroundWeight -= 0.04) {
    const candidate = mixColors(foreground, background, backgroundWeight);
    if (surfaces.every(surface => contrastRatio(candidate, surface) >= minimum)) return candidate;
  }
  return foreground;
}

function getPreset(mode: EffectiveTheme, presetId: string): ThemePreset {
  return THEME_PRESETS[mode].find(preset => preset.id === presetId) ?? THEME_PRESETS[mode][0];
}

function parseCoreTokens(value: unknown): ThemeCoreTokens | null {
  if (!isRecord(value)) return null;
  const entries = ['background', 'card', 'primary', 'accent'] as const;
  const parsed = {} as ThemeCoreTokens;
  for (const key of entries) {
    const color = typeof value[key] === 'string' ? normalizeHex(value[key]) : null;
    if (!color) return null;
    parsed[key] = color;
  }
  return parsed;
}

function parseSelection(value: unknown, mode: EffectiveTheme): ThemeSelection {
  if (!isRecord(value) || typeof value.presetId !== 'string') return { ...DEFAULT_SELECTIONS[mode] };
  if (value.presetId === 'custom') {
    const custom = parseCoreTokens(value.custom);
    return custom ? { presetId: 'custom', custom } : { ...DEFAULT_SELECTIONS[mode] };
  }
  const presetExists = THEME_PRESETS[mode].some(preset => preset.id === value.presetId);
  return presetExists ? { presetId: value.presetId } : { ...DEFAULT_SELECTIONS[mode] };
}

export function createDefaultAppearance(mode: ThemeMode = 'system'): AppearanceSettingsV1 {
  return {
    schemaVersion: 1,
    mode,
    light: { ...DEFAULT_SELECTIONS.light },
    dark: { ...DEFAULT_SELECTIONS.dark },
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeAppearanceSettings(value: unknown, legacyTheme?: string | null): AppearanceSettingsV1 {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    const legacyMode: ThemeMode = legacyTheme === 'light' || legacyTheme === 'dark' ? legacyTheme : 'system';
    return createDefaultAppearance(legacyMode);
  }
  const mode: ThemeMode = value.mode === 'system' || value.mode === 'light' || value.mode === 'dark'
    ? value.mode
    : 'system';
  return {
    schemaVersion: 1,
    mode,
    light: parseSelection(value.light, 'light'),
    dark: parseSelection(value.dark, 'dark'),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
  };
}

export function readAppearanceSettings(storage: Storage = window.localStorage): AppearanceSettingsV1 {
  const raw = storage.getItem(APPEARANCE_STORAGE_KEY);
  if (!raw) return normalizeAppearanceSettings(null, storage.getItem('srs_theme'));
  try {
    return normalizeAppearanceSettings(JSON.parse(raw), storage.getItem('srs_theme'));
  } catch {
    return normalizeAppearanceSettings(null, storage.getItem('srs_theme'));
  }
}

export function saveAppearanceSettings(settings: AppearanceSettingsV1, storage: Storage = window.localStorage): void {
  storage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(settings));
  storage.removeItem('srs_theme');
}

export function withAppearanceTimestamp(settings: AppearanceSettingsV1): AppearanceSettingsV1 {
  return { ...settings, updatedAt: new Date().toISOString() };
}

export function getSystemTheme(): EffectiveTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getEffectiveTheme(settings: AppearanceSettingsV1, systemTheme: EffectiveTheme): EffectiveTheme {
  return settings.mode === 'system' ? systemTheme : settings.mode;
}

export function getThemeCore(settings: AppearanceSettingsV1, mode: EffectiveTheme): ThemeCoreTokens {
  const selection = settings[mode];
  if (selection.presetId === 'custom' && selection.custom) return { ...selection.custom };
  const preset = getPreset(mode, selection.presetId);
  return {
    background: preset.background,
    card: preset.card,
    primary: preset.primary,
    accent: preset.accent,
  };
}

export function setThemePreset(
  settings: AppearanceSettingsV1,
  mode: EffectiveTheme,
  presetId: string,
): AppearanceSettingsV1 {
  return { ...settings, [mode]: parseSelection({ presetId }, mode) };
}

export function setCustomTheme(
  settings: AppearanceSettingsV1,
  mode: EffectiveTheme,
  custom: ThemeCoreTokens,
): AppearanceSettingsV1 {
  return { ...settings, [mode]: { presetId: 'custom', custom } };
}

export function resetThemeMode(settings: AppearanceSettingsV1, mode: EffectiveTheme): AppearanceSettingsV1 {
  return { ...settings, [mode]: { ...DEFAULT_SELECTIONS[mode] } };
}

export function resolveThemeTokens(core: ThemeCoreTokens, mode: EffectiveTheme): ResolvedThemeTokens {
  const foreground = chooseForeground([core.background, core.card]);
  const primaryLight = mixColors(core.primary, mode === 'light' ? '#000000' : '#FFFFFF', 0.12);
  const primaryForeground = chooseForeground([core.primary, primaryLight]);
  const surfaces = [core.background, core.card];
  const muted = deriveReadableBlend(foreground, core.background, surfaces, 4.5);
  const border = deriveReadableBlend(foreground, core.background, surfaces, 3);
  const secondary = mixColors(core.background, foreground, mode === 'light' ? 0.06 : 0.12);

  return {
    ...core,
    foreground,
    primaryLight,
    primaryForeground,
    secondary,
    muted,
    border,
    success: mode === 'light' ? '#047857' : '#6EE7B7',
    warning: mode === 'light' ? '#B45309' : '#FCD34D',
    danger: mode === 'light' ? '#B91C1C' : '#FCA5A5',
    cardForeground: foreground,
    surface: secondary,
    overlay: mode === 'light' ? 'rgba(15, 23, 42, 0.5)' : 'rgba(0, 0, 0, 0.72)',
  };
}

export function getThemeContrastIssues(core: ThemeCoreTokens, mode: EffectiveTheme): string[] {
  const tokens = resolveThemeTokens(core, mode);
  const issues: string[] = [];
  const checks: Array<[string, string, string, number]> = [
    ['foreground/background', tokens.foreground, tokens.background, 4.5],
    ['foreground/card', tokens.foreground, tokens.card, 4.5],
    ['muted/background', tokens.muted, tokens.background, 4.5],
    ['muted/card', tokens.muted, tokens.card, 4.5],
    ['primary/background', tokens.primary, tokens.background, 4.5],
    ['primary/card', tokens.primary, tokens.card, 4.5],
    ['accent/background', tokens.accent, tokens.background, 4.5],
    ['accent/card', tokens.accent, tokens.card, 4.5],
    ['primary-foreground/primary', tokens.primaryForeground, tokens.primary, 4.5],
    ['primary-foreground/primary-hover', tokens.primaryForeground, tokens.primaryLight, 4.5],
    ['border/background', tokens.border, tokens.background, 3],
    ['border/card', tokens.border, tokens.card, 3],
  ];
  for (const [label, foreground, background, minimum] of checks) {
    if (contrastRatio(foreground, background) < minimum) issues.push(label);
  }
  return issues;
}

export function applyAppearance(
  settings: AppearanceSettingsV1,
  systemTheme: EffectiveTheme,
  root: HTMLElement = document.documentElement,
): void {
  const mode = getEffectiveTheme(settings, systemTheme);
  const selection = settings[mode];
  const tokens = resolveThemeTokens(getThemeCore(settings, mode), mode);
  root.setAttribute('data-theme', mode);
  root.setAttribute('data-theme-preset', selection.presetId);
  root.style.colorScheme = mode;
  for (const [token, cssVariable] of Object.entries(TOKEN_TO_CSS_VAR) as Array<[keyof ResolvedThemeTokens, string]>) {
    root.style.setProperty(cssVariable, tokens[token]);
  }
  const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeMeta) themeMeta.content = tokens.background;
}
