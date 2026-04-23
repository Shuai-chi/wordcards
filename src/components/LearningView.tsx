import { useState, useEffect, useRef, useCallback } from 'react';
import type { Card } from '../lib/types';
import { updateSRS } from '../lib/srs';
import { DB, getTodayStr } from '../lib/db';
import { Volume2, Hash } from 'lucide-react';

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
  // Use a case-insensitive regex without strict word boundaries to handle prefixes/suffixes seamlessly
  const regex = new RegExp(`(${escapedWords.join('|')})`, 'gi');
  
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 1) { 
          return <mark key={i} className="bg-yellow-500/90 dark:bg-yellow-400/80 text-black px-1 rounded font-semibold">{part}</mark>;
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

  // For processing double-click prevention
  const isRatingRef = useRef(false);

  useEffect(() => {
    if (queue.length > 0 && !currentCard) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentCard(queue[0]);
    }
  }, [queue, currentCard]);

  // Audio Reading
  const readText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    setAudioError(false);
    
    // Cancel previous speech to prevent overlapping or deadlocks
    window.speechSynthesis.cancel();
    
    // Increased delay to 200ms to allow audio hardware to fully initialize
    setTimeout(() => {
      // Multiple dots create a more reliable "warm-up" period for the audio stream
      const utterance = new SpeechSynthesisUtterance(". . . " + text);
      
      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || 
                     voices.find(v => v.lang.startsWith('en')) ||
                     voices[0];
      
      if (enVoice) {
        utterance.voice = enVoice;
      }
      
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      
      utterance.onerror = (event) => {
        console.error("TTS Error Detail:", event);
        setAudioError(true);
      };
      
      window.speechSynthesis.speak(utterance);
    }, 50); // 50ms delay is usually enough
  };

  useEffect(() => {
    if (currentCard && !showAnswer) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      readText(currentCard.front);
    }
  }, [currentCard, showAnswer]);

  const handleRate = useCallback(async (ratingKey: 'again'|'hard'|'good'|'easy', btnIndex: number) => {
    if (!currentCard || !showAnswer || isRatingRef.current) return;
    isRatingRef.current = true;
    
    // Shift queue
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
    setCurrentCard(null); // will be populated by useEffect
    window.speechSynthesis.cancel();

    // Async commit to DB
    await DB.commitReview(updatedCard, getTodayStr(), ratingKey, isFirstTouchToday, previousRating);

    isRatingRef.current = false;
    
    if (newQueue.length === 0) {
      onFinish();
    }
  }, [currentCard, showAnswer, queue, seenIds, onFinish, setQueue]);

  // Keep a ref to the latest handleRate to avoid stale closures in keydown listener
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
      <div className="mb-4">
        <div className="flex justify-between text-xs text-muted font-medium mb-1.5 px-1">
          <span>剩餘 {queue.length} 張卡片</span>
          <span>進度 {Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
          <div className="bg-primary h-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div 
        className="flex-1 bg-card border border-border shadow-md rounded-2xl p-6 md:p-10 flex flex-col overflow-y-auto cursor-pointer relative"
        onClick={() => !showAnswer && setShowAnswer(true)}
      >
        {audioError && <div className="absolute top-4 right-4 text-xs text-danger flex items-center"><Hash className="w-3 h-3 mr-1"/> 發音無效</div>}
        <div className="absolute top-4 left-4 bg-secondary text-muted text-xs px-2 py-1 rounded font-medium flex items-center">
          {currentCard.state === 'new' ? '新' : currentCard.state === 'graduated' ? '複' : '學'} 
          {currentCard.failCount > 0 ? ` · 錯 ${currentCard.failCount}` : ''}
        </div>
        
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 flex items-center justify-center relative group tracking-tight">
            {currentCard.front}
            <Volume2 
              className="w-6 h-6 ml-3 text-muted group-hover:text-primary transition-colors hover:scale-110 cursor-pointer" 
              onClick={(e) => { e.stopPropagation(); readText(currentCard.front); }}
            />
          </h1>
          
          {showAnswer && (
            <div className="w-full max-w-full transform transition-all duration-300 ease-out translate-y-0 opacity-100 mt-6 border-t border-border/50 pt-8 text-left text-base md:text-lg text-card-foreground leading-relaxed">
              {(currentCard.example || currentCard.definition) ? (
                <div className="flex flex-col text-left w-full">
                  {currentCard.phonetic && currentCard.phonetic !== '無' && (
                    <div className="font-mono text-accent text-sm md:text-base font-bold mb-4 tracking-wide">
                      {currentCard.phonetic}
                    </div>
                  )}
                  {currentCard.definition && (
                    <div className="font-bold text-lg md:text-xl text-primary mb-4">
                      {currentCard.partOfSpeech ? `[${currentCard.partOfSpeech}] ` : ''}{currentCard.definition}
                    </div>
                  )}
                  {currentCard.morphology && (
                    <div className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
                      <span className="bg-secondary px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Inflections</span>
                      <span className="italic">{currentCard.morphology}</span>
                    </div>
                  )}
                  {currentCard.example && (
                    <div className="text-muted italic border-l-2 border-border pl-3 mb-4">
                      {highlightWord(currentCard.example, currentCard.front, currentCard.morphology)}
                    </div>
                  )}
                  {currentCard.derivatives && (
                    <div className="text-sm text-accent mb-4 italic">
                      衍生詞：{highlightWord(currentCard.derivatives, currentCard.front, currentCard.morphology)}
                    </div>
                  )}
                  {currentCard.collocations && currentCard.collocations !== '無' && (
                    <div className="font-medium text-foreground bg-secondary/50 p-2 rounded-md inline-block mb-3">
                      {currentCard.collocations}
                    </div>
                  )}
                  {currentCard.contextType && (
                    <div className="text-xs text-muted/70 mt-2 flex justify-end">
                      <span className="bg-secondary/80 px-2 py-1 rounded">標籤：{currentCard.contextType}</span>
                    </div>
                  )}
                </div>
              ) : (
                currentCard.back.split('\n').map((line, i) => {
                  const trimmed = line.trim();
                  let className = "mb-3 last:mb-0";
                  
                  // Styling heuristics
                  if (trimmed.startsWith('音標：') || trimmed.startsWith('音标：')) {
                    className = "font-mono text-accent text-sm md:text-base font-bold mb-4 tracking-wide";
                  } else if (trimmed.startsWith('意思：')) {
                    className = "font-bold text-lg md:text-xl text-primary mb-4";
                  } else if (trimmed.startsWith('例句：')) {
                    className = "text-muted italic border-l-2 border-border pl-3 mb-4";
                  } else if (trimmed.startsWith('搭配：')) {
                    className = "font-medium text-foreground bg-secondary/50 p-2 rounded-md inline-block mb-3";
                  }

                  return (
                    <div key={i} className={className}>
                      {trimmed.replace(/^(音標：|音标：|意思：|例句：|搭配：)/, '')}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
        {!showAnswer && (
          <div className="absolute bottom-6 left-0 right-0 text-center text-muted text-sm font-medium animate-pulse">
            點擊卡片或按 Space 鍵顯示答案
          </div>
        )}
      </div>

      {showAnswer ? (
        <div className="grid grid-cols-4 gap-2 md:gap-4 mt-6">
          <button className="flex flex-col items-center justify-center py-3 px-2 md:py-4 bg-card rounded-xl border border-danger hover:bg-danger/10 text-danger transition-colors font-bold shadow-sm" onClick={() => handleRate('again', 1)}>
            <span className="text-sm md:text-lg">重學</span>
            <span className="text-xs font-normal opacity-70 mt-1 md:mt-2 hidden md:block">Press 1</span>
          </button>
          <button className="flex flex-col items-center justify-center py-3 px-2 md:py-4 bg-card rounded-xl border border-warning hover:bg-warning/10 text-warning transition-colors font-bold shadow-sm" onClick={() => handleRate('hard', 2)}>
            <span className="text-sm md:text-lg">困難</span>
            <span className="text-xs font-normal opacity-70 mt-1 md:mt-2 hidden md:block">Press 2</span>
          </button>
          <button className="flex flex-col items-center justify-center py-3 px-2 md:py-4 bg-card rounded-xl border border-success hover:bg-success/10 text-success transition-colors font-bold shadow-sm" onClick={() => handleRate('good', 3)}>
            <span className="text-sm md:text-lg">良好</span>
            <span className="text-xs font-normal opacity-70 mt-1 md:mt-2 hidden md:block">Press 3</span>
          </button>
          <button className="flex flex-col items-center justify-center py-3 px-2 md:py-4 bg-card rounded-xl border border-blue-500 hover:bg-blue-500/10 text-blue-500 transition-colors font-bold shadow-sm" onClick={() => handleRate('easy', 4)}>
            <span className="text-sm md:text-lg">輕鬆</span>
            <span className="text-xs font-normal opacity-70 mt-1 md:mt-2 hidden md:block">Press 4</span>
          </button>
        </div>
      ) : (
        <div className="h-[76px] mt-6 md:h-[92px]"></div>
      )}
    </div>
  );
}
