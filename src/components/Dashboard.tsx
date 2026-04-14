import { useState, useEffect } from 'react';
import type { Deck, Report, Card } from '../lib/types';
import { DB, getTodayStr } from '../lib/db';
import { shuffleArray } from '../lib/srs';
import { Target, CheckCircle, Edit2, Trash2, Upload, ListChecks, Squircle, RotateCw } from 'lucide-react';

interface Props {
  decks: Deck[];
  report: Report | null;
  globalLimit: number;
  onStartSession: (queue: Card[]) => void;
  onEditDeck: (d: Deck) => void;
  onDeleteDeck: (id: string) => void;
}

export default function Dashboard({ decks, report, globalLimit, onStartSession, onEditDeck, onDeleteDeck }: Props) {
  const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('srs_selected_decks');
    if (saved) {
      try { return new Set<string>(JSON.parse(saved)); } catch { /* ignore */ }
    }
    return new Set<string>();
  });
  const [budgetInfo, setBudgetInfo] = useState({ expected: 0, touchedToday: 0 });
  const [deckProgress, setDeckProgress] = useState<Record<string, { introduced: number; total: number }>>({}); 

  useEffect(() => {
    async function calcBudget() {
      if (selectedDeckIds.size === 0) {
        setBudgetInfo({ expected: 0, touchedToday: 0 });
        return;
      }
      
      const todayStr = getTodayStr();
      let drawnGlobalNewToday = 0;
      let totalTargetNew = 0;
      let urgentCount = 0;
      let standardDueCount = 0;
      let touchedTodayCount = 0;

      for (const deckId of selectedDeckIds) {
        const deck = decks.find(d => d.id === deckId);
        if (!deck) continue;
        
        try {
          const cards = await DB.getCardsByDeck(deckId);
          let deckDrawnNewToday = 0;
          cards.forEach(c => {
            if (c.introducedDate === todayStr) {
               deckDrawnNewToday++;
               drawnGlobalNewToday++;
            }
            if (c.lastReviewedDate === todayStr) {
               touchedTodayCount++;
            }
            if (c.state === 'new') return;
            const now = todayStr;
            const isUrgent = (c.state === 'learning' || c.state === 'relearning');
            if (isUrgent) urgentCount++;
            else if (c.state === 'graduated') {
                const nextD = new Date(c.lastReviewedDate + 'T00:00:00');
                nextD.setDate(nextD.getDate() + c.interval);
                const nextStr = `${nextD.getFullYear()}-${String(nextD.getMonth()+1).padStart(2,'0')}-${String(nextD.getDate()).padStart(2,'0')}`;
                if (nextStr <= now) standardDueCount++;
            }
          });
          totalTargetNew += Math.max(0, (deck.newCardLimit ?? 20) - deckDrawnNewToday);
        } catch (e) {
          console.error(e);
        }
      }

      let expectedCount = urgentCount;
      let remainingBudget = Math.max(0, globalLimit - drawnGlobalNewToday);
      const takesStandard = Math.min(standardDueCount, remainingBudget);
      expectedCount += takesStandard;
      remainingBudget -= takesStandard;
      const takesNew = Math.min(totalTargetNew, remainingBudget);
      expectedCount += takesNew;
      
      setBudgetInfo({ expected: expectedCount, touchedToday: touchedTodayCount });
    }

    calcBudget();
  }, [decks, selectedDeckIds, globalLimit]);

  useEffect(() => {
    async function calcProgress() {
      const progress: Record<string, { introduced: number; total: number }> = {};
      for (const deck of decks) {
        try {
          const cards = await DB.getCardsByDeck(deck.id);
          const introduced = cards.filter(c => c.state !== 'new').length;
          progress[deck.id] = { introduced, total: cards.length };
        } catch {
          progress[deck.id] = { introduced: 0, total: deck.cardCount ?? 0 };
        }
      }
      setDeckProgress(progress);
    }
    if (decks.length > 0) calcProgress();
  }, [decks]);

  const handleStart = async () => {
    if (selectedDeckIds.size === 0) return;
    const todayStr = getTodayStr();
    
    let drawnGlobalNewToday = 0;
    const urgentCards: Card[] = [];
    const standardDueCards: Card[] = [];
    const newCards: Card[] = [];

    for (const deckId of selectedDeckIds) {
      const deck = decks.find(d => d.id === deckId);
      if (!deck) continue;
      const cards = await DB.getCardsByDeck(deckId);
      let deckDrawnNewToday = 0;
      const dUrgent: Card[] = [];
      const dStandard: Card[] = [];
      const dNew: Card[] = [];
      
      cards.forEach(c => {
        if (c.introducedDate === todayStr) {
          deckDrawnNewToday++;
          drawnGlobalNewToday++;
        }
        if (c.state === 'new') { dNew.push(c); return; }
        const isUrgent = (c.state === 'learning' || c.state === 'relearning');
        if (isUrgent) { dUrgent.push(c); return; }
        
        if (c.state === 'graduated') {
            const nextD = new Date(c.lastReviewedDate + 'T00:00:00');
            nextD.setDate(nextD.getDate() + c.interval);
            const nextStr = `${nextD.getFullYear()}-${String(nextD.getMonth()+1).padStart(2,'0')}-${String(nextD.getDate()).padStart(2,'0')}`;
            if (nextStr <= todayStr) dStandard.push(c);
        }
      });
      urgentCards.push(...dUrgent);
      standardDueCards.push(...dStandard);
      const newSlots = Math.max(0, (deck.newCardLimit ?? 20) - deckDrawnNewToday);
      
      newCards.push(...shuffleArray(dNew).slice(0, newSlots));
    }

    let queue = shuffleArray(urgentCards);
    let remainingBudget = Math.max(0, globalLimit - drawnGlobalNewToday);
    
    const takesStandard = Math.min(standardDueCards.length, remainingBudget);
    queue.push(...shuffleArray(standardDueCards).slice(0, takesStandard));
    remainingBudget -= takesStandard;
    
    const takesNew = Math.min(newCards.length, remainingBudget);
    queue.push(...shuffleArray(newCards).slice(0, takesNew));
    
    if (queue.length === 0) {
      for (const deckId of selectedDeckIds) {
        const cards = await DB.getCardsByDeck(deckId);
        cards.forEach(c => {
           if (c.lastReviewedDate === todayStr) queue.push(c);
        });
      }
      queue = shuffleArray(queue);
    }

    if (queue.length > 0) {
      onStartSession(queue);
    }
  };

  const handleSelectAll = () => {
    const allIds = new Set(decks.map(d => d.id));
    setSelectedDeckIds(allIds);
    localStorage.setItem('srs_selected_decks', JSON.stringify(Array.from(allIds)));
  };

  const handleDeselectAll = () => {
    const empty = new Set<string>();
    setSelectedDeckIds(empty);
    localStorage.setItem('srs_selected_decks', JSON.stringify([]));
  };

  const handleInvertSelection = () => {
    const newSet = new Set<string>();
    decks.forEach(d => {
      if (!selectedDeckIds.has(d.id)) newSet.add(d.id);
    });
    setSelectedDeckIds(newSet);
    localStorage.setItem('srs_selected_decks', JSON.stringify(Array.from(newSet)));
  };

  const cAgain = report?.clicks?.again || 0;
  const cGood = report?.clicks?.good || 0;
  const cEasy = report?.clicks?.easy || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card-container p-4 flex flex-col justify-center bg-gray-50 dark:bg-gray-800/50">
          <div className="text-xs font-medium text-muted mb-1">今日已練習</div>
          <div className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" />
            {report?.uniqueCards || 0} <span className="text-sm font-normal text-muted mt-1">張</span>
          </div>
        </div>
        <div className="card-container p-4 flex flex-col justify-center border-l-4 border-l-danger">
          <div className="text-xs font-medium text-muted mb-1">重學 (Again)</div>
          <div className="text-xl md:text-2xl font-bold text-danger">{cAgain}</div>
        </div>
        <div className="card-container p-4 flex flex-col justify-center border-l-4 border-l-success">
          <div className="text-xs font-medium text-muted mb-1">良好 (Good)</div>
          <div className="text-xl md:text-2xl font-bold text-success">{cGood}</div>
        </div>
        <div className="card-container p-4 flex flex-col justify-center border-l-4 border-l-blue-500">
          <div className="text-xs font-medium text-muted mb-1">輕鬆 (Easy)</div>
          <div className="text-xl md:text-2xl font-bold text-blue-500">{cEasy}</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-8 mb-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-bold">學習中心</h2>
          <span className="text-sm text-muted">全域每日新卡上限：{globalLimit}</span>
        </div>
        
        <button 
          onClick={handleStart}
          disabled={selectedDeckIds.size === 0 || (budgetInfo.expected === 0 && budgetInfo.touchedToday === 0)}
          className="btn btn-primary w-full md:w-auto min-w-[140px]"
        >
          {selectedDeckIds.size === 0 
            ? '請先選擇套牌'
            : budgetInfo.expected > 0 
              ? `開始練習 (${budgetInfo.expected} 張)`
              : budgetInfo.touchedToday > 0
                ? `重複練習今日卡片 (${budgetInfo.touchedToday} 張)`
                : '今日已無任務'}
        </button>
      </div>

      {decks.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed border-border rounded-xl">
          <Upload className="w-12 h-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">尚無單字套牌</h3>
          <p className="text-sm text-muted">點擊右上角的上傳按鈕匯入 CSV 檔案</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button 
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-secondary/50 hover:bg-secondary text-muted hover:text-foreground rounded-lg transition-all border border-border"
            >
              <ListChecks className="w-3.5 h-3.5" /> 全選
            </button>
            <button 
              onClick={handleDeselectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-secondary/50 hover:bg-secondary text-muted hover:text-foreground rounded-lg transition-all border border-border"
            >
              <Squircle className="w-3.5 h-3.5" /> 取消全選
            </button>
            <button 
              onClick={handleInvertSelection}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-secondary/50 hover:bg-secondary text-muted hover:text-foreground rounded-lg transition-all border border-border"
            >
              <RotateCw className="w-3.5 h-3.5" /> 反向全選
            </button>
          </div>
          {decks.map((d) => (
            <div 
              key={d.id} 
              className={`card-container p-4 flex items-center justify-between cursor-pointer transition-colors hover:border-primary border-2 ${selectedDeckIds.has(d.id) ? 'border-primary ring-1 ring-primary' : 'border-transparent'}`}
              onClick={() => {
                const newSet = new Set(selectedDeckIds);
                if (newSet.has(d.id)) newSet.delete(d.id);
                else newSet.add(d.id);
                setSelectedDeckIds(newSet);
                localStorage.setItem('srs_selected_decks', JSON.stringify(Array.from(newSet)));
              }}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                 <div className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center mt-0.5 ${selectedDeckIds.has(d.id) ? 'bg-primary border-primary' : 'border-muted'}`}>
                    {selectedDeckIds.has(d.id) && <CheckCircle className="w-4 h-4 text-white" />}
                 </div>
                 <div className="flex-1 min-w-0">
                   <h3 className="font-semibold text-base truncate">{d.name}</h3>
                   <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted font-medium mt-1">
                     <span>每日新卡上限：{d.newCardLimit ?? 20}</span>
                     <span className="text-foreground font-semibold">
                       {(() => {
                         const p = deckProgress[d.id];
                         const intro = p?.introduced ?? 0;
                         const total = p?.total ?? (d.cardCount ?? 0);
                         return `${intro} / ${total}`;
                       })()}
                       <span className="text-muted font-normal ml-1">(已抽卡/總卡片)</span>
                     </span>
                   </div>
                   {/* Progress Bar */}
                   {(() => {
                     const p = deckProgress[d.id];
                     const intro = p?.introduced ?? 0;
                     const total = p?.total ?? (d.cardCount ?? 0);
                     const pct = total > 0 ? Math.round((intro / total) * 100) : 0;
                     return (
                       <div className="mt-2 w-full">
                         <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                           <div
                             className="h-full rounded-full transition-all duration-700 ease-out"
                             style={{
                               width: `${pct}%`,
                               background: pct === 100
                                 ? 'linear-gradient(90deg, #10b981, #34d399)'
                                 : pct >= 50
                                   ? 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                                   : 'linear-gradient(90deg, #6366f1, #818cf8)',
                             }}
                           />
                         </div>
                         <div className="text-[10px] text-muted mt-0.5 text-right">{pct}%</div>
                       </div>
                     );
                   })()}
                 </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                <button className="p-2 text-muted hover:text-accent rounded-full hover:bg-secondary transition-colors" onClick={() => onEditDeck(d)}>
                  <Edit2 className="w-4 h-4" />
                </button>
                <button className="p-2 text-muted hover:text-danger rounded-full hover:bg-secondary transition-colors" onClick={() => onDeleteDeck(d.id)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
