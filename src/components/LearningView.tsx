import { useState, useEffect, useRef, useCallback } from 'react';
import type { Card } from '../lib/types';
import { updateSRS } from '../lib/srs';
import { DB, getTodayStr } from '../lib/db';
import { Volume2, Hash, Layers, Quote, Link2 } from 'lucide-react';

function highlightWord(text: string, front: string, morphology?: string) {
  if (!text) return text;
  
  const wordsToHighlight = [front];
  if (morphology) {
    const morphs = morphology.split(',').map(s => s.trim()).filter(Boolean);
    wordsToHighlight.push(...morphs);
  }
  
  wordsToHighlight.sort((a, b) => b.length - a.length);
  if (wordsToHighlight.length === 0 || !wordsToHighlight[0]) return <>{text}</>;
  
  const escapedWords = wordsToHighlight.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedWords.join('|')})`, 'gi');
  
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 1) { 
          return <mark key={i} className="bg-yellow-500/80 dark:bg-yellow-400/70 text-black px-0.5 rounded font-semibold">{part}</mark>;
        }
        return <span key={i}>{part}</span>;
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

  // Optimized Audio Engine
  const readText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    setAudioError(false);
    window.speechSynthesis.cancel();
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || 
                     voices.find(v => v.lang.startsWith('en')) ||
                     voices[0];
      if (enVoice) utterance.voice = enVoice;
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    } else {
      // Desktop Hardware Wake-up logic
      const wakeUp = new SpeechSynthesisUtterance("");
      wakeUp.volume = 0;
      window.speechSynthesis.speak(wakeUp);
      
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(" " + text);
        const voices = window.speechSynthesis.getVoices();
        const enVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || 
                       voices.find(v => v.lang.startsWith('en')) ||
                       voices[0];
        if (enVoice) utterance.voice = enVoice;
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        utterance.onerror = () => setAudioError(true);
        window.speechSynthesis.speak(utterance);
      }, 500); 
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
           <span className="bg-secondary/60 text-muted-foreground text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border border-border/20">
            {currentCard.state === 'graduated' ? 'Mastered' : 'Learning'}
          </span>
        </div>
        
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <h1 className="text-3xl md:text-6xl font-black mb-4 flex items-center justify-center tracking-tight text-card-foreground break-all">
            {currentCard.front}
            <button 
              className="ml-3 p-1.5 rounded-full hover:bg-secondary transition-colors"
              onClick={(e) => { e.stopPropagation(); readText(currentCard.front); }}
            >
              <Volume2 className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground/60" />
            </button>
          </h1>
          
          {showAnswer && (
            <div className="w-full max-w-2xl mt-4 md:mt-8 pt-6 md:pt-8 border-t border-border/40 text-left animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Header Metadata */}
              <div className="flex flex-wrap items-center gap-2 mb-4 md:mb-6">
                {currentCard.partOfSpeech && (
                  <span className="text-xs font-black italic text-primary/80">{currentCard.partOfSpeech}</span>
                )}
                {currentCard.phonetic && (
                  <span className="font-mono text-xs md:text-sm text-muted-foreground tracking-tight">{currentCard.phonetic}</span>
                )}
                {currentCard.contextType && (
                  <span className="bg-primary/5 text-primary/60 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-primary/10">
                    {currentCard.contextType}
                  </span>
                )}
              </div>

              {/* Definition */}
              <div className="text-lg md:text-2xl font-bold text-card-foreground mb-6 leading-tight">
                {currentCard.definition}
              </div>

              {/* Morphology / Inflections */}
              {currentCard.morphology && (
                <div className="mb-6">
                  <div className="flex items-center gap-1.5 mb-1 text-muted-foreground/50">
                    <Hash className="w-3 h-3" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Inflections</span>
                  </div>
                  <div className="text-sm md:text-base font-medium italic text-card-foreground/70 pl-4 border-l border-border/30">
                    {currentCard.morphology}
                  </div>
                </div>
              )}

              {/* Example */}
              {currentCard.example && (
                <div className="mb-8 group">
                  <div className="flex items-center gap-2 mb-3 text-muted-foreground/50">
                    <Quote className="w-3 h-3" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Example</span>
                    <button 
                      className="p-1 rounded-md hover:bg-secondary transition-colors"
                      onClick={(e) => { e.stopPropagation(); readText(currentCard.example || ''); }}
                    >
                      <Volume2 className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-primary transition-colors" />
                    </button>
                  </div>
                  <div className="text-base md:text-xl leading-relaxed text-card-foreground/90 font-medium pl-4 border-l-2 border-primary/30">
                    {highlightWord(currentCard.example, currentCard.front, currentCard.morphology)}
                  </div>
                </div>
              )}

              {/* Bottom Grid for Secondary Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mt-6 pt-6 border-t border-border/20">
                {currentCard.collocations && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1 text-muted-foreground/50">
                      <Layers className="w-3 h-3" />
                      <span className="text-[9px] font-black uppercase tracking-wider">Collocations</span>
                    </div>
                    <div className="text-xs md:text-sm font-bold text-card-foreground/70 leading-relaxed">
                      {currentCard.collocations}
                    </div>
                  </div>
                )}
                {currentCard.derivatives && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1 text-muted-foreground/50">
                      <Link2 className="w-3 h-3" />
                      <span className="text-[9px] font-black uppercase tracking-wider">Derivatives</span>
                    </div>
                    <div className="text-xs md:text-sm font-bold text-accent/70 leading-relaxed">
                      {highlightWord(currentCard.derivatives, currentCard.front, currentCard.morphology)}
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
