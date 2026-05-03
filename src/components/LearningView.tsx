import { useState, useEffect, useRef, useCallback } from 'react';
import type { Card } from '../lib/types';
import { updateSRS } from '../lib/srs';
import { DB, getTodayStr } from '../lib/db';
import { Volume2, Hash, Layers, Quote, Link2 } from 'lucide-react';

function formatTagsInText(text: string, front: string, morphology?: string, mode: 'full' | 'tagsOnly' = 'full') {
  if (!text) return text;

  let wordRegex: RegExp | null = null;
  if (mode === 'full') {
    const wordsToHighlight = [front];
    if (morphology) {
      const morphs = morphology.split(',').map(s => s.trim()).filter(Boolean);
      wordsToHighlight.push(...morphs);
    }
    wordsToHighlight.sort((a, b) => b.length - a.length);
    const escapedWords = wordsToHighlight.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    wordRegex = new RegExp(`(${escapedWords.join('|')})`, 'gi');
  }

  const parts = text.split(/(\((?:n|v|adj|adv|prep|conj|phr|phr|adj|adv|v|n)\.?\))/gi);

  return (
    <>
      {parts.map((part, i) => {
        if (part.match(/^\((?:n|v|adj|adv|prep|conj|phr)\.?\)$/i)) {
          const inner = part.replace(/[().]/g, '');
          return (
            <span key={i} className="mx-1 px-1.5 py-0.5 rounded-md text-[10px] md:text-xs font-black align-middle uppercase tracking-tighter"
              style={{
                background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
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

interface Props {
  queue: Card[];
  setQueue: React.Dispatch<React.SetStateAction<Card[]>>;
  seenIds: Set<string>;
  onFinish: () => void;
}

export default function LearningView({ queue, setQueue, seenIds, onFinish }: Props) {
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [totalInitial] = useState(queue.length);
  const [audioError, setAudioError] = useState(false);

  const isRatingRef = useRef(false);

  useEffect(() => {
    if (queue.length > 0 && !currentCard) setCurrentCard(queue[0]);
  }, [queue, currentCard]);

  const readText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    setAudioError(false);
    window.speechSynthesis.cancel();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const executeSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(isMobile ? text : ' ' + text);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural')) ||
        voices.find(v => v.lang.startsWith('en') && v.name.includes('Online')) ||
        voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
        voices.find(v => v.lang.startsWith('en'));
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.onerror = () => setAudioError(true);
      window.speechSynthesis.speak(utterance);
    };
    if (isMobile) { executeSpeak(); }
    else {
      const wakeUp = new SpeechSynthesisUtterance('');
      wakeUp.volume = 0;
      window.speechSynthesis.speak(wakeUp);
      setTimeout(executeSpeak, 500);
    }
  };

  useEffect(() => {
    if (currentCard && !showAnswer) readText(currentCard.front);
  }, [currentCard, showAnswer]);

  const handleRate = useCallback(async (ratingKey: 'again' | 'hard' | 'good' | 'easy', btnIndex: number) => {
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
    <div className="flex items-center justify-center h-64 text-muted text-sm">載入中…</div>
  );

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100dvh - 140px)' }}>

      {/* ── Progress Bar ── */}
      <div className="mb-4">
        <div className="flex justify-between text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>
          <span>剩餘 {queue.length} 張</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--secondary)' }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, var(--primary), var(--accent))`,
            }}
          />
        </div>
      </div>

      {/* ── Flashcard ── */}
      <div
        className="flex-1 card-container p-6 md:p-10 flex flex-col overflow-y-auto relative cursor-pointer"
        style={{ borderRadius: '1.5rem' }}
        onClick={() => !showAnswer && setShowAnswer(true)}
      >
        {/* Decorative background glow — only on front side */}
        {!showAnswer && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 60% 50% at 50% 60%, color-mix(in srgb, var(--primary) 7%, transparent), transparent)`,
              borderRadius: 'inherit',
            }}
          />
        )}
        {/* Top badges */}
        <div className="flex items-center justify-between mb-6">
          <span className="badge text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: 'var(--secondary)',
              color: 'var(--muted)',
            }}>
            {currentCard.state === 'graduated' ? 'Mastered' : 'Learning'}
          </span>

          {showAnswer && currentCard.contextType && (
            <span className="badge text-xs font-bold uppercase"
              style={{
                background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                color: 'var(--accent)',
                border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
              }}>
              {currentCard.contextType}
            </span>
          )}

          {audioError && (
            <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--danger)' }}>
              Audio Error
            </span>
          )}
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
              } as React.CSSProperties : {}}
            >
              {currentCard.front}
            </h1>
            <button
              className="flex-shrink-0 p-2 rounded-full transition-all hover:scale-110 active:scale-95"
              style={{ background: 'var(--secondary)' }}
              onClick={(e) => { e.stopPropagation(); readText(currentCard.front); }}
              title="播放發音"
            >
              <Volume2 className="w-5 h-5 md:w-6 h-6" style={{ color: 'var(--muted)' }} />
            </button>
          </div>

          {/* Answer Section */}
          {showAnswer && (
            <div className="mt-6 pt-6 border-t animate-answer-in" style={{ borderColor: 'var(--border)' }}>

              {/* POS + Phonetic */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {currentCard.partOfSpeech && currentCard.partOfSpeech.split(/\s+/).map((pos, idx) => (
                  <span key={idx} className="badge"
                    style={{
                      background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
                      color: 'var(--primary)',
                      border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}>
                    {pos.trim().replace('.', '')}
                  </span>
                ))}
                {currentCard.phonetic && (
                  <span className="font-mono text-base md:text-lg text-muted font-medium tracking-tight">
                    {currentCard.phonetic}
                  </span>
                )}
              </div>

              {/* Definition */}
              <div className="text-2xl md:text-4xl font-black leading-tight mb-8">
                {currentCard.definition}
              </div>

              {/* Inflections */}
              {currentCard.morphology && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-3 h-3 text-muted" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Inflections</span>
                  </div>
                  <div className="text-sm md:text-base font-semibold pl-4 border-l-2"
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)', opacity: 0.75 }}>
                    {currentCard.morphology}
                  </div>
                </div>
              )}

              {/* Example */}
              {currentCard.example && (
                <div className="mb-8 p-4 md:p-6 rounded-2xl relative"
                  style={{
                    background: 'var(--secondary)',
                    border: '1px solid var(--border)',
                  }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Quote className="w-3 h-3 text-muted" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Contextual Example</span>
                    <button
                      className="ml-auto p-1.5 rounded-lg transition-all hover:scale-105 active:scale-95"
                      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                      onClick={(e) => { e.stopPropagation(); readText(currentCard.example || ''); }}
                    >
                      <Volume2 className="w-3.5 h-3.5 md:w-4 h-4" style={{ color: 'var(--primary)' }} />
                    </button>
                  </div>
                  <div className="text-base md:text-lg leading-relaxed font-medium">
                    {formatTagsInText(currentCard.example || '', currentCard.front, currentCard.morphology)}
                  </div>
                </div>
              )}

              {/* Collocations + Derivatives */}
              {(currentCard.collocations || currentCard.derivatives) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentCard.collocations && (
                    <div className="p-4 rounded-xl" style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Layers className="w-3 h-3 text-muted" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Collocations</span>
                      </div>
                      <div className="text-sm md:text-base font-semibold leading-relaxed" style={{ opacity: 0.8 }}>
                        {formatTagsInText(currentCard.collocations, currentCard.front, currentCard.morphology, 'tagsOnly')}
                      </div>
                    </div>
                  )}
                  {currentCard.derivatives && (
                    <div className="p-4 rounded-xl" style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Link2 className="w-3 h-3 text-muted" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Derivatives</span>
                      </div>
                      <div className="text-sm md:text-base font-semibold leading-relaxed" style={{ opacity: 0.8 }}>
                        {formatTagsInText(currentCard.derivatives, currentCard.front, currentCard.morphology, 'tagsOnly')}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hint */}
        {!showAnswer && (
          <div className="text-center mt-6 text-xs font-semibold uppercase tracking-widest text-muted/50 select-none">
            點擊或按空白鍵翻牌
          </div>
        )}
      </div>

      {/* ── Rating Buttons ── */}
      {showAnswer ? (
        <div className="grid grid-cols-4 gap-2 md:gap-3 mt-3 md:mt-4">
          {/* Again */}
          <button
            className="rating-btn"
            style={{
              borderColor: 'var(--danger)',
              color: 'var(--danger)',
              background: 'color-mix(in srgb, var(--danger) 10%, var(--card))',
              boxShadow: 'inset 0 1px 0 color-mix(in srgb, white 8%, transparent)',
            }}
            onClick={() => handleRate('again', 1)}
          >
            <span className="text-xs md:text-sm font-black uppercase tracking-wide">Again</span>
            <span className="text-[9px] md:text-[10px] font-bold opacity-40 hidden md:block">⌨ 1</span>
          </button>

          {/* Hard */}
          <button
            className="rating-btn"
            style={{
              borderColor: 'var(--warning)',
              color: 'var(--warning)',
              background: 'color-mix(in srgb, var(--warning) 10%, var(--card))',
              boxShadow: 'inset 0 1px 0 color-mix(in srgb, white 8%, transparent)',
            }}
            onClick={() => handleRate('hard', 2)}
          >
            <span className="text-xs md:text-sm font-black uppercase tracking-wide">Hard</span>
            <span className="text-[9px] md:text-[10px] font-bold opacity-40 hidden md:block">⌨ 2</span>
          </button>

          {/* Good */}
          <button
            className="rating-btn"
            style={{
              borderColor: 'var(--success)',
              color: 'var(--success)',
              background: 'color-mix(in srgb, var(--success) 10%, var(--card))',
              boxShadow: 'inset 0 1px 0 color-mix(in srgb, white 8%, transparent)',
            }}
            onClick={() => handleRate('good', 3)}
          >
            <span className="text-xs md:text-sm font-black uppercase tracking-wide">Good</span>
            <span className="text-[9px] md:text-[10px] font-bold opacity-40 hidden md:block">⌨ 3</span>
          </button>

          {/* Easy */}
          <button
            className="rating-btn"
            style={{
              borderColor: 'var(--primary)',
              color: 'var(--primary)',
              background: 'color-mix(in srgb, var(--primary) 10%, var(--card))',
              boxShadow: 'inset 0 1px 0 color-mix(in srgb, white 8%, transparent)',
            }}
            onClick={() => handleRate('easy', 4)}
          >
            <span className="text-xs md:text-sm font-black uppercase tracking-wide">Easy</span>
            <span className="text-[9px] md:text-[10px] font-bold opacity-40 hidden md:block">⌨ 4</span>
          </button>
        </div>
      ) : (
        /* Placeholder height to prevent layout shift */
        <div className="mt-3 md:mt-4" style={{ minHeight: '60px' }} />
      )}
    </div>
  );
}
