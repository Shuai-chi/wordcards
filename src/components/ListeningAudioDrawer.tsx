import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { RefreshCw, RotateCcw, Volume2, X } from 'lucide-react';
import {
  LISTENING_RATE_OPTIONS,
  type ListeningRate,
  type PreferredVoiceV1,
} from '../lib/listeningPreferences';
import {
  formatListeningString,
  type ListeningStrings,
} from '../lib/listeningStrings';
import {
  findPreferredVoice,
  isVoiceLanguageCompatible,
} from '../lib/speechEngine';

interface ListeningAudioDrawerProps {
  open: boolean;
  strings: ListeningStrings;
  voices: SpeechSynthesisVoice[];
  voicesLoading: boolean;
  requestLang: string;
  rate: ListeningRate;
  preferredVoice: PreferredVoiceV1 | null;
  previewing: boolean;
  previewError: string | null;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onRateChange: (rate: ListeningRate) => void;
  onVoiceChange: (voice: PreferredVoiceV1 | null) => void;
  onPreview: () => void;
  onReset: () => void;
  onRefreshVoices: () => void;
  onClose: () => void;
}

function rateTestId(rate: ListeningRate): string {
  return String(rate).replace('.', '-');
}

function describeVoice(voice: SpeechSynthesisVoice): PreferredVoiceV1 {
  return {
    voiceURI: voice.voiceURI,
    name: voice.name,
    lang: voice.lang,
  };
}

export default function ListeningAudioDrawer({
  open,
  strings,
  voices,
  voicesLoading,
  requestLang,
  rate,
  preferredVoice,
  previewing,
  previewError,
  triggerRef,
  onRateChange,
  onVoiceChange,
  onPreview,
  onReset,
  onRefreshVoices,
  onClose,
}: ListeningAudioDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [showAll, setShowAll] = useState(false);

  const close = useCallback(() => {
    setShowAll(false);
    onClose();
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, [onClose, triggerRef]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      )];
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [close, open]);

  if (!open) return null;

  const compatibleVoices = voices.filter(voice => (
    isVoiceLanguageCompatible(voice.lang, requestLang)
  ));
  const hasOtherLanguages = compatibleVoices.length !== voices.length;
  const visibleVoices = [...(showAll ? voices : compatibleVoices)].sort(
    (left, right) => (
      left.lang.localeCompare(right.lang)
      || left.name.localeCompare(right.name)
    ),
  );
  const groupedVoices = visibleVoices.reduce<Map<string, SpeechSynthesisVoice[]>>(
    (groups, voice) => {
      const group = groups.get(voice.lang) ?? [];
      group.push(voice);
      groups.set(voice.lang, group);
      return groups;
    },
    new Map(),
  );
  const resolvedPreferred = findPreferredVoice(voices, preferredVoice);
  const preferredUnavailable = preferredVoice !== null && resolvedPreferred === null;

  return (
    <div
      className="listening-audio-overlay"
      onMouseDown={event => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        className="listening-audio-drawer"
        data-testid="listening-audio-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={strings.audioSettings}
      >
        <div className="listening-drawer__header">
          <h2>{strings.audioSettings}</h2>
          <div className="listening-audio-actions listening-audio-actions--header">
            <button
              type="button"
              className="btn btn-primary"
              data-testid="listening-audio-preview"
              disabled={previewing}
              onClick={onPreview}
            >
              <Volume2 aria-hidden="true" />
              {previewing ? strings.previewing : strings.previewVoice}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              data-testid="listening-audio-reset"
              onClick={onReset}
            >
              <RotateCcw aria-hidden="true" />
              {strings.resetAudio}
            </button>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="btn btn-ghost listening-icon-button"
            data-testid="listening-audio-close"
            aria-label={strings.closeAudioSettings}
            title={strings.closeAudioSettings}
            onClick={close}
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="listening-audio-drawer__body">
          <section className="listening-audio-section">
            <h3>{strings.rate}</h3>
            <div className="listening-rate-grid">
              {LISTENING_RATE_OPTIONS.map(option => (
                <button
                  key={option}
                  type="button"
                  data-testid={`listening-rate-${rateTestId(option)}`}
                  aria-pressed={rate === option}
                  onClick={() => onRateChange(option)}
                >
                  {option}×
                </button>
              ))}
            </div>
          </section>

          <section className="listening-audio-section">
            <h3>{strings.preferredVoice}</h3>
            <div className="listening-voice-list" role="radiogroup">
              <label className="listening-voice-option">
                <input
                  type="radio"
                  name="listening-preferred-voice"
                  value="automatic"
                  checked={preferredVoice === null}
                  onChange={() => onVoiceChange(null)}
                />
                <span>
                  <strong>{strings.automaticVoice}</strong>
                </span>
              </label>

              {preferredVoice && preferredUnavailable && (
                <label className="listening-voice-option" aria-disabled="true">
                  <input
                    type="radio"
                    name="listening-preferred-voice"
                    checked
                    disabled
                    readOnly
                  />
                  <span>
                    <strong>{preferredVoice.name}</strong>
                    <small>{preferredVoice.lang} · {strings.voiceUnavailable}</small>
                  </span>
                </label>
              )}

              {voicesLoading && <p aria-live="polite">{strings.voicesLoading}</p>}
              {!voicesLoading && voices.length === 0 && (
                <div className="listening-voice-empty">
                  <p>{strings.voicesUnavailable}</p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onRefreshVoices}
                  >
                    <RefreshCw aria-hidden="true" />
                    {strings.refreshVoices}
                  </button>
                </div>
              )}

              {[...groupedVoices].map(([lang, group]) => (
                <div className="listening-voice-group" key={lang}>
                  <h4>{lang}</h4>
                  {group.map(voice => (
                    <label className="listening-voice-option" key={voice.voiceURI}>
                      <input
                        type="radio"
                        name="listening-preferred-voice"
                        value={voice.voiceURI}
                        checked={resolvedPreferred?.voiceURI === voice.voiceURI}
                        onChange={() => onVoiceChange(describeVoice(voice))}
                      />
                      <span>
                        <strong>{voice.name}</strong>
                        <small>
                          {voice.lang} · {
                            voice.localService
                              ? strings.localVoice
                              : strings.networkVoice
                          }
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>

            {hasOtherLanguages && (
              <button
                type="button"
                className="btn btn-ghost"
                data-testid="listening-voice-show-all"
                onClick={() => setShowAll(value => !value)}
              >
                {showAll ? strings.showCompatibleVoices : strings.showAllVoices}
              </button>
            )}
          </section>

          {previewError && (
            <p className="listening-error" role="status">
              {formatListeningString(strings.previewError, { error: previewError })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
