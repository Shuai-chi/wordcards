import { expect, test } from '@playwright/test';
import {
  formatThemeCommandError,
  parseThemeCommand,
  serializeThemeCommand,
} from '../src/lib/themeCommand';

test('parses a complete command and normalizes lowercase hex', () => {
  expect(parseThemeCommand('background=#f7f8fc;card=#ffffff;primary=#4f46e5;accent=#f59e0b')).toEqual({
    ok: true,
    patch: {
      background: '#F7F8FC',
      card: '#FFFFFF',
      primary: '#4F46E5',
      accent: '#F59E0B',
    },
  });
});

test('parses an arbitrary-order partial command with bounded whitespace', () => {
  expect(parseThemeCommand('  accent = #F59E0B ; primary = #2563EB  ')).toEqual({
    ok: true,
    patch: { accent: '#F59E0B', primary: '#2563EB' },
  });
});

for (const [name, input, code] of [
  ['empty', '   ', 'empty'],
  ['multiline', 'background=#F8FAFC\ncard=#FFFFFF', 'multiline'],
  ['unknown key', 'brand=#2563EB', 'unknown-label'],
  ['legacy Chinese key', '主色=#2563EB', 'unknown-label'],
  ['duplicate key', 'primary=#2563EB;primary=#166534', 'duplicate-label'],
  ['missing assignment', 'primary#2563EB', 'invalid-assignment'],
  ['too many assignments', 'primary=#2563EB=invalid', 'invalid-assignment'],
  ['three digit hex', 'primary=#369', 'invalid-hex'],
  ['invalid hex', 'primary=#12GG44', 'invalid-hex'],
  ['fullwidth delimiter', 'background=#F8FAFC；card=#FFFFFF', 'invalid-assignment'],
  ['trailing delimiter', 'background=#F8FAFC;', 'empty-segment'],
] as const) {
  test(`rejects ${name} atomically`, () => {
    const result = parseThemeCommand(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(code);
  });
}

test('reports segment, source and first duplicate position', () => {
  const result = parseThemeCommand('background=#F8FAFC;primary=#2563EB;primary=#166534');
  expect(result).toMatchObject({
    ok: false,
    error: {
      code: 'duplicate-label',
      segmentIndex: 3,
      segment: 'primary=#166534',
      firstSegmentIndex: 2,
    },
  });
  if (!result.ok) expect(formatThemeCommandError(result.error)).toContain('第 3 段');
});

test('serializes all tokens in canonical order and round trips', () => {
  const tokens = {
    primary: '#2563eb',
    accent: '#7c3aed',
    background: '#f8fafc',
    card: '#ffffff',
  };
  const command = serializeThemeCommand(tokens);
  expect(command).toBe('background=#F8FAFC;card=#FFFFFF;primary=#2563EB;accent=#7C3AED');
  expect(parseThemeCommand(command)).toEqual({
    ok: true,
    patch: {
      background: '#F8FAFC',
      card: '#FFFFFF',
      primary: '#2563EB',
      accent: '#7C3AED',
    },
  });
});
