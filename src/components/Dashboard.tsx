import { useState, useEffect } from 'react';
import type { Deck, Report, Card } from '../lib/types';
import { DB, getTodayStr } from '../lib/db';
import { shuffleArray } from '../lib/srs';
import { Target, CheckCircle2, Edit2, Trash2, Upload, ListChecks, X, RotateCw, Play, Layers } from 'lucide-react';
import BulkEditModal from './BulkEditModal';

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
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

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
            if (c.introducedDate === todayStr) { deckDrawnNewToday++; drawnGlobalNewToday++; }
            if (c.lastReviewedDate === todayStr) touchedTodayCount++;
            if (c.state === 'new') return;
            const isUrgent = c.state === 'learning' || c.state === 'relearning';
            if (isUrgent) urgentCount++;
            else if (c.state === 'graduated') {
              const nextD = new Date(c.lastReviewedDate + 'T00:00:00');
              nextD.setDate(nextD.getDate() + c.interval);
              const nextStr = `${nextD.getFullYear()}-${String(nextD.getMonth()+1).padStart(2,'0')}-${String(nextD.getDate()).padStart(2,'0')}`;
              if (nextStr <= todayStr) standardDueCount++;
            }
          });
          totalTargetNew += Math.max(0, (deck.newCardLimit ?? 20) - deckDrawnNewToday);
        } catch (e) { console.error(e); }
      }

      let expectedCount = urgentCount;
      let remainingBudget = Math.max(0, globalLimit - drawnGlobalNewToday);
      const takesStandard = Math.min(standardDueCount, remainingBudget);
      expectedCount += takesStandard;
      remainingBudget -= takesStandard;
      expectedCount += Math.min(totalTargetNew, remainingBudget);

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
          progress[deck.id] = { introduced: cards.filter(c => c.state !== 'new').length, total: cards.length };
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
      const dUrgent: Card[] = [], dStandard: Card[] = [], dNew: Card[] = [];

      cards.forEach(c => {
        if (c.introducedDate === todayStr) { deckDrawnNewToday++; drawnGlobalNewToday++; }
        if (c.state === 'new') { dNew.push(c); return; }
        const isUrgent = c.state === 'learning' || c.state === 'relearning';
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
    queue.push(...shuffleArray(newCards).slice(0, Math.min(newCards.length, remainingBudget)));

    if (queue.length === 0) {
      for (const deckId of selectedDeckIds) {
        const cards = await DB.getCardsByDeck(deckId);
        cards.forEach(c => { if (c.lastReviewedDate === todayStr) queue.push(c); });
      }
      queue = shuffleArray(queue);
    }

    if (queue.length > 0) onStartSession(queue);
  };

  const toggleDeck = (id: string) => {
    const newSet = new Set(selectedDeckIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedDeckIds(newSet);
    localStorage.setItem('srs_selected_decks', JSON.stringify(Array.from(newSet)));
  };

  const handleSelectAll = () => {
    const allIds = new Set(decks.map(d => d.id));
    setSelectedDeckIds(allIds);
    localStorage.setItem('srs_selected_decks', JSON.stringify(Array.from(allIds)));
  };

  const handleDeselectAll = () => {
    setSelectedDeckIds(new Set());
    localStorage.setItem('srs_selected_decks', JSON.stringify([]));
  };

  const handleInvertSelection = () => {
    const newSet = new Set(decks.filter(d => !selectedDeckIds.has(d.id)).map(d => d.id));
    setSelectedDeckIds(newSet);
    localStorage.setItem('srs_selected_decks', JSON.stringify(Array.from(newSet)));
  };

  const handleBulkDelete = async () => {
    if (confirm(`確定要刪除已選取的 ${selectedDeckIds.size} 個套牌嗎？此動作不可復原。`)) {
      if (selectedDeckIds.size > 0) {
        const ids = Array.from(selectedDeckIds);
        for (let i = 0; i < ids.length - 1; i++) await DB.deleteDeck(ids[i]);
        onDeleteDeck(ids[ids.length - 1]);
        setSelectedDeckIds(new Set());
      }
    }
  };

  const cHard = report?.clicks?.hard || 0;
  const cGood = report?.clicks?.good || 0;
  const cEasy = report?.clicks?.easy || 0;
  const cTotal = report?.uniqueCards || 0;

  const startLabel = selectedDeckIds.size === 0
    ? '請先選擇套牌'
    : budgetInfo.expected > 0
      ? `開始練習 (${budgetInfo.expected} 張)`
      : budgetInfo.touchedToday > 0
        ? `重複練習今日 (${budgetInfo.touchedToday} 張)`
        : '今日已無任務';

  const canStart = selectedDeckIds.size > 0 && (budgetInfo.expected > 0 || budgetInfo.touchedToday > 0);

  return (
    <div className="space-y-6">

      {/* ── Today's Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted">今日已練習</span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}>
              <Target className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight">{cTotal}</div>
          <div className="text-xs text-muted">張卡片</div>
        </div>

        {/* Hard */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted">困難</span>
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--warning)' }} />
          </div>
          <div className="text-2xl font-black tracking-tight" style={{ color: 'var(--warning)' }}>{cHard}</div>
          <div className="text-xs text-muted">Hard</div>
        </div>

        {/* Good */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted">良好</span>
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
          </div>
          <div className="text-2xl font-black tracking-tight" style={{ color: 'var(--success)' }}>{cGood}</div>
          <div className="text-xs text-muted">Good</div>
        </div>

        {/* Easy */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted">輕鬆</span>
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} />
          </div>
          <div className="text-2xl font-black tracking-tight" style={{ color: 'var(--primary)' }}>{cEasy}</div>
          <div className="text-xs text-muted">Easy</div>
        </div>
      </div>

      {/* ── Learning Center Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted" />
            <h2 className="text-base font-bold">學習中心</h2>
          </div>
          <span className="badge text-xs"
            style={{
              background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
              color: 'var(--primary)',
              border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)',
            }}>
            每日上限 {globalLimit}
          </span>
        </div>

        <button
          onClick={handleStart}
          disabled={!canStart}
          className="btn btn-primary gap-2 sm:min-w-[160px]"
        >
          <Play className="w-3.5 h-3.5" />
          {startLabel}
        </button>
      </div>

      {/* ── Empty State ── */}
      {decks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center animate-soft-pulse"
            style={{ background: 'var(--secondary)' }}>
            <Upload className="w-7 h-7 text-muted" />
          </div>
          <div>
            <h3 className="font-semibold text-base mb-1">尚無單字套牌</h3>
            <p className="text-sm text-muted">點擊右上角的 <Upload className="w-3.5 h-3.5 inline mb-0.5" /> 上傳按鈕匯入 CSV 檔案</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* ── Toolbar ── */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-2">
            {/* Selection controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSelectAll}
                className="btn btn-ghost h-8 px-2.5 text-xs gap-1.5 rounded-md"
              >
                <ListChecks className="w-3.5 h-3.5" /> 全選
              </button>
              <button
                onClick={handleDeselectAll}
                className="btn btn-ghost h-8 px-2.5 text-xs gap-1.5 rounded-md"
              >
                <X className="w-3.5 h-3.5" /> 取消
              </button>
              <button
                onClick={handleInvertSelection}
                className="btn btn-ghost h-8 px-2.5 text-xs gap-1.5 rounded-md"
              >
                <RotateCw className="w-3.5 h-3.5" /> 反向
              </button>
            </div>

            {/* Bulk actions — only shown when something is selected */}
            {selectedDeckIds.size > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted mr-1">已選 {selectedDeckIds.size}</span>
                <button
                  onClick={() => setIsBulkEditOpen(true)}
                  className="btn h-8 px-2.5 text-xs gap-1.5 rounded-md"
                  style={{
                    background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
                    color: 'var(--primary)',
                    border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)',
                  }}
                >
                  <Edit2 className="w-3.5 h-3.5" /> 設定上限
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="btn h-8 px-2.5 text-xs gap-1.5 rounded-md"
                  style={{
                    background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
                    color: 'var(--danger)',
                    border: '1px solid color-mix(in srgb, var(--danger) 20%, transparent)',
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" /> 刪除
                </button>
              </div>
            )}
          </div>

          {isBulkEditOpen && (
            <BulkEditModal
              selectedCount={selectedDeckIds.size}
              onClose={() => setIsBulkEditOpen(false)}
              onSave={async (limit) => {
                for (const id of selectedDeckIds) {
                  const deck = decks.find(d => d.id === id);
                  if (deck) await DB.putDeck({ ...deck, newCardLimit: limit });
                }
                setIsBulkEditOpen(false);
                if (decks.length > 0) onDeleteDeck('');
              }}
            />
          )}

          {/* ── Deck List ── */}
          {decks.map((d) => {
            const isSelected = selectedDeckIds.has(d.id);
            const p = deckProgress[d.id];
            const intro = p?.introduced ?? 0;
            const total = p?.total ?? (d.cardCount ?? 0);
            const pct = total > 0 ? Math.round((intro / total) * 100) : 0;

            return (
              <div
                key={d.id}
                className="card-container p-4 flex items-center gap-3 cursor-pointer transition-all duration-150"
                style={{
                  borderColor: isSelected ? 'var(--primary)' : undefined,
                  boxShadow: isSelected
                    ? '0 0 0 1px var(--primary), 0 1px 3px rgba(0,0,0,0.06)'
                    : undefined,
                }}
                onClick={() => toggleDeck(d.id)}
              >
                {/* Checkbox */}
                <div
                  className="w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all"
                  style={{
                    borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                    background: isSelected ? 'var(--primary)' : 'transparent',
                  }}
                >
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm truncate">{d.name}</h3>
                    <span className="text-xs text-muted flex-shrink-0">
                      {intro}/{total} 張
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 w-full h-1 rounded-full overflow-hidden"
                    style={{ background: 'var(--secondary)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${pct}%`,
                        background: pct === 100 ? 'var(--success)' : 'var(--primary)',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted">每日新卡 {d.newCardLimit ?? 20}</span>
                    <span className="text-[10px] text-muted font-semibold">{pct}%</span>
                  </div>
                </div>

                {/* Actions */}
                <div
                  className="flex items-center gap-0.5 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="btn btn-ghost w-8 h-8 p-0 rounded-lg"
                    onClick={() => onEditDeck(d)}
                    title="編輯套牌"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="btn btn-ghost w-8 h-8 p-0 rounded-lg"
                    style={{ color: 'var(--danger)' } as React.CSSProperties}
                    onClick={() => onDeleteDeck(d.id)}
                    title="刪除套牌"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
