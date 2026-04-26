import { useState, useEffect, useRef, useCallback } from 'react';
import type { Card } from '../lib/types';
import { updateSRS } from '../lib/srs';
import { DB, getTodayStr } from '../lib/db';
import { Volume2, Hash, Layers, Quote, Link2 } from 'lucide-react';

function formatTagsInText(text: string, front: string, morphology?: string, mode: 'full' | 'tagsOnly' = 'full') {
  if (!text) return text;
  
  // 1. Prepare word highlighting only if mode is 'full'
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

  // 2. Identify POS tags - Flexible Regex to catch (n), (n.), (v), (v.), etc.
  const parts = text.split(/(\((?:n|v|adj|adv|prep|conj|phr|phr|adj|adv|v|n)\.?\))/gi);
  
  return (
    <>
      {parts.map((part, i) => {
        // Match (pos) or (pos.)
        if (part.match(/^\((?:n|v|adj|adv|prep|conj|phr)\.?\)$/i)) {
          const inner = part.replace(/[().]/g, ''); // Remove parens and dot for cleaner display
          return (
            <span key={i} className="mx-1 px-1.5 py-0.5 rounded-md bg-purple-100/80 border border-purple-200 text-[10px] md:text-xs font-black text-purple-700 align-middle uppercase tracking-tighter">
              {inner}
            </span>
          );
        }
        
        if (mode === 'tagsOnly' || !wordRegex) {
          return <span key={i}>{part}</span>;
        }

        const subParts = part.split(wordRegex);
        return (
          <span key={i}>
            {subParts.map((sub, j) => {
              if (wordRegex && wordRegex.test(sub)) {
                return (
                  <mark key={j} className="bg-transparent border-b-2 border-primary/30 text-primary font-bold px-0.5">
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
    if (queue.length > 0 && !currentCard) {
      setCurrentCard(queue[0]);
    }
  }, [queue, currentCard]);

  // Audio Reading System v11.0 (Natural-Flow)
  const readText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    setAudioError(false);
    window.speechSynthesis.cancel();
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    const executeSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(isMobile ? text : " " + text);
      const voices = window.speechSynthesis.getVoices();
      
      // High-quality voice ranking
      const preferredVoice = 
        voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural')) ||
        voices.find(v => v.lang.startsWith('en') && v.name.includes('Online')) ||
        voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
        voices.find(v => v.lang.startsWith('en'));
      
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.lang = 'en-US';
      utterance.rate = 0.85; // Optimized for natural cadence
      utterance.pitch = 1.0;
      utterance.onerror = () => setAudioError(true);
      window.speechSynthesis.speak(utterance);
    };

    if (isMobile) {
      executeSpeak();
    } else {
      // Wake up hardware with silent beat
      const wakeUp = new SpeechSynthesisUtterance("");
      wakeUp.volume = 0;
      window.speechSynthesis.speak(wakeUp);
      setTimeout(executeSpeak, 500); 
    }
  };

  useEffect(() => {
    if (currentCard && !showAnswer) {
      readText(currentCard.front);
    }
  }, [currentCard, showAnswer]);

  const handleRate = useCallback(async (ratingKey: 'again'|'hard'|'good'|'easy', btnIndex: number) => {
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
    
    if (newQueue.length === 0) {
      onFinish();
    }
  }, [currentCard, showAnswer, queue, seenIds, onFinish, setQueue]);

  const handleRateRef = useRef(handleRate);
  useEffect(() => { handleRateRef.current = handleRate; }, [handleRate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (!currentCard) return;
      
      if (!showAnswer) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          setShowAnswer(true);
        }
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

  if (!currentCard) return <div className="p-8 text-center text-muted">載入中...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-180px)]">
      <div className="mb-4 px-2">
        <div className="flex justify-between text-[10px] text-muted-foreground/60 font-bold tracking-widest mb-2 uppercase">
          <span>Remaining: {queue.length}</span>
          <span>Progress: {Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-secondary/50 h-1 rounded-full overflow-hidden">
          <div className="bg-primary h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div 
        className="flex-1 bg-card border border-border/60 shadow-lg rounded-3xl p-6 md:p-12 flex flex-col overflow-y-auto relative"
        onClick={() => !showAnswer && setShowAnswer(true)}
      >
        {audioError && <div className="absolute top-4 right-6 text-[10px] text-danger font-bold uppercase">Audio Error</div>}
        <div className="absolute top-4 left-6">
          {!showAnswer ? (
             <span className="bg-secondary/60 text-muted-foreground text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border border-border/20">
              {currentCard.state === 'graduated' ? 'Mastered' : 'Learning'}
            </span>
          ) : (
            currentCard.contextType && (
              <span className="bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs md:text-sm px-3 py-1 rounded-lg font-bold uppercase tracking-widest shadow-sm">
                {currentCard.contextType}
              </span>
            )
          )}
        </div>
        
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <h1 className="text-3xl md:text-6xl font-black mb-4 flex items-center justify-center tracking-tight text-card-foreground break-all">
            {currentCard.front}
            <button 
              className="ml-4 p-2 rounded-full hover:bg-secondary transition-all hover:scale-110 active:scale-95"
              onClick={(e) => { e.stopPropagation(); readText(currentCard.front); }}
            >
              <Volume2 className="w-7 h-7 md:w-9 h-9 text-muted-foreground/60 hover:text-primary transition-colors" />
            </button>
          </h1>
          
          {showAnswer && (
            <div className="w-full max-w-2xl mt-4 md:mt-8 pt-6 md:pt-8 border-t border-border/40 text-left animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Header Metadata */}
              <div className="flex flex-wrap items-center gap-3 mb-8 md:mb-10">
                {currentCard.partOfSpeech && (
                  <div className="flex gap-2">
                    {/* Standardized v10.0: split by spaces and uppercase */}
                    {currentCard.partOfSpeech.split(/\s+/).map((pos, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-purple-100/80 border border-purple-200 text-xs md:text-sm font-bold text-purple-700 uppercase">
                        {pos.trim().replace('.', '')}
                      </span>
                    ))}
                  </div>
                )}
                {currentCard.phonetic && (
                  <span className="font-mono text-base md:text-lg text-slate-500 font-medium tracking-tight">
                    {currentCard.phonetic}
                  </span>
                )}
              </div>

              {/* Definition */}
              <div className="text-2xl md:text-4xl font-black text-slate-900 mb-10 leading-tight">
                {currentCard.definition}
              </div>

              {/* Morphology / Inflections */}
              {currentCard.morphology && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400">Inflections</span>
                  </div>
                  <div className="text-base md:text-lg font-semibold text-slate-600 pl-4 border-l-2 border-slate-200">
                    {currentCard.morphology}
                  </div>
                </div>
              )}

              {/* Example Section with subtle background */}
              {currentCard.example && (
                <div className="mb-10 p-5 md:p-7 bg-slate-50/80 rounded-2xl border border-slate-100 group relative">
                  <div className="flex items-center gap-2 mb-4">
                    <Quote className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-300">Contextual Example</span>
                    <button 
                      className="ml-auto p-2 rounded-xl bg-white shadow-sm hover:shadow-md transition-all hover:scale-105 active:scale-95 border border-slate-100"
                      onClick={(e) => { e.stopPropagation(); readText(currentCard.example || ''); }}
                    >
                      <Volume2 className="w-4 h-4 md:w-5 h-5 text-indigo-400" />
                    </button>
                  </div>
                  <div className="text-lg md:text-xl leading-relaxed text-slate-800 font-medium">
                    {formatTagsInText(currentCard.example || '', currentCard.front, currentCard.morphology)}
                  </div>
                </div>
              )}

              {/* Bottom Grid with separate cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-10">
                {currentCard.collocations && (
                  <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-[0_2px_8_px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Collocations</span>
                    </div>
                    <div className="text-sm md:text-base font-bold text-slate-700 leading-relaxed">
                      {formatTagsInText(currentCard.collocations, currentCard.front, currentCard.morphology, 'tagsOnly')}
                    </div>
                  </div>
                )}
                {currentCard.derivatives && (
                  <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-2 mb-3">
                      <Link2 className="w-3.5 h-3.5 text-slate-300" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Derivatives</span>
                    </div>
                    <div className="text-sm md:text-base font-bold text-slate-700 leading-relaxed">
                      {formatTagsInText(currentCard.derivatives, currentCard.front, currentCard.morphology, 'tagsOnly')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {!showAnswer && (
          <div className="absolute bottom-6 left-0 right-0 text-center text-muted-foreground/30 text-[9px] font-black uppercase tracking-[0.2em]">
            Click or Press Space
          </div>
        )}
      </div>

      {showAnswer ? (
        <div className="grid grid-cols-4 gap-2 md:gap-6 mt-4 md:mt-8">
          <button className="py-3 bg-card rounded-2xl border border-danger/30 text-danger text-[10px] font-black uppercase tracking-wider" onClick={() => handleRate('again', 1)}>Again</button>
          <button className="py-3 bg-card rounded-2xl border border-warning/30 text-warning text-[10px] font-black uppercase tracking-wider" onClick={() => handleRate('hard', 2)}>Hard</button>
          <button className="py-3 bg-card rounded-2xl border border-success/30 text-success text-[10px] font-black uppercase tracking-wider" onClick={() => handleRate('good', 3)}>Good</button>
          <button className="py-3 bg-card rounded-2xl border border-blue-500/30 text-blue-500 text-[10px] font-black uppercase tracking-wider" onClick={() => handleRate('easy', 4)}>Easy</button>
        </div>
      ) : (
        <div className="h-[52px] md:h-[84px] mt-4 md:mt-8"></div>
      )}
    </div>
  );
}
