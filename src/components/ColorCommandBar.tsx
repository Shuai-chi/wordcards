import { useEffect, useState } from 'react';
import { Check, Clipboard, RotateCcw } from '../icons/koboyo';
import type { EffectiveTheme, ThemeCoreTokens } from '../lib/theme';
import type { PersonalizationStrings } from '../lib/personalizationStrings';
import {
  THEME_COMMAND_FIELDS,
  formatThemeCommandError,
  parseThemeCommand,
  serializeThemeCommand,
} from '../lib/themeCommand';

interface Props {
  mode: EffectiveTheme;
  tokens: ThemeCoreTokens;
  strings: PersonalizationStrings;
  onApply: (patch: Partial<ThemeCoreTokens>) => void;
  onRestore: () => void;
}

type CommandStatus = { kind: 'success' | 'error'; text: string } | null;

function copyWithDocumentFallback(text: string): boolean {
  if (typeof document.execCommand !== 'function') return false;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true;
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  try {
    return document.execCommand('copy');
  } finally {
    textarea.remove();
  }
}

export default function ColorCommandBar({ mode, tokens, strings, onApply, onRestore }: Props) {
  const [command, setCommand] = useState('');
  const [status, setStatus] = useState<CommandStatus>(null);

  useEffect(() => {
    setCommand('');
    setStatus(null);
  }, [mode]);

  const applyCommand = () => {
    const result = parseThemeCommand(command);
    if (!result.ok) {
      setStatus({ kind: 'error', text: formatThemeCommandError(result.error) });
      return;
    }
    onApply(result.patch);
    const labels = THEME_COMMAND_FIELDS
      .filter(field => Object.hasOwn(result.patch, field.token))
      .map(field => field.key);
    setStatus({ kind: 'success', text: `${strings.colorCommandApplied}：${labels.join('、')}` });
  };

  const copyCurrent = async () => {
    try {
      const text = serializeThemeCommand(tokens);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (!copyWithDocumentFallback(text)) {
        throw new Error('clipboard_unavailable');
      }
      setStatus({ kind: 'success', text: strings.colorCommandCopied });
    } catch {
      setStatus({ kind: 'error', text: strings.colorCommandCopyFailed });
    }
  };

  const restore = () => {
    onRestore();
    setStatus({ kind: 'success', text: strings.colorCommandRestored });
  };

  return (
    <div className="color-command" data-testid="theme-command">
      <div className="color-command__header">
        <span className="color-command__title">{strings.colorCommandTitle}</span>
        <div className="color-command__links">
          <button
            type="button"
            data-testid="theme-command-show"
            onClick={() => {
              setCommand(serializeThemeCommand(tokens));
              setStatus(null);
            }}
          >
            {strings.colorCommandShowCurrent}
          </button>
          <button type="button" data-testid="theme-command-copy" onClick={() => void copyCurrent()}>
            <Clipboard aria-hidden="true" />
            {strings.colorCommandCopyCurrent}
          </button>
        </div>
      </div>
      <div className="color-command__input-row">
        <input
          type="text"
          className="input font-mono color-command__input"
          data-testid="theme-command-input"
          value={command}
          placeholder={strings.colorCommandPlaceholder}
          aria-describedby="theme-command-rule theme-command-status"
          spellCheck={false}
          autoComplete="off"
          onChange={event => {
            setCommand(event.target.value);
            setStatus(null);
          }}
          onKeyDown={event => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            applyCommand();
          }}
        />
        <button
          type="button"
          className="color-command__icon-button"
          data-testid="theme-command-apply"
          aria-label={strings.colorCommandApply}
          title={strings.colorCommandApply}
          onClick={applyCommand}
        >
          <Check aria-hidden="true" />
        </button>
        <button
          type="button"
          className="color-command__icon-button"
          data-testid="theme-command-restore"
          aria-label={strings.colorCommandRestore}
          title={strings.colorCommandRestore}
          onClick={restore}
        >
          <RotateCcw aria-hidden="true" />
        </button>
      </div>
      <p id="theme-command-rule" data-testid="theme-command-rule" className="color-command__rule">
        {strings.colorCommandRule}
      </p>
      <p
        id="theme-command-status"
        data-testid="theme-command-status"
        role={status?.kind === 'error' ? 'alert' : 'status'}
        aria-live="polite"
        className="color-command__status"
        data-kind={status?.kind ?? 'idle'}
      >
        {status?.text ?? ''}
      </p>
    </div>
  );
}
