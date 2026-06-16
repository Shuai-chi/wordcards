import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import type { Card } from '../lib/types';
import type { UIStrings, SupportedLang } from '../lib/languages';
import { LANG_CONFIGS, detectSecondaryLang } from '../lib/languages';
import { updateSRS } from '../lib/srs';
import { DB, getTodayStr } from '../lib/db';
import { Volume2, Hash, Layers, Quote, Link2 } from 'lucide-react';
import type { Deck } from '../lib/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTagsInText(
  text: string,
  front: string,
  inflections?: string,
  mode: 'full' | 'tagsOnly' = 'full'
) {
  if (!text) return text;

  let wordRegex: RegExp | null = null;
  if (mode === 'full') {
    const wordsToHighlight = [front];
    if (inflections) {
      const morphs = inflections.split(',').map(s => s.trim()).filter(Boolean);
      wordsToHighlight.push(...morphs);
    }
    wordsToHighlight.sort((a, b) => b.length - a.length);
    const escapedWords = wordsToHighlight.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    wordRegex = new RegExp(`(${escapedWords.join('|')})`, 'gi');
  }

  const parts = text.split(/(\((?:n|v|adj|adv|prep|conj|phr|adj|adv|v|n)\.?\))/gi);

  return (
    <>
      {parts.map((part, i) => {
        if (part.match(/^\((?:n|v|adj|adv|prep|conj|phr)\.?\)$/i)) {
          const inner = part.replace(/[().]/g, '');
          return (
            <span key={i}
              className="mx-1 px-1.5 py-0.5 rounded-md text-[10px] md:text-xs font-black align-middle uppercase tracking-tight"
              style={{
                background: 'color-mix(in srgb, var(--accent) 20%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent) 45%, transparent)',
                color: 'var(--accent)',
              }}>
              {inner}
            </span>
          );
        }
        if (mode === 'tagsOnly' || !wordRegex) return <span key={i}>{part}</span>;
        const subParts = part.split(wordRegex);
        return (
          <span key={i}>
            {subParts.map((sub, j) => {
              if (wordRegex && wordRegex.test(sub)) {
                return (
                  <mark key={j} className="bg-transparent font-bold px-0.5"
                    style={{
                      borderBottom: '2px solid color-mix(in srgb, var(--primary) 40%, transparent)',
                      color: 'var(--primary)',
                    }}>
                    {sub}
                  </mark>
                );
              }
              return sub;
            })}
          </span>
        );
      })}
    </>
  );
}

// Resolve TTS language from deck's language config
function getTTSLang(deckLang?: string): string {
  if (!deckLang) return 'en-US';
  const cfg = LANG_CONFIGS[deckLang as SupportedLang];
  return cfg?.ttsLang ?? 'en-US';
}

// ── TTS ──────────────────────────────────────────────────────────────────────

function useTTS() {
  const [audioError, setAudioError] = useState(false);

  const speak = useCallback((text: string, lang: string) => {
    if (!('speechSynthesis' in window)) return;
    setAudioError(false);
    window.speechSynthesis.cancel();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    const executeSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(isMobile ? text : ' ' + text);
      const voices = window.speechSynthesis.getVoices();

      // Try to find a voice matching the target language
      const preferredVoice =
        voices.find(v => v.lang === lang && v.name.includes('Natural')) ||
        voices.find(v => v.lang === lang && v.name.includes('Online')) ||
        voices.find(v => v.lang === lang && v.name.includes('Google')) ||
        voices.find(v => v.lang.startsWith(lang.split('-')[0])) ||
        voices.find(v => v.lang.startsWith('en'));

      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.lang = lang;
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.onerror = () => setAudioError(true);
      window.speechSynthesis.speak(utterance);
    };

    if (isMobile) {
      executeSpeak();
    } else {
      const wakeUp = new SpeechSynthesisUtterance('');
      wakeUp.volume = 0;
      window.speechSynthesis.speak(wakeUp);
      setTimeout(executeSpeak, 500);
    }
  }, []);

  return { speak, audioError };
}

function PhoneticBadge({ ipa }: { ipa?: string }) {
  if (!ipa) return null;
  // IPA 音標必須用 tracking-normal (甚至 tracking-wide), 否則 ɪ ɛ æ ʊ ə 等窄字符會貼成糊團.
  return (
    <span className="font-mono text-xs md:text-sm font-bold px-2 py-0.5 rounded-lg align-middle"
      style={{
        background: 'color-mix(in srgb, var(--primary) 20%, transparent)',
        border: '1px solid color-mix(in srgb, var(--primary) 45%, transparent)',
        color: 'var(--primary)',
        letterSpacing: '0.02em',
      }}>
      {ipa}
    </span>
  );
}

