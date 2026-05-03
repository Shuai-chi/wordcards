import { useState, useEffect, useRef } from 'react';
import { Settings, Upload, BookOpen, Sun, Moon } from 'lucide-react';
import Dashboard from './components/Dashboard';
import LearningView from './components/LearningView';
import FinishedView from './components/FinishedView';
import { DB } from './lib/db';
import { parseCSV } from './lib/csv';
import type { Deck, Report, Card } from './lib/types';
import SettingsModal from './components/SettingsModal';
import EditDeckModal from './components/EditDeckModal';

export type ViewState = 'dashboard' | 'learning' | 'finished';

// Detect system preference
function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [report, setReport] = useState<Report | null>(null);

  const [sessionQueue, setSessionQueue] = useState<Card[]>([]);
  const [seenCardIds, setSeenCardIds] = useState<Set<string>>(new Set());

  const [globalDailyLimit, setGlobalDailyLimit] = useState(30);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Theme management
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('srs_theme') as 'light' | 'dark' | null;
    return saved ?? getSystemTheme();
  });

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply theme to <html> element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('srs_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadData = async () => {
    try {
      const savedLimit = localStorage.getItem('srs_global_limit');
      if (savedLimit) setGlobalDailyLimit(parseInt(savedLimit, 10));

      const _decks = await DB.getAllDecks();
      setDecks(_decks);

      const r = await DB.getTodayReport();
      setReport(r);
    } catch (err) {
      console.error(err);
      alert(`載入資料失敗 (資料庫錯誤): ${err instanceof Error ? err.message : String(err)}\n\n請確保您沒有開啟無痕模式，或清除 Safari/Chrome 的網站資料。`);
      showToast('載入資料失敗');
    }
  };

  useEffect(() => {
    loadData();
  }, [view]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let deckName = file.name.replace('.csv', '');
      const groupMatch = deckName.match(/\[(.*?)\]/);
      let groupName = '未分類';
      if (groupMatch) {
        groupName = groupMatch[1];
        deckName = deckName.replace(groupMatch[0], '').trim();
      }

      try {
        const deckId = 'deck-' + Date.now() + '-' + i;
        const { cards, skipped } = await parseCSV(file, deckId, groupName);

        const newLimit = Math.min(20, cards.length);
        const newDeck: Deck = { id: deckId, name: deckName, newCardLimit: newLimit, cardCount: cards.length };

        await DB.putDeck(newDeck);
        await DB.putCards(cards);
        successCount++;
        if (skipped > 0) showToast(`${deckName} 跳過了 ${skipped} 張格式錯誤卡片`);
      } catch (err: unknown) {
        alert(`${file.name} 匯入失敗: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (successCount > 0) {
      showToast(`成功匯入 ${successCount} 個套牌`);
      loadData();
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 w-full border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div
            className="flex items-center gap-2.5 cursor-pointer group select-none"
            onClick={() => { setView('dashboard'); loadData(); }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-transform group-hover:scale-105"
              style={{ background: 'var(--primary)' }}
            >
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-base font-bold tracking-tight">WordForge</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Upload CSV */}
            <label
              className="btn btn-ghost w-9 h-9 p-0 rounded-lg cursor-pointer"
              title="匯入 CSV 套牌"
            >
              <Upload className="w-4 h-4" />
              <input
                type="file"
                accept=".csv"
                multiple
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
            </label>

            {/* Theme Toggle */}
            <button
              className="btn btn-ghost w-9 h-9 p-0 rounded-lg"
              onClick={toggleTheme}
              title={theme === 'dark' ? '切換淺色模式' : '切換深色模式'}
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4" />
                : <Moon className="w-4 h-4" />
              }
            </button>

            {/* Settings */}
            <button
              className="btn btn-ghost w-9 h-9 p-0 rounded-lg"
              onClick={() => setIsSettingsOpen(true)}
              title="設定"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 md:py-8">
        {view === 'dashboard' && (
          <Dashboard
            decks={decks}
            report={report}
            globalLimit={globalDailyLimit}
            onStartSession={(queue) => {
              setSessionQueue(queue);
              setSeenCardIds(new Set());
              setView('learning');
            }}
            onEditDeck={(d) => setEditingDeck(d)}
            onDeleteDeck={async (id) => {
              if (!id) { loadData(); return; }
              if (confirm('確定要刪除這組套牌嗎？')) {
                await DB.deleteDeck(id);
                loadData();
              }
            }}
          />
        )}

        {view === 'learning' && (
          <LearningView
            queue={sessionQueue}
            setQueue={setSessionQueue}
            seenIds={seenCardIds}
            onFinish={() => setView('finished')}
          />
        )}

        {view === 'finished' && (
          <FinishedView
            seenCount={seenCardIds.size}
            onBack={() => { setView('dashboard'); loadData(); }}
          />
        )}
      </main>

      {/* ── Toast ── */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 z-50 animate-toast px-4 py-2 rounded-full shadow-lg text-sm font-medium"
          style={{
            background: 'var(--foreground)',
            color: 'var(--background)',
            transform: 'translateX(-50%)',
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* ── Modals ── */}
      {isSettingsOpen && (
        <SettingsModal
          currentLimit={globalDailyLimit}
          onSave={(limit) => {
            setGlobalDailyLimit(limit);
            localStorage.setItem('srs_global_limit', limit.toString());
            setIsSettingsOpen(false);
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {editingDeck && (
        <EditDeckModal
          deck={editingDeck}
          onSave={async (updated) => {
            await DB.putDeck(updated);
            setEditingDeck(null);
            loadData();
          }}
          onClose={() => setEditingDeck(null)}
        />
      )}
    </div>
  );
}

export default App;
