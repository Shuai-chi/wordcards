import { useState, useEffect, useRef } from 'react';
import { Settings, Upload, BookOpen, Sun, Moon, Globe } from 'lucide-react';
import Dashboard from './components/Dashboard';
import LearningView from './components/LearningView';
import FinishedView from './components/FinishedView';
import { DB } from './lib/db';
import { parseCSV } from './lib/csv';
import type { Deck, Report, Card } from './lib/types';
import SettingsModal from './components/SettingsModal';
import EditDeckModal from './components/EditDeckModal';
import { UI_STRINGS, t } from './lib/languages';
import type { UILang } from './lib/languages';

export type ViewState = 'dashboard' | 'learning' | 'finished';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const UI_LANG_OPTIONS: { code: UILang; label: string; flag: string }[] = [
  { code: 'zh-TW', label: '繁中', flag: '🇹🇼' },
  { code: 'en',    label: 'EN',   flag: '🇺🇸' },
  { code: 'ja',    label: '日本語', flag: '🇯🇵' },
  { code: 'ko',    label: '한국어', flag: '🇰🇷' },
  { code: 'de',    label: 'DE',   flag: '🇩🇪' },
  { code: 'es',    label: 'ES',   flag: '🇪🇸' },
  { code: 'fr',    label: 'FR',   flag: '🇫🇷' },
  { code: 'th',    label: 'ไทย',  flag: '🇹🇭' },
];

function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [sessionQueue, setSessionQueue] = useState<Card[]>([]);
  const [seenCardIds, setSeenCardIds] = useState<Set<string>>(new Set());
  const [globalDailyLimit, setGlobalDailyLimit] = useState(30);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('srs_theme') as 'light' | 'dark' | null;
    return saved ?? getSystemTheme();
  });

  // UI language
  const [uiLang, setUiLang] = useState<UILang>(() => {
    return (localStorage.getItem('srs_ui_lang') as UILang) ?? 'zh-TW';
  });

  const strings = UI_STRINGS[uiLang];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('srs_theme', theme);
  }, [theme]);

  // Close lang menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleTheme = () => setTheme(th => (th === 'dark' ? 'light' : 'dark'));

  const switchUiLang = (lang: UILang) => {
    setUiLang(lang);
    localStorage.setItem('srs_ui_lang', lang);
    setIsLangMenuOpen(false);
  };

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
      alert(`${strings.loadFailed}: ${err instanceof Error ? err.message : String(err)}`);
      showToast(strings.loadFailed);
    }
  };

  useEffect(() => { loadData(); }, [view]);

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
        const { cards, skipped, detectedLang } = await parseCSV(file, deckId, groupName);

        const newLimit = Math.min(20, cards.length);
        const newDeck: Deck = {
          id: deckId,
          name: deckName,
          newCardLimit: newLimit,
          cardCount: cards.length,
          language: detectedLang,
        };

        await DB.putDeck(newDeck);
        await DB.putCards(cards);
        successCount++;

        if (skipped > 0) {
          showToast(t(strings, 'skippedCards', { deck: deckName, n: skipped }));
        }
      } catch (err: unknown) {
        alert(`${t(strings, 'importFailed')}: ${file.name} — ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (successCount > 0) {
      showToast(t(strings, 'importSuccess', { n: successCount }));
      loadData();
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const currentUiOption = UI_LANG_OPTIONS.find(o => o.code === uiLang);

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-30 w-full"
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'color-mix(in srgb, var(--background) 85%, transparent)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div className="mx-auto max-w-4xl px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div
            className="flex items-center gap-2.5 cursor-pointer group select-none"
            onClick={() => { setView('dashboard'); loadData(); }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
              style={{ background: 'var(--primary)' }}
            >
              <BookOpen className="w-4 h-4" style={{ color: 'var(--primary-foreground)' }} />
            </div>
            <span className="text-base font-bold tracking-tight" style={{ letterSpacing: '-0.01em' }}>
              WordForge
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">

            {/* Upload */}
            <label
              className="btn btn-ghost w-9 h-9 p-0 rounded-xl cursor-pointer"
              title={strings.importCSV}
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

            {/* Theme */}
            <button
              className="btn btn-ghost w-9 h-9 p-0 rounded-xl"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4" />
                : <Moon className="w-4 h-4" />
              }
            </button>

            {/* UI Language picker */}
            <div className="relative" ref={langMenuRef}>
              <button
                className="btn btn-ghost h-9 px-2.5 rounded-xl gap-1.5 text-xs font-semibold"
                onClick={() => setIsLangMenuOpen(v => !v)}
                title={strings.uiLanguage}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{currentUiOption?.flag}</span>
              </button>

              {isLangMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 rounded-xl overflow-hidden animate-modal-in"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 8px 28px color-mix(in srgb, var(--foreground) 10%, transparent)',
                    minWidth: '10rem',
                    zIndex: 100,
                  }}
                >
                  {UI_LANG_OPTIONS.map(opt => (
                    <button
                      key={opt.code}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors duration-100 text-left"
                      style={{
                        background: uiLang === opt.code ? 'color-mix(in srgb, var(--primary) 8%, var(--card))' : 'transparent',
                        color: uiLang === opt.code ? 'var(--primary)' : 'var(--foreground)',
                      }}
                      onMouseEnter={e => {
                        if (uiLang !== opt.code) (e.currentTarget as HTMLButtonElement).style.background = 'var(--secondary)';
                      }}
                      onMouseLeave={e => {
                        if (uiLang !== opt.code) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      }}
                      onClick={() => switchUiLang(opt.code)}
                    >
                      <span className="text-base">{opt.flag}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Settings */}
            <button
              className="btn btn-ghost w-9 h-9 p-0 rounded-xl"
              onClick={() => setIsSettingsOpen(true)}
              title={strings.settings}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 md:py-8">
        {view === 'dashboard' && (
          <Dashboard
            decks={decks}
            report={report}
            globalLimit={globalDailyLimit}
            strings={strings}
            onStartSession={(queue) => {
              setSessionQueue(queue);
              setSeenCardIds(new Set());
              setView('learning');
            }}
            onEditDeck={(d) => setEditingDeck(d)}
            onDeleteDeck={async (id) => {
              if (!id) { loadData(); return; }
              if (confirm(strings.confirmDelete)) {
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
            strings={strings}
            decks={decks}
            onFinish={() => setView('finished')}
          />
        )}

        {view === 'finished' && (
          <FinishedView
            seenCount={seenCardIds.size}
            strings={strings}
            onBack={() => { setView('dashboard'); loadData(); }}
          />
        )}
      </main>

      {/* ── Toast ── */}
      {toastMsg && (
        <div
          className="fixed bottom-6 left-1/2 z-50 animate-toast px-4 py-2 rounded-full shadow-lg text-sm font-medium"
          style={{
            background: 'var(--foreground)',
            color: 'var(--background)',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* ── Modals ── */}
      {isSettingsOpen && (
        <SettingsModal
          currentLimit={globalDailyLimit}
          strings={strings}
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
          strings={strings}
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