// ── Language-specific card fields renderer ───────────────────────────────────

interface CardFieldsProps {
  card: Card;
  deckLang: string;
  uiLang: string;
  defLangPref: 'deck' | 'user' | 'bilingual';
}

function CardAnswerFields({ card, deckLang, uiLang, defLangPref }: CardFieldsProps) {
  const lang = (deckLang || 'en') as SupportedLang;

  // Japanese fields
  if (lang === 'ja') {
    return (
      <div className="space-y-6 animate-answer-in">
        {/* Kana + Kanji + Romaji */}
        <div className="flex flex-wrap items-center gap-3">
          <PhoneticBadge ipa={card.ipa} />
          {card.kanji && (
            <span className="text-xl md:text-2xl font-bold" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              {card.kanji}
            </span>
          )}
          {card.romaji && (
            <span className="font-mono text-sm" style={{ color: 'var(--muted)' }}>
              [{card.romaji}]
            </span>
          )}
        </div>
        <POSBadges card={card} />
        <DefinitionBlock card={card} deckLang={deckLang} uiLang={uiLang} defLangPref={defLangPref} />
        {card.inflections && <ConjugationBlock card={card} label="活用形" />}
        {card.example && <ExampleBlock card={card} deckLang={deckLang} />}
      </div>
    );
  }

  // Korean fields
  if (lang === 'ko') {
    return (
      <div className="space-y-6 animate-answer-in">
        <div className="flex flex-wrap items-center gap-3">
          <PhoneticBadge ipa={card.ipa} />
          {card.hanja && (
            <span className="text-xl font-bold" style={{ color: 'var(--foreground)', opacity: 0.65 }}>
              {card.hanja}
            </span>
          )}
          {card.romaji && (
            <span className="font-mono text-sm" style={{ color: 'var(--muted)' }}>
              [{card.romaji}]
            </span>
          )}
        </div>
        <POSBadges card={card} />
        <DefinitionBlock card={card} deckLang={deckLang} uiLang={uiLang} defLangPref={defLangPref} />
        {card.inflections && <ConjugationBlock card={card} label="활용" />}
        {card.example && <ExampleBlock card={card} deckLang={deckLang} />}
      </div>
    );
  }

  // German fields
  if (lang === 'de') {
    return (
      <div className="space-y-6 animate-answer-in">
        <div className="flex flex-wrap items-center gap-3">
          <POSBadges card={card} />
          {card.gender && (
            <span className="badge font-bold"
              style={{
                background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                color: 'var(--accent)',
                border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)',
              }}>
              {card.gender}
            </span>
          )}
          <PhoneticBadge ipa={card.ipa} />
        </div>
        <DefinitionBlock card={card} deckLang={deckLang} uiLang={uiLang} defLangPref={defLangPref} />
        {card.inflections && <ConjugationBlock card={card} label="Deklination" />}
        {card.derivatives && <DerivativesBlock card={card} />}
        {card.example && <ExampleBlock card={card} deckLang={deckLang} />}
      </div>
    );
  }

  // Spanish / French fields
  if (lang === 'es' || lang === 'fr') {
    return (
      <div className="space-y-6 animate-answer-in">
        <div className="flex flex-wrap items-center gap-3">
          <POSBadges card={card} />
          {card.gender && (
            <span className="badge font-bold"
              style={{
                background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                color: 'var(--accent)',
                border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)',
              }}>
              {card.gender}
            </span>
          )}
          <PhoneticBadge ipa={card.ipa} />
        </div>
        <DefinitionBlock card={card} deckLang={deckLang} uiLang={uiLang} defLangPref={defLangPref} />
        {card.inflections && <ConjugationBlock card={card} label={lang === 'fr' ? 'Conjugaison' : 'Conjugación'} />}
        {card.derivatives && <DerivativesBlock card={card} />}
        {card.example && <ExampleBlock card={card} deckLang={deckLang} />}
      </div>
    );
  }

  // Thai fields
  if (lang === 'th') {
    return (
      <div className="space-y-6 animate-answer-in">
        <div className="flex flex-wrap items-center gap-3">
          <PhoneticBadge ipa={card.ipa} />
          {card.romaji && (
            <span className="font-mono text-sm" style={{ color: 'var(--muted)' }}>
              [{card.romaji}]
            </span>
          )}
          {card.tone && (
            <span className="badge"
              style={{
                background: 'color-mix(in srgb, var(--warning) 10%, transparent)',
                color: 'var(--warning)',
                border: '1px solid color-mix(in srgb, var(--warning) 18%, transparent)',
              }}>
              {card.tone}
            </span>
          )}
        </div>
        <POSBadges card={card} />
        <DefinitionBlock card={card} deckLang={deckLang} uiLang={uiLang} defLangPref={defLangPref} />
        {card.example && <ExampleBlock card={card} deckLang={deckLang} />}
        {card.collocations && <CollocationsBlock card={card} />}
      </div>
    );
  }

  // English (default)
  return (
    <div className="space-y-6 animate-answer-in">
      {/* POS + Phonetic */}
      <div className="flex flex-wrap items-center gap-2">
        <POSBadges card={card} />
        <PhoneticBadge ipa={card.ipa} />
      </div>

      <DefinitionBlock card={card} deckLang={deckLang} uiLang={uiLang} defLangPref={defLangPref} />

      {card.inflections && (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Hash className="w-3 h-3" style={{ color: 'var(--muted)' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Inflections
            </span>
          </div>
          <div className="text-sm md:text-base font-semibold pl-4 border-l-2"
            style={{ borderColor: 'var(--border)', opacity: 0.75 }}>
            {card.inflections}
          </div>
        </div>
      )}

      {card.example && <ExampleBlock card={card} deckLang={deckLang} />}

      {(card.collocations || card.derivatives) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {card.collocations && <CollocationsBlock card={card} />}
          {card.derivatives && <DerivativesBlock card={card} />}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function POSBadges({ card }: { card: Card }) {
  if (!card.pos) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {card.pos.split(/\s+/).map((pos, idx) => (
        <span key={idx}
          className="mx-0.5 px-1.5 py-0.5 rounded-md text-[10px] md:text-[11px] font-black align-middle uppercase tracking-tight"
          style={{
            background: 'color-mix(in srgb, var(--accent) 20%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent) 45%, transparent)',
            color: 'var(--accent)',
          }}>
          {pos.trim().replace('.', '')}
        </span>
      ))}
    </div>
  );
}

type DefDisplayMode = 'primary' | 'secondary' | 'bilingual';

interface DefinitionBlockProps {
  card: Card;
  deckLang: string;
  uiLang: string;
  defLangPref: 'deck' | 'user' | 'bilingual';
}

function DefinitionBlock({ card, deckLang, uiLang, defLangPref }: DefinitionBlockProps) {
  const [displayMode, setDisplayMode] = useState<DefDisplayMode>('primary');

  const SEP = '｜';
  const idx = card.definition?.lastIndexOf(SEP) ?? -1;

  // Fallback parse: if definitionLang is missing but definition contains SEP
  let secondaryLang: string | undefined = card.definitionLang;
  if (!secondaryLang && idx !== -1 && card.definition) {
    const after = card.definition.slice(idx + SEP.length).trim();
    if (after) {
      secondaryLang = detectSecondaryLang(after) ?? undefined;
    }
  }

  const isBilingual = secondaryLang !== undefined;

  // Determine initial display mode based on defLangPref (Settings) and card's bilingual state:
  // - 'deck': always start at primary (deck language)
  // - 'user': if uiLang matches secondaryLang → secondary; otherwise → bilingual
  // - 'bilingual': always start at bilingual (show both)
  useLayoutEffect(() => {
    let mode: DefDisplayMode = 'primary';
    if (isBilingual) {
      if (defLangPref === 'deck') {
        mode = 'primary';
      } else if (defLangPref === 'bilingual') {
        mode = 'bilingual';
      } else {
        // 'user' mode
        mode = (uiLang === secondaryLang) ? 'secondary' : 'bilingual';
      }
    }
    setDisplayMode(mode);
  }, [uiLang, secondaryLang, isBilingual, defLangPref]);

  if (!card.definition) return null;

  // Three button labels
  // deck mode: use deckLang directly (e.g. 'en', 'ja')
  const labelDeck = deckLang;
  // user mode: extract region code from uiLang (e.g. 'zh-TW' → 'TW', 'en' stays 'en')
  const labelUser = uiLang.length > 2 ? uiLang.split('-')[1] ?? uiLang : uiLang;
  const labelBilingual = 'all';

  if (!isBilingual) {
    return (
      <div className="text-2xl md:text-3xl font-black leading-tight" style={{ letterSpacing: '-0.02em' }}>
        {card.definition}
      </div>
    );
  }

  // Parse the two halves
  const before = card.definition.slice(0, idx).trim();
  const after = card.definition.slice(idx + SEP.length).trim();

  const renderContent = () => {
    if (displayMode === 'primary') {
      return <span>{before}</span>;
    }
    if (displayMode === 'secondary') {
      return <span>{after}</span>;
    }
    // bilingual
    return (
      <>
        <span>{before}</span>
        <span className="mx-2 opacity-40">｜</span>
        <span>{after}</span>
      </>
    );
  };

  return (
    <div className="space-y-3">
      <div className="text-2xl md:text-3xl font-black leading-tight" style={{ letterSpacing: '-0.02em' }}>
        {renderContent()}
      </div>
      {/* Language toggle buttons — hidden when global preference is bilingual */}
      {defLangPref !== 'bilingual' && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setDisplayMode('primary')}
            className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
            style={{
              background: displayMode === 'primary' ? 'var(--primary)' : 'var(--card)',
              color: displayMode === 'primary' ? 'var(--primary-foreground)' : 'var(--foreground)',
              border: '1px solid var(--border)',
            }}
          >
            {labelDeck}
          </button>
          <button
            onClick={() => setDisplayMode('secondary')}
            className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
            style={{
              background: displayMode === 'secondary' ? 'var(--primary)' : 'var(--card)',
              color: displayMode === 'secondary' ? 'var(--primary-foreground)' : 'var(--foreground)',
              border: '1px solid var(--border)',
            }}
          >
            {labelUser}
          </button>
          <button
            onClick={() => setDisplayMode('bilingual')}
            className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
            style={{
              background: displayMode === 'bilingual' ? 'var(--primary)' : 'var(--card)',
              color: displayMode === 'bilingual' ? 'var(--primary-foreground)' : 'var(--foreground)',
              border: '1px solid var(--border)',
            }}
          >
            {labelBilingual}
          </button>
        </div>
      )}
    </div>
  );
}

function ConjugationBlock({ card, label }: { card: Card; label: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <Hash className="w-3 h-3" style={{ color: 'var(--muted)' }} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          {label}
        </span>
      </div>
      <div className="text-sm md:text-base font-semibold pl-4 border-l-2"
        style={{ borderColor: 'var(--border)', opacity: 0.75 }}>
        {card.inflections}
      </div>
    </div>
  );
}

function ExampleBlock({ card, deckLang }: { card: Card; deckLang: string }) {
  const { speak } = useTTS();
  const ttsLang = getTTSLang(deckLang);
  if (!card.example) return null;
  return (
    <div className="p-4 md:p-5 rounded-2xl relative"
      style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Quote className="w-3 h-3" style={{ color: 'var(--muted)' }} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          Example
        </span>
        <button
          className="ml-auto p-1.5 rounded-lg transition-all hover:scale-105 active:scale-95"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          onClick={e => { e.stopPropagation(); speak(card.example || '', ttsLang); }}
        >
          <Volume2 className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
        </button>
      </div>
      <div className="text-base md:text-lg leading-relaxed font-medium">
        {deckLang === 'en'
          ? formatTagsInText(card.example, card.front, card.inflections)
          : card.example}
      </div>
    </div>
  );
}

function CollocationsBlock({ card }: { card: Card }) {
  if (!card.collocations) return null;
  return (
    <div className="p-4 rounded-xl" style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-3 h-3" style={{ color: 'var(--muted)' }} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          Collocations
        </span>
      </div>
      <div className="text-sm md:text-base font-semibold leading-relaxed" style={{ opacity: 0.8 }}>
        {formatTagsInText(card.collocations, card.front, card.inflections, 'tagsOnly')}
      </div>
    </div>
  );
}

function DerivativesBlock({ card }: { card: Card }) {
  if (!card.derivatives) return null;
  return (
    <div className="p-4 rounded-xl" style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="w-3 h-3" style={{ color: 'var(--muted)' }} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          Derivatives
        </span>
      </div>
      <div className="text-sm md:text-base font-semibold leading-relaxed" style={{ opacity: 0.8 }}>
        {formatTagsInText(card.derivatives, card.front, card.inflections, 'tagsOnly')}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  queue: Card[];
  setQueue: React.Dispatch<React.SetStateAction<Card[]>>;
  seenIds: Set<string>;
  strings: UIStrings;
  decks: Deck[];
  onFinish: () => void;
  uiLang: string;
  defLangPref: 'deck' | 'user' | 'bilingual';
}

export default function LearningView({ queue, setQueue, seenIds, strings, decks, onFinish, uiLang, defLangPref }: Props) {
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [totalInitial] = useState(queue.length);
  const { speak, audioError } = useTTS();
  const isRatingRef = useRef(false);

  // Resolve deck language for current card
  const deckLang = currentCard
    ? (decks.find(d => d.id === currentCard.deckId)?.language ?? 'en')
    : 'en';
  const ttsLang = getTTSLang(deckLang);
  const langCfg = LANG_CONFIGS[deckLang as SupportedLang];

  useEffect(() => {
    if (queue.length > 0 && !currentCard) setCurrentCard(queue[0]);
  }, [queue, currentCard]);

  useEffect(() => {
    if (currentCard && !showAnswer) speak(currentCard.front, ttsLang);
  }, [currentCard, showAnswer]);

  const handleRate = useCallback(async (
    ratingKey: 'again' | 'hard' | 'good' | 'easy',
    btnIndex: number
  ) => {
    if (!currentCard || !showAnswer || isRatingRef.current) return;
    isRatingRef.current = true;

    const [, ...rest] = queue;
    const isFirstTouchToday = currentCard.lastReviewedDate !== getTodayStr();
    const previousRating = currentCard.todayRating;

    seenIds.add(currentCard.id);
    const updatedCard = updateSRS(currentCard, btnIndex);
    updatedCard.todayRating = ratingKey;

    const newQueue = [...rest];
    if (updatedCard.interval === 0) {
      const insertPos = Math.min(newQueue.length, Math.floor(Math.random() * 3) + 1);
      newQueue.splice(insertPos, 0, updatedCard);
    }

    setQueue(newQueue);
    setShowAnswer(false);
    setCurrentCard(null);
    window.speechSynthesis.cancel();

    await DB.commitReview(updatedCard, getTodayStr(), ratingKey, isFirstTouchToday, previousRating);
    isRatingRef.current = false;

    if (newQueue.length === 0) onFinish();
  }, [currentCard, showAnswer, queue, seenIds, onFinish, setQueue]);

  const handleRateRef = useRef(handleRate);
  useEffect(() => { handleRateRef.current = handleRate; }, [handleRate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (!currentCard) return;
      if (!showAnswer) {
        if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); setShowAnswer(true); }
      } else {
        if (e.key === '1') handleRateRef.current('again', 1);
        if (e.key === '2') handleRateRef.current('hard', 2);
        if (e.key === '3') handleRateRef.current('good', 3);
        if (e.key === '4') handleRateRef.current('easy', 4);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, currentCard]);

  const progress = queue.length > 0 ? ((totalInitial - queue.length) / totalInitial) * 100 : 100;

  if (!currentCard) return (
    <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--muted)' }}>
      載入中…
    </div>
  );

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100dvh - 140px)' }}>

      {/* ── Progress ── */}
      <div className="mb-4">
        <div className="flex justify-between text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>
          <span>{strings.remaining} {queue.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="progress-track" style={{ height: '6px' }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* ── Flashcard ── */}
      <div
        className="flex-1 card-container p-6 md:p-10 flex flex-col overflow-y-auto relative cursor-pointer"
        style={{ borderRadius: '1.5rem' }}
        onClick={() => !showAnswer && setShowAnswer(true)}
      >
        {/* Glow — front only */}
        {!showAnswer && (
          <div className="absolute inset-0 pointer-events-none" style={{
            background: `radial-gradient(ellipse 60% 50% at 50% 60%, color-mix(in srgb, var(--primary) 5%, transparent), transparent)`,
            borderRadius: 'inherit',
          }} />
        )}

        {/* Top badges */}
        <div className="flex items-center justify-between mb-6">
          <span className="badge text-[10px] font-bold uppercase tracking-wider"
            style={{ background: 'var(--secondary)', color: 'var(--muted)' }}>
            {currentCard.state === 'graduated' ? strings.mastered : strings.learning}
          </span>

          <div className="flex items-center gap-2">
            {langCfg && (
              <span className="text-sm" title={langCfg.nameEn}>{langCfg.flag}</span>
            )}
            {showAnswer && currentCard.context_type && (
              <span className="badge text-xs font-bold uppercase"
                style={{
                  background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                  color: 'var(--accent)',
                  border: '1px solid color-mix(in srgb, var(--accent) 16%, transparent)',
                }}>
                {currentCard.context_type}
              </span>
            )}
            {audioError && (
              <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--danger)' }}>
                Audio Error
              </span>
            )}
          </div>
        </div>

        {/* Word + Audio */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1
              className="text-4xl md:text-6xl font-black tracking-tight text-center break-all"
              style={!showAnswer ? {
                background: `linear-gradient(135deg, var(--foreground) 30%, var(--primary) 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              } as React.CSSProperties : { letterSpacing: '-0.02em' }}
            >
              {currentCard.front}
            </h1>
            <button
              className="flex-shrink-0 p-2 rounded-full transition-all hover:scale-110 active:scale-95"
              style={{ background: 'var(--secondary)' }}
              onClick={e => { e.stopPropagation(); speak(currentCard.front, ttsLang); }}
              title="播放發音"
            >
              <Volume2 className="w-5 h-5 md:w-6 md:h-6" style={{ color: 'var(--muted)' }} />
            </button>
          </div>

          {/* Answer */}
          {showAnswer && (
            <div className="mt-8 pt-8 border-t flex flex-col gap-6 px-4 md:px-8" style={{ borderColor: 'var(--border)' }}>
              <CardAnswerFields card={currentCard} deckLang={deckLang} uiLang={uiLang} defLangPref={defLangPref} />
            </div>
          )}
        </div>

        {/* Hint */}
        {!showAnswer && (
          <div className="text-center mt-6 text-xs font-semibold uppercase tracking-widest select-none"
            style={{ color: 'var(--muted)', opacity: 0.5 }}>
            {strings.tapToFlip}
          </div>
        )}
      </div>

      {/* ── Rating Buttons ── */}
      {showAnswer ? (
        <div className="grid grid-cols-4 gap-2 md:gap-3 mt-3 md:mt-4">
          <button className="rating-btn"
            style={{
              borderColor: 'var(--danger)',
              color: 'var(--danger)',
              background: 'color-mix(in srgb, var(--danger) 8%, var(--card))',
            }}
            onClick={() => handleRate('again', 1)}
          >
            <span className="text-xs md:text-sm font-black uppercase tracking-wide">{strings.again}</span>
            <span className="text-[9px] md:text-[10px] font-bold opacity-40 hidden md:block">⌨ 1</span>
          </button>

          <button className="rating-btn"
            style={{
              borderColor: 'var(--warning)',
              color: 'var(--warning)',
              background: 'color-mix(in srgb, var(--warning) 8%, var(--card))',
            }}
            onClick={() => handleRate('hard', 2)}
          >
            <span className="text-xs md:text-sm font-black uppercase tracking-wide">{strings.hard}</span>
            <span className="text-[9px] md:text-[10px] font-bold opacity-40 hidden md:block">⌨ 2</span>
          </button>

          <button className="rating-btn"
            style={{
              borderColor: 'var(--success)',
              color: 'var(--success)',
              background: 'color-mix(in srgb, var(--success) 8%, var(--card))',
            }}
            onClick={() => handleRate('good', 3)}
          >
            <span className="text-xs md:text-sm font-black uppercase tracking-wide">{strings.good}</span>
            <span className="text-[9px] md:text-[10px] font-bold opacity-40 hidden md:block">⌨ 3</span>
          </button>

          <button className="rating-btn"
            style={{
              borderColor: 'var(--primary)',
              color: 'var(--primary)',
              background: 'color-mix(in srgb, var(--primary) 8%, var(--card))',
            }}
            onClick={() => handleRate('easy', 4)}
          >
            <span className="text-xs md:text-sm font-black uppercase tracking-wide">{strings.easy}</span>
            <span className="text-[9px] md:text-[10px] font-bold opacity-40 hidden md:block">⌨ 4</span>
          </button>
        </div>
      ) : (
        <div className="mt-3 md:mt-4" style={{ minHeight: '60px' }} />
      )}
    </div>
  );
}
