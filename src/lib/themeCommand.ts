import type { ThemeCoreTokens } from './theme';

export const THEME_COMMAND_FIELDS = [
  { key: 'background', token: 'background' },
  { key: 'card', token: 'card' },
  { key: 'primary', token: 'primary' },
  { key: 'accent', token: 'accent' },
] as const satisfies ReadonlyArray<{ key: string; token: keyof ThemeCoreTokens }>;

export type ThemeCommandErrorCode =
  | 'empty'
  | 'multiline'
  | 'empty-segment'
  | 'invalid-assignment'
  | 'unknown-label'
  | 'duplicate-label'
  | 'invalid-hex';

export interface ThemeCommandError {
  code: ThemeCommandErrorCode;
  segmentIndex?: number;
  segment?: string;
  label?: string;
  firstSegmentIndex?: number;
}

export type ThemeCommandResult =
  | { ok: true; patch: Partial<ThemeCoreTokens> }
  | { ok: false; error: ThemeCommandError };

const HEX_COLOR = /^#[0-9A-F]{6}$/i;
const ALLOWED_KEYS = THEME_COMMAND_FIELDS.map(field => field.key).join(', ');

export function parseThemeCommand(input: string): ThemeCommandResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: { code: 'empty' } };
  if (/[\r\n]/.test(input)) return { ok: false, error: { code: 'multiline' } };

  const segments = trimmed.split(';');
  const patch: Partial<ThemeCoreTokens> = {};
  const firstPositions = new Map<string, number>();

  for (let index = 0; index < segments.length; index += 1) {
    const segmentIndex = index + 1;
    const segment = segments[index].trim();
    if (!segment) return { ok: false, error: { code: 'empty-segment', segmentIndex, segment } };

    const firstEquals = segment.indexOf('=');
    if (firstEquals <= 0 || firstEquals !== segment.lastIndexOf('=')) {
      return { ok: false, error: { code: 'invalid-assignment', segmentIndex, segment } };
    }

    const label = segment.slice(0, firstEquals).trim();
    const value = segment.slice(firstEquals + 1).trim();
    const field = THEME_COMMAND_FIELDS.find(candidate => candidate.key === label);
    if (!field) {
      return { ok: false, error: { code: 'unknown-label', segmentIndex, segment, label } };
    }

    const firstSegmentIndex = firstPositions.get(label);
    if (firstSegmentIndex !== undefined) {
      return {
        ok: false,
        error: { code: 'duplicate-label', segmentIndex, segment, label, firstSegmentIndex },
      };
    }
    if (!HEX_COLOR.test(value)) {
      return { ok: false, error: { code: 'invalid-hex', segmentIndex, segment, label } };
    }

    firstPositions.set(label, segmentIndex);
    patch[field.token] = value.toUpperCase();
  }

  return { ok: true, patch };
}

export function serializeThemeCommand(tokens: ThemeCoreTokens): string {
  return THEME_COMMAND_FIELDS
    .map(field => `${field.key}=${tokens[field.token].toUpperCase()}`)
    .join(';');
}

export function formatThemeCommandError(error: ThemeCommandError): string {
  const location = error.segmentIndex ? `第 ${error.segmentIndex} 段` : '整行指令';
  const source = error.segment !== undefined ? `「${error.segment}」` : '';
  switch (error.code) {
    case 'empty': return '請輸入至少一個色彩項目。';
    case 'multiline': return '色彩指令只能使用單行格式。';
    case 'empty-segment': return `${location}${source}：不可有空白項目或結尾分號。`;
    case 'invalid-assignment': return `${location}${source}：每個項目必須使用「key=#RRGGBB」。`;
    case 'unknown-label': return `${location}${source}：未知鍵「${error.label ?? ''}」；可用鍵為 ${ALLOWED_KEYS}。`;
    case 'duplicate-label': return `${location}${source}：鍵「${error.label ?? ''}」已在第 ${error.firstSegmentIndex} 段出現。`;
    case 'invalid-hex': return `${location}${source}：色碼必須是六位 HEX，例如 #2563EB。`;
  }
}
