import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ListMusic,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  Volume2,
} from 'lucide-react';
import { DB, getTodayStr } from '../lib/db';
import type { Deck, DeckType } from '../lib/types';
import type { UILang } from '../lib/languages';
import {
  buildListeningPlaylist,
} from '../lib/listeningPlaylist';
import {
  createPlaylistSeed,
  normalizeListeningPreferences,
  readListeningPreferences,
  saveListeningPreferences,
  setLastListeningCard,
  type ListeningPreferencesV1,
} from '../lib/listeningPreferences';
import {
  formatListeningString,
  getFrontRepeatLabel,
  LISTENING_STRINGS,
} from '../lib/listeningStrings';
import {
  PlaybackController,
  type PlaybackSnapshot,
} from '../lib/playbackController';
import {
  BrowserSpeechEngine,
  findPreferredVoice,
  isVoiceLanguageCompatible,
} from '../lib/speechEngine';
import ListeningAudioDrawer from './ListeningAudioDrawer';
import ListeningQueueDrawer from './ListeningQueueDrawer';

interface ListeningModeProps {
  mode: DeckType;
  deckIds: string[];
  decks: Deck[];
  globalLimit: number;
  uiLang: UILang;
  onBack: () => void;
  onPreferencesChanged: () => void;
}

const EMPTY_SNAPSHOT: PlaybackSnapshot = {
  status: 'idle',
  items: [],
  playableCount: 0,
  cardIndex: 0,
  phase: 'front',
  repeatIndex: 1,
  repeatTotal: 1,
  waitingFor: null,
  error: null,
  previewError: null,
};

