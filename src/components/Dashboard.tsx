import { useState, useEffect } from 'react';
import type { Deck, Report, Card } from '../lib/types';
import type { UIStrings, SupportedLang } from '../lib/languages';
import { LANG_CONFIGS, t } from '../lib/languages';
import { DB, getTodayStr } from '../lib/db';
import { shuffleArray } from '../lib/srs';
import {
  Target, CheckCircle2, Edit2, Trash2, Upload,
  ListChecks, X, RotateCw, Play, Layers,
} from 'lucide-react';
import BulkEditModal from './BulkEditModal';

interface Props {
  decks: Deck[];
  report: Report | null;
  globalLimit: number;
  strings: UIStrings;
  onStartSession: (queue: Card[]) => void;
  onEditDeck: (d: Deck) => void;
  onDeleteDeck: (id: string) => void;
}

export default function Dashboard({
  decks, report, globalLimit, strings,
  onStartSession, onEditDeck, onDeleteDeck,
}: Props) {
  const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('srs_selected_decks');
    if (saved) { try { return new Set<string>(JSON.parse(saved)); } catch { /* ignore */ } }
    return new Set<string>();
  });
  const [budgetInfo, setBudgetInfo] = useState({ expected: 0, touchedToday: 0 });
  const [deckProgress, setDeckProgress] = useState<Record<string, { introduced: number; total: number }>>({});
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [langFilter, setLangFilter] = useState<SupportedLang | 'all'>('all');

  // Derive available languages from current decks
  const availableLangs = Array.from(
    new Set(decks.map(d => d.language).filter(Boolean))
  ) as SupportedLang[];

  const filteredDecks = langFilter === 'all'
    ? decks
    : decks.filter(d => d.language === langFilter);

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
    const allIds = new Set(filteredDecks.map(d => d.id));
    setSelectedDeckIds(allIds);
    localStorage.setItem('srs_selected_decks', JSON.stringify(Array.from(allIds)));
  };

  const handleDeselectAll = () => {
    setSelectedDeckIds(new Set());
    localStorage.setItem('srs_selected_decks', JSON.stringify([]));
  };

  const handleInvertSelection = () => {
    const newSet = new Set(filteredDecks.filter(d => !selectedDeckIds.has(d.id)).map(d => d.id));
    setSelectedDeckIds(newSet);
    localStorage.setItem('srs_selected_decks', JSON.stringify(Array.from(newSet)));
  };

  const handleBulkDelete = async () => {
    if (confirm(t(strings, 'confirmBulkDelete', { n: selectedDeckIds.size }))) {
      if (selectedDeckIds.size > 0) {
        const ids = Array.from(selectedDeckIds);
        for (let i = 0; i < ids.length - 1; i++) await DB.deleteDeck(ids[i]);
        onDeleteDeck(ids[ids.length - 1]);
        setSelectedDeckIds(new Set());
      }
    }
  };

  const cHard  = report?.clicks?.hard  || 0;
  const cGood  = report?.clicks?.good  || 0;
  const cEasy  = report?.clicks?.easy  || 0;
  const cTotal = report?.uniqueCards   || 0;

  const startLabel = selectedDeckIds.size === 0
    ? strings.selectDeckFirst
    : budgetInfo.expected > 0
      ? `${strings.startPractice} (${budgetInfo.expected})`
      : budgetInfo.touchedToday > 0
        ? `${strings.repeatToday} (${budgetInfo.touchedToday})`
        : strings.noTasksToday;

  const canStart = selectedDeckIds.size > 0 && (budgetInfo.expected > 0 || budgetInfo.touchedToday > 0);

  return (
    <div className="space-y-6">

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{strings.todayPracticed}</span>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
              <Target className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight">{cTotal}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>{strings.cards}</div>
        </div>

        {/* Hard */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{strings.hard}</span>
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--warning)' }} />
          </div>
          <div className="text-2xl font-black tracking-tight" style={{ color: 'var(--warning)' }}>{cHard}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Hard</div>
        </div>

        {/* Good */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{strings.good}</span>
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
          </div>
          <div className="text-2xl font-black tracking-tight" style={{ color: 'var(--success)' }}>{cGood}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Good</div>
        </div>

        {/* Easy */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{strings.easy}</span>
            <span className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} />
          </div>
          <div className="text-2xl font-black tracking-tight" style={{ color: 'var(--primary)' }}>{cEasy}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Easy</div>
        </div>
      </div>

      {/* ── Header Row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4" style={{ color: 'var(--muted)' }} />
            <h2 className="text-base font-bold" style={{ letterSpacing: '-0.01em' }}>
              {strings.learningCenter}
            </h2>
          </div>
          <span className="badge text-xs"
            style={{
              background: 'color-mix(in srgb, var(--primary) 8%, transparent)',
              color: 'var(--primary)',
              border: '1px solid color-mix(in srgb, var(--primary) 16%, transparent)',
            }}>
            {strings.dailyNew} {globalLimit}
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

      {/* ── Language filter chips (only shown if >1 language in library) ── */}
      {availableLangs.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
            {strings.filterLanguage}:
          </span>
          <button
            className={`lang-chip${langFilter === 'all' ? ' active' : ''}`}
            onClick={() => setLangFilter('all')}
          >
            {strings.allLanguages}
          </button>
          {availableLangs.map(lang => {
            const cfg = LANG_CONFIGS[lang];
            return (
              <button
                key={lang}
                className={`lang-chip${langFilter === lang ? ' active' : ''}`}
                onClick={() => setLangFilter(lang)}
              >
                <span>{cfg.flag}</span>
                <span>{cfg.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Empty State ── */}
      {decks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center animate-soft-pulse"
            style={{ background: 'var(--secondary)' }}
          >
            <Upload className="w-7 h-7" style={{ color: 'var(--muted)' }} />
          </div>
          <div>
            <h3 className="font-semibold text-base mb-1">{strings.noDeck}</h3>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{strings.noDeckSub}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* ── Toolbar ── */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-1">
            <div className="flex items-center gap-1.5">
              <button onClick={handleSelectAll} className="btn btn-ghost h-8 px-2.5 text-xs gap-1.5 rounded-lg">
                <ListChecks className="w-3.5 h-3.5" /> {strings.selectAll}
              </button>
              <button onClick={handleDeselectAll} className="btn btn-ghost h-8 px-2.5 text-xs gap-1.5 rounded-lg">
                <X className="w-3.5 h-3.5" /> {strings.deselectAll}
              </button>
              <button onClick={handleInvertSelection} className="btn btn-ghost h-8 px-2.5 text-xs gap-1.5 rounded-lg">
                <RotateCw className="w-3.5 h-3.5" /> {strings.invertSelection}
              </button>
            </div>

            {selectedDeckIds.size > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs mr-1" style={{ color: 'var(--muted)' }}>
                  {strings.selected} {selectedDeckIds.size}
                </span>
                <button
                  onClick={() => setIsBulkEditOpen(true)}
                  className="btn h-8 px-2.5 text-xs gap-1.5 rounded-lg"
                  style={{
                    background: 'color-mix(in srgb, var(--primary) 8%, transparent)',
                    color: 'var(--primary)',
                    border: '1px solid color-mix(in srgb, var(--primary) 16%, transparent)',
                  }}
                >
                  <Edit2 className="w-3.5 h-3.5" /> {strings.editLimit}
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="btn h-8 px-2.5 text-xs gap-1.5 rounded-lg"
                  style={{
                    background: 'color-mix(in srgb, var(--danger) 8%, transparent)',
                    color: 'var(--danger)',
                    border: '1px solid color-mix(in srgb, var(--danger) 16%, transparent)',
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" /> {strings.deleteDeck}
                </button>
              </div>
            )}
          </div>

          {isBulkEditOpen && (
            <BulkEditModal
              selectedCount={selectedDeckIds.size}
              strings={strings}
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
          {filteredDecks.map((d) => {
            const isSelected = selectedDeckIds.has(d.id);
            const p = deckProgress[d.id];
            const intro = p?.introduced ?? 0;
            const total = p?.total ?? (d.cardCount ?? 0);
            const pct = total > 0 ? Math.round((intro / total) * 100) : 0;
            const langCfg = d.language ? LANG_CONFIGS[d.language as SupportedLang] : null;

            return (
              <div
                key={d.id}
                className="card-container p-4 flex items-center gap-3 cursor-pointer transition-all duration-150"
                style={{
                  borderColor: isSelected ? 'var(--primary)' : undefined,
                  boxShadow: isSelected
                    ? '0 0 0 1.5px var(--primary), 0 1px 3px color-mix(in srgb, var(--primary) 10%, transparent)'
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
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--primary-foreground)' }} />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {langCfg && (
                      <span className="text-sm flex-shrink-0" title={langCfg.nameEn}>
                        {langCfg.flag}
                      </span>
                    )}
                    <h3 className="font-semibold text-sm truncate" style={{ letterSpacing: '-0.005em' }}>
                      {d.name}
                    </h3>
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--muted)' }}>
                      {intro}/{total}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${pct}%`,
                        background: pct === 100 ? 'var(--success)' : undefined,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                      {strings.dailyNew} {d.newCardLimit ?? 20}
                    </span>
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--muted)' }}>
                      {pct}%
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div
                  className="flex items-center gap-0.5 flex-shrink-0"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    className="btn btn-ghost w-8 h-8 p-0 rounded-lg"
                    onClick={() => onEditDeck(d)}
                    title={strings.editDeck}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="btn btn-ghost w-8 h-8 p-0 rounded-lg"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => onDeleteDeck(d.id)}
                    title={strings.deleteDeck}
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
