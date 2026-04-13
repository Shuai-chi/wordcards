import { useState, useEffect, useRef } from 'react';
import { Settings, Upload, HardDriveUpload } from 'lucide-react';
import Dashboard from './components/Dashboard';
import LearningView from './components/LearningView';
import FinishedView from './components/FinishedView';
import { DB } from './lib/db';
import { parseCSV } from './lib/csv';
import type { Deck, Report, Card } from './lib/types';
import SettingsModal from './components/SettingsModal';
import EditDeckModal from './components/EditDeckModal';

export type ViewState = 'dashboard' | 'learning' | 'finished';

function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  
  const [sessionQueue, setSessionQueue] = useState<Card[]>([]);
  const [seenCardIds, setSeenCardIds] = useState<Set<string>>(new Set());
  
  const [globalDailyLimit, setGlobalDailyLimit] = useState(30);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);

  // File Upload Reference for Navbar button
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    } catch (e) {
      console.error(e);
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
      <header className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setView('dashboard'); loadData(); }}>
            <div className="bg-primary text-white p-1.5 rounded-lg shadow-sm">
              <HardDriveUpload className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">WordForge</h1>
          </div>
          <div className="flex items-center gap-3">
            <label className="p-2 -mr-1 rounded-full hover:bg-secondary cursor-pointer transition-colors text-muted hover:text-foreground" title="匯入 CSV">
              <Upload className="w-5 h-5" />
              <input type="file" accept=".csv" multiple className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            </label>
            
            <button 
              className="p-2 -mr-2 rounded-full hover:bg-secondary transition-colors text-muted hover:text-foreground"
              onClick={() => setIsSettingsOpen(true)}
              title="設定"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 md:py-8 layout-container">
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
            onFinish={() => {
              setView('finished');
            }}
          />
        )}

        {view === 'finished' && (
          <FinishedView
            seenCount={seenCardIds.size}
            onBack={() => {
              setView('dashboard');
              loadData();
            }}
          />
        )}
      </main>

      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2 rounded-full shadow-lg text-sm transition-all animate-bounce">
          {toastMsg}
        </div>
      )}

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