function RepeatControl({
  label,
  value,
  testId,
  onChange,
}: {
  label: string;
  value: number;
  testId: 'front' | 'example';
  onChange: (value: number) => void;
}) {
  return (
    <div className="listening-repeat-control">
      <label htmlFor={`${testId}-repeat-input`}>{label}</label>
      <div className="listening-stepper">
        <button
          type="button"
          className="btn btn-ghost"
          data-testid={`${testId}-repeat-decrease`}
          aria-label={`${label} −`}
          disabled={value <= 0}
          onClick={() => onChange(value - 1)}
        >
          <Minus aria-hidden="true" />
        </button>
        <input
          id={`${testId}-repeat-input`}
          data-testid={`${testId}-repeat-input`}
          type="number"
          inputMode="numeric"
          min="0"
          max="5"
          step="1"
          value={value}
          onChange={event => {
            const parsed = Number.parseInt(event.target.value, 10);
            if (Number.isFinite(parsed)) onChange(parsed);
          }}
        />
        <button
          type="button"
          className="btn btn-ghost"
          data-testid={`${testId}-repeat-increase`}
          aria-label={`${label} +`}
          disabled={value >= 5}
          onClick={() => onChange(value + 1)}
        >
          <Plus aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default function ListeningMode({
  mode,
  deckIds,
  decks,
  globalLimit,
  uiLang,
  onBack,
  onPreferencesChanged,
}: ListeningModeProps) {
  const strings = LISTENING_STRINGS[uiLang];
  const [preferences, setPreferences] = useState<ListeningPreferencesV1>(
    () => readListeningPreferences(),
  );
  const preferencesRef = useRef(preferences);
  const propsRef = useRef({ deckIds, decks, globalLimit, onPreferencesChanged });
  const controllerRef = useRef<PlaybackController | null>(null);
  const engineRef = useRef<BrowserSpeechEngine | null>(null);
  const loadGenerationRef = useRef(0);
  const queueTriggerRef = useRef<HTMLButtonElement>(null);
  const audioTriggerRef = useRef<HTMLButtonElement>(null);
  const [snapshot, setSnapshot] = useState<PlaybackSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(true);

  useEffect(() => {
    propsRef.current = { deckIds, decks, globalLimit, onPreferencesChanged };
  }, [deckIds, decks, globalLimit, onPreferencesChanged]);

  const persistPreferences = useCallback((next: ListeningPreferencesV1) => {
    const normalized = saveListeningPreferences(next);
    preferencesRef.current = normalized;
    setPreferences(normalized);
    controllerRef.current?.setPreferences(normalized);
    propsRef.current.onPreferencesChanged();
    return normalized;
  }, []);

  const ensureSeed = useCallback((value: ListeningPreferencesV1) => {
    const context = [...new Set(propsRef.current.deckIds)].sort().join(',');
    const prefix = `${mode}:${value.source}:${context}:`;
    const current = value.shuffleSeedByMode[mode];
    if (current?.startsWith(prefix)) return value;
    return persistPreferences(normalizeListeningPreferences({
      ...value,
      shuffleSeedByMode: {
        ...value.shuffleSeedByMode,
        [mode]: createPlaylistSeed(mode, value.source, propsRef.current.deckIds),
      },
      updatedAt: new Date().toISOString(),
    }));
  }, [mode, persistPreferences]);

  const rebuildPlaylist = useCallback(async (
    controller: PlaybackController,
    inputPreferences: ListeningPreferencesV1,
    preferredCardId?: string,
  ) => {
    const generation = ++loadGenerationRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const nextPreferences = ensureSeed(inputPreferences);
      const selectedDecks = propsRef.current.deckIds
        .map(id => propsRef.current.decks.find(deck => deck.id === id))
        .filter((deck): deck is Deck => Boolean(deck));
      const deckCardSets = await Promise.all(selectedDecks.map(async deck => ({
        deck,
        cards: await DB.getCardsByDeck(deck.id),
      })));
      if (generation !== loadGenerationRef.current || controllerRef.current !== controller) return;
      const items = buildListeningPlaylist({
        source: nextPreferences.source,
        order: nextPreferences.order,
        deckCardSets,
        globalLimit: propsRef.current.globalLimit,
        today: getTodayStr(),
        seed: nextPreferences.shuffleSeedByMode[mode]!,
      });
      controller.setPlaylist(
        items,
        preferredCardId ?? nextPreferences.lastCardIdByMode[mode],
      );
    } catch (error) {
      if (generation !== loadGenerationRef.current) return;
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      if (generation === loadGenerationRef.current) setLoading(false);
    }
  }, [ensureSeed, mode]);

  useEffect(() => {
    const engine = new BrowserSpeechEngine();
    engineRef.current = engine;
    const controller = new PlaybackController(
      engine,
      undefined,
      preferencesRef.current,
    );
    controllerRef.current = controller;
    const unsubscribe = controller.subscribe(setSnapshot);
    const unsubscribeVoices = engine.subscribeVoices(setVoices);
    void engine.prepareVoices().then(nextVoices => {
      if (engineRef.current !== engine) return;
      setVoices(nextVoices);
      setVoicesLoading(false);
    });
    void rebuildPlaylist(controller, preferencesRef.current);

    return () => {
      loadGenerationRef.current += 1;
      unsubscribe();
      unsubscribeVoices();
      controller.dispose();
      if (controllerRef.current === controller) controllerRef.current = null;
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [rebuildPlaylist]);

  useEffect(() => {
    const cardId = snapshot.items[snapshot.cardIndex]?.card.id;
    if (!cardId || preferencesRef.current.lastCardIdByMode[mode] === cardId) return;
    persistPreferences(setLastListeningCard(preferencesRef.current, mode, cardId));
  }, [mode, persistPreferences, snapshot.cardIndex, snapshot.items]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const controller = controllerRef.current;
      if (!controller) return;
      const currentCardId = controller.getSnapshot().items[
        controller.getSnapshot().cardIndex
      ]?.card.id;
      void rebuildPlaylist(controller, preferencesRef.current, currentCardId)
        .then(() => controller.handleVisibilityReturn());
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [rebuildPlaylist]);

  const updatePreferences = (
    patch: Partial<ListeningPreferencesV1>,
    rebuild = false,
  ) => {
    let next = normalizeListeningPreferences({
      ...preferencesRef.current,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
    if (patch.source) {
      next = normalizeListeningPreferences({
        ...next,
        shuffleSeedByMode: {
          ...next.shuffleSeedByMode,
          [mode]: createPlaylistSeed(mode, next.source, deckIds),
        },
      });
    }
    next = persistPreferences(next);
    if (rebuild && controllerRef.current) {
      const current = snapshot.items[snapshot.cardIndex]?.card.id;
      void rebuildPlaylist(controllerRef.current, next, current);
    }
  };

  const refreshVoices = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setVoicesLoading(true);
    void engine.prepareVoices().then(nextVoices => {
      if (engineRef.current !== engine) return;
      setVoices(nextVoices);
      setVoicesLoading(false);
    });
  }, []);

  const current = snapshot.items[snapshot.cardIndex];
  const isPlaying = snapshot.status === 'playing' || snapshot.status === 'waiting';
  const currentLang = current?.ttsLang ?? 'en-US';
  const resolvedPreferred = findPreferredVoice(voices, preferences.preferredVoice);
  const preferredCompatible = resolvedPreferred
    ? isVoiceLanguageCompatible(resolvedPreferred.lang, currentLang)
    : false;
  const voiceSummary = preferences.preferredVoice?.name ?? strings.automaticVoice;
  const voiceFallback = preferences.preferredVoice && !preferredCompatible
    ? formatListeningString(strings.fallbackForLanguage, { language: currentLang })
    : null;
  const isPreviewing = snapshot.status === 'previewing';
  const statusText = (() => {
    if (isPreviewing) return strings.previewing;
    if (snapshot.previewError) {
      return formatListeningString(strings.previewError, { error: snapshot.previewError });
    }
    if (snapshot.status === 'completed') return strings.completed;
    if (snapshot.status === 'interrupted') return strings.interrupted;
    if (snapshot.status === 'error') return `${strings.playbackError}: ${snapshot.error ?? ''}`;
    if (!isPlaying) return strings.paused;
    const template = snapshot.phase === 'front' ? strings.frontStatus : strings.exampleStatus;
    return formatListeningString(template, {
      current: snapshot.repeatIndex,
      total: snapshot.repeatTotal,
    });
  })();

  return (
    <section className="listening-page" data-testid="listening-page">
      <div className="listening-content" data-testid="listening-content">
        <div className="listening-header">
          <button
            type="button"
            className="btn btn-ghost listening-back"
            data-testid="listening-back"
            onClick={onBack}
          >
            <ArrowLeft aria-hidden="true" />
            <span>{strings.back}</span>
          </button>
          <h1>{strings.title}</h1>
          <button
            ref={queueTriggerRef}
            type="button"
            className="btn btn-ghost listening-icon-button"
            data-testid="listening-queue-open"
            aria-label={strings.queue}
            title={strings.queue}
            onClick={() => setQueueOpen(true)}
          >
            <ListMusic aria-hidden="true" />
          </button>
        </div>

        <p className="listening-readonly-note">{strings.doesNotAffectProgress}</p>

        <div className="listening-options">
          <div className="listening-segmented" aria-label={strings.sourceToday}>
            <button
              type="button"
              data-testid="listening-source-today"
              aria-pressed={preferences.source === 'today'}
              onClick={() => updatePreferences({ source: 'today' }, true)}
            >
              {strings.sourceToday}
            </button>
            <button
              type="button"
              data-testid="listening-source-all"
              aria-pressed={preferences.source === 'all'}
              onClick={() => updatePreferences({ source: 'all' }, true)}
            >
              {strings.sourceAll}
            </button>
          </div>
          <div className="listening-segmented" aria-label={strings.orderSequential}>
            <button
              type="button"
              data-testid="listening-order-sequential"
              aria-pressed={preferences.order === 'sequential'}
              onClick={() => updatePreferences({ order: 'sequential' }, true)}
            >
              {strings.orderSequential}
            </button>
            <button
              type="button"
              data-testid="listening-order-shuffle"
              aria-pressed={preferences.order === 'shuffle'}
              onClick={() => updatePreferences({ order: 'shuffle' }, true)}
            >
              {strings.orderShuffle}
            </button>
          </div>
          <label className="listening-loop-label">
            <input
              type="checkbox"
              data-testid="listening-loop"
              checked={preferences.loopPlaylist}
              onChange={event => updatePreferences({ loopPlaylist: event.target.checked })}
            />
            <RotateCcw aria-hidden="true" />
            <span>{strings.loopPlaylist}</span>
          </label>
        </div>

        <button
          ref={audioTriggerRef}
          type="button"
          className="listening-audio-summary"
          data-testid="listening-audio-open"
          aria-haspopup="dialog"
          onClick={() => setAudioOpen(true)}
        >
          <Volume2 aria-hidden="true" />
          <span>
            <strong>{preferences.playbackRate}× · {voiceSummary}</strong>
            {voiceFallback && <small>{voiceFallback}</small>}
          </span>
        </button>

        <div className="listening-meta">
          <span>{current?.deck.name ?? ''}</span>
          <span>
            {formatListeningString(strings.cardProgress, {
              current: current ? snapshot.cardIndex + 1 : 0,
              total: snapshot.items.length,
            })}
          </span>
        </div>

        <div className="listening-card">
          {loading && <p>{strings.loading}</p>}
          {!loading && loadError && <p className="listening-error">{loadError}</p>}
          {!loading && !loadError && !current && (
            <div className="listening-empty">
              <p>{strings.empty}</p>
              {snapshot.playableCount === 0 && <small>{strings.enableOneRepeat}</small>}
            </div>
          )}
          {current && (
            <>
              <h2 className="listening-front" data-testid="listening-front">
                {current.card.front}
              </h2>
              <p className="listening-example" data-testid="listening-example">
                {current.card.example ?? '—'}
              </p>
              <p
                className="listening-status"
                data-testid="listening-status"
                aria-live="polite"
              >
                {statusText}
              </p>
            </>
          )}
        </div>

        <div className="listening-repeat-grid">
          <RepeatControl
            label={getFrontRepeatLabel(strings, mode)}
            value={preferences.frontRepeats}
            testId="front"
            onChange={frontRepeats => updatePreferences({ frontRepeats })}
          />
          <RepeatControl
            label={strings.exampleRepeats}
            value={preferences.exampleRepeats}
            testId="example"
            onChange={exampleRepeats => updatePreferences({ exampleRepeats })}
          />
        </div>

        <div className="listening-progress" data-testid="listening-progress">
          <span style={{
            width: snapshot.items.length > 0
              ? `${((snapshot.cardIndex + 1) / snapshot.items.length) * 100}%`
              : '0%',
          }} />
        </div>

        <p className="listening-platform-note">{strings.backgroundBestEffort}</p>

        {snapshot.status === 'error' && (
          <div className="listening-error-actions">
            <button type="button" className="btn btn-primary" onClick={() => controllerRef.current?.retry()}>
              {strings.retry}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => controllerRef.current?.skipCard()}>
              <SkipForward aria-hidden="true" /> {strings.skipCard}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onBack}>{strings.back}</button>
          </div>
        )}
      </div>

      <div className="listening-transport" data-testid="listening-transport">
        <div className="listening-transport__inner">
          <button
            type="button"
            className="btn btn-secondary"
            data-testid="listening-previous"
            aria-label={strings.previous}
            title={strings.previous}
            disabled={!current}
            onClick={() => controllerRef.current?.previous()}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-primary listening-play-button"
            data-testid={isPlaying ? 'listening-pause' : 'listening-play'}
            aria-label={isPlaying ? strings.pause : strings.play}
            title={isPlaying ? strings.pause : strings.play}
            disabled={!current || snapshot.playableCount === 0}
            onClick={() => {
              if (isPlaying) controllerRef.current?.pause();
              else controllerRef.current?.play();
            }}
          >
            {isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            data-testid="listening-next"
            aria-label={strings.next}
            title={strings.next}
            disabled={!current}
            onClick={() => controllerRef.current?.next()}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <ListeningQueueDrawer
        open={queueOpen}
        items={snapshot.items}
        currentIndex={snapshot.cardIndex}
        title={strings.queue}
        closeLabel={strings.closeQueue}
        triggerRef={queueTriggerRef}
        onSelect={index => controllerRef.current?.jumpTo(index)}
        onClose={() => setQueueOpen(false)}
      />

      <ListeningAudioDrawer
        open={audioOpen}
        strings={strings}
        voices={voices}
        voicesLoading={voicesLoading}
        requestLang={currentLang}
        rate={preferences.playbackRate}
        preferredVoice={preferences.preferredVoice}
        previewing={isPreviewing}
        previewError={snapshot.previewError}
        triggerRef={audioTriggerRef}
        onRateChange={playbackRate => updatePreferences({ playbackRate })}
        onVoiceChange={preferredVoice => updatePreferences({ preferredVoice })}
        onPreview={() => controllerRef.current?.previewCurrent({
          rate: preferencesRef.current.playbackRate,
          preferredVoice: preferencesRef.current.preferredVoice,
        })}
        onReset={() => updatePreferences({
          playbackRate: 0.85,
          preferredVoice: null,
        })}
        onRefreshVoices={refreshVoices}
        onClose={() => setAudioOpen(false)}
      />
    </section>
  );
}
