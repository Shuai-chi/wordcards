import { useCallback, useState, useEffect, useRef } from 'react';
import { Settings, Upload, BookOpen, Sun, Moon, Globe } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Home from './components/Home';
import LearningView from './components/LearningView';
import ListeningMode from './components/ListeningMode';
import FinishedView from './components/FinishedView';
import { DB } from './lib/db';
import { parseCSV } from './lib/csv';
import type { Deck, DeckType, Report, Card } from './lib/types';
import SettingsModal from './components/SettingsModal';
import EditDeckModal from './components/EditDeckModal';
import { UI_STRINGS, t } from './lib/languages';
import type { UILang } from './lib/languages';
import {
  applyAppearance,
  getEffectiveTheme,
  getSystemTheme,
  readAppearanceSettings,
  saveAppearanceSettings,
  withAppearanceTimestamp,
  type AppearanceSettingsV1,
  type EffectiveTheme,
} from './lib/theme';
import {
  applyUiPreferences,
  normalizeUiPreferences,
  readUiPreferences,
  saveUiPreferences,
  type UiPreferencesV1,
} from './lib/uiPreferences';
import type { ActiveIconAssets, IconAssetRecord } from './lib/iconAssets';
import {
  createGoogleDriveCloudSyncController,
  type CloudSyncController,
} from './lib/cloudSyncController';
import { LISTENING_STRINGS } from './lib/listeningStrings';

export type ViewState = 'home' | 'dashboard' | 'learning' | 'listening' | 'finished';

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
  const [view, setView] = useState<ViewState>('home');
  const [sectionMode, setSectionMode] = useState<DeckType>('vocab');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [sessionQueue, setSessionQueue] = useState<Card[]>([]);
  const [listeningDeckIds, setListeningDeckIds] = useState<string[]>([]);
  const [seenCardIds, setSeenCardIds] = useState<Set<string>>(new Set());
  const [globalDailyLimit, setGlobalDailyLimit] = useState(30);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Appearance settings: saved state and a non-persistent live preview for the settings modal.
  const [appearance, setAppearance] = useState<AppearanceSettingsV1>(() => readAppearanceSettings());
  const [appearancePreview, setAppearancePreview] = useState<AppearanceSettingsV1 | null>(null);
  const [systemTheme, setSystemTheme] = useState<EffectiveTheme>(() => getSystemTheme());
  const [uiPreferences, setUiPreferences] = useState<UiPreferencesV1>(() => readUiPreferences());
  const [uiPreferencesPreview, setUiPreferencesPreview] = useState<UiPreferencesV1 | null>(null);
  const [iconRecords, setIconRecords] = useState<IconAssetRecord[]>([]);
  const [iconRecordsPreview, setIconRecordsPreview] = useState<IconAssetRecord[] | null>(null);
  const [activeIconAssets, setActiveIconAssets] = useState<ActiveIconAssets>({});

  // UI language
  const [uiLang, setUiLang] = useState<UILang>(() => {
    return (localStorage.getItem('srs_ui_lang') as UILang) ?? 'zh-TW';
  });

  // Definition language display preference
  type DefLangPref = 'deck' | 'user' | 'bilingual';
  const [defLangPref, setDefLangPref] = useState<DefLangPref>(() => {
    return (localStorage.getItem('srs_def_lang_pref') as DefLangPref) ?? 'deck';
  });

  const strings = UI_STRINGS[uiLang];
  const listeningStrings = LISTENING_STRINGS[uiLang];

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMsg(msg);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
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
  }, [showToast, strings.loadFailed]);

  // Re-reads everything a synced/imported snapshot can touch (decks, cards,
  // reports via loadData; icons, appearance, ui preferences, ui language and
  // definition-language preference directly) so applying remote or imported
  // data can refresh the running app in place, without a page reload.
  // Reloading here would also discard the cloud-sync controller below and
  // its in-memory OAuth token, dropping a passive client's connection the
  // moment another device's change lands.
  const refreshSyncedState = useCallback(async () => {
    await loadData();
    try {
      setIconRecords(await DB.getAllIconAssets());
    } catch (error) {
      console.error('Failed to reload custom icons after sync', error);
    }
    setAppearance(readAppearanceSettings());
    setUiPreferences(readUiPreferences());
    const lang = localStorage.getItem('srs_ui_lang');
    if (lang) setUiLang(lang as UILang);
    const pref = localStorage.getItem('srs_def_lang_pref');
    if (pref) setDefLangPref(pref as DefLangPref);
  }, [loadData]);

  // onRemoteApplied only bumps a counter (never touches a ref or closes
  // over refreshSyncedState) so the one-time useState initializer below
  // stays trivially free of the "ref access during render" concern; the
  // actual refresh runs in the effect further down, in response to the tick.
  const [remoteAppliedTick, setRemoteAppliedTick] = useState(0);
  const isFirstRemoteAppliedTick = useRef(true);

  const [cloudSyncController] = useState<CloudSyncController>(() => (
    createGoogleDriveCloudSyncController({
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
      onRemoteApplied: () => setRemoteAppliedTick(tick => tick + 1),
    })
  ));
  const [cloudSyncState, setCloudSyncState] = useState(() => cloudSyncController.getState());

  useEffect(() => {
    if (isFirstRemoteAppliedTick.current) {
      isFirstRemoteAppliedTick.current = false;
      return;
    }
    void refreshSyncedState();
  }, [remoteAppliedTick, refreshSyncedState]);

  const displayedAppearance = appearancePreview ?? appearance;
  const displayedUiPreferences = uiPreferencesPreview ?? uiPreferences;
  const displayedIconRecords = iconRecordsPreview ?? iconRecords;
  const effectiveTheme = getEffectiveTheme(displayedAppearance, systemTheme);

  useEffect(() => {
    const unsubscribe = cloudSyncController.subscribe(setCloudSyncState);
    const handleOnline = () => cloudSyncController.handleOnline();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') cloudSyncController.handleForeground();
    };
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [cloudSyncController]);

  useEffect(() => {
    applyAppearance(displayedAppearance, systemTheme);
  }, [displayedAppearance, systemTheme]);

  useEffect(() => {
    saveAppearanceSettings(appearance);
  }, [appearance]);

  useEffect(() => {
    applyUiPreferences(displayedUiPreferences);
  }, [displayedUiPreferences]);

  useEffect(() => {
    saveUiPreferences(uiPreferences);
  }, [uiPreferences]);

  useEffect(() => {
    let cancelled = false;
    void DB.getAllIconAssets()
      .then(records => { if (!cancelled) setIconRecords(records); })
      .catch(error => console.error('Failed to load custom icons', error));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const next: ActiveIconAssets = {};
    const urls: string[] = [];
    for (const record of displayedIconRecords) {
      if (record.profileId !== displayedUiPreferences.activeIconProfileId) continue;
      const url = URL.createObjectURL(record.blob);
      urls.push(url);
      next[record.slot] = {
        url,
        fit: record.fit,
        zoom: record.zoom,
        offsetX: record.offsetX,
        offsetY: record.offsetY,
      };
    }
    setActiveIconAssets(next);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [displayedIconRecords, displayedUiPreferences.activeIconProfileId]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => setSystemTheme(event.matches ? 'dark' : 'light');
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

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

  const toggleTheme = () => {
    setAppearance(current => withAppearanceTimestamp({
      ...current,
      mode: effectiveTheme === 'dark' ? 'light' : 'dark',
    }));
    cloudSyncController.notifyLocalChange();
  };

  const switchUiLang = (lang: UILang) => {
    setUiLang(lang);
    localStorage.setItem('srs_ui_lang', lang);
    setIsLangMenuOpen(false);
    cloudSyncController.notifyLocalChange();
  };

  useEffect(() => { loadData(); }, [loadData, view]);

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

      let deckInserted = false;
      let deckId = '';
      try {
        deckId = 'deck-' + Date.now() + '-' + i;
        const { cards, skipped, detectedLang, detectedType } = await parseCSV(file, deckId, groupName);

        const newLimit = Math.min(20, cards.length);
        const newDeck: Deck = {
          id: deckId,
          name: deckName,
          newCardLimit: newLimit,
          cardCount: cards.length,
          language: detectedLang,
          deckType: detectedType,
        };

        await DB.putDeck(newDeck);
        deckInserted = true;
        await DB.putCards(cards);
        successCount++;

        if (skipped > 0) {
          showToast(t(strings, 'skippedCards', { deck: deckName, n: skipped }));
        }
      } catch (err: unknown) {
        if (deckInserted && deckId) {
          await DB.deleteDeck(deckId);
        }
        alert(`${t(strings, 'importFailed')}: ${file.name} — ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (successCount > 0) {
      showToast(t(strings, 'importSuccess', { n: successCount }));
      loadData();
      cloudSyncController.notifyLocalChange();
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const currentUiOption = UI_LANG_OPTIONS.find(o => o.code === uiLang);

  const openSection = (mode: DeckType) => {
    const allowedDeckIds = new Set(
      decks.filter(deck => (deck.deckType ?? 'vocab') === mode).map(deck => deck.id)
    );
    try {
      const savedSelection = JSON.parse(localStorage.getItem('srs_selected_decks') ?? '[]') as string[];
      localStorage.setItem(
        'srs_selected_decks',
        JSON.stringify(savedSelection.filter(id => allowedDeckIds.has(id)))
      );
    } catch {
      localStorage.setItem('srs_selected_decks', JSON.stringify([]));
    }
    setSectionMode(mode);
    setView('dashboard');
    cloudSyncController.notifyLocalChange();
  };

  return (
    <div className="app-shell min-h-screen flex flex-col font-sans" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>

      {/* ── Header ── */}
      <header
        className="app-header sticky top-0 z-30 w-full"
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'color-mix(in srgb, var(--background) 85%, transparent)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div className="app-header__inner mx-auto max-w-4xl px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div
            className="flex items-center gap-2.5 cursor-pointer group select-none"
            onClick={() => { setView('home'); loadData(); }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
              style={{ background: 'var(--primary)' }}
            >
              <BookOpen className="w-4 h-4" style={{ color: 'var(--primary-foreground)' }} />
            </div>
            <span className="brand-label text-base font-bold tracking-tight" style={{ letterSpacing: '-0.01em' }}>
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
              title={effectiveTheme === 'dark' ? strings.themeLight : strings.themeDark}
            >
              {effectiveTheme === 'dark'
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
              onClick={() => {
                setAppearancePreview(null);
                setUiPreferencesPreview(null);
                setIconRecordsPreview(null);
                setIsSettingsOpen(true);
              }}
              title={strings.settings}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="app-main flex-1 w-full max-w-4xl mx-auto px-4 py-6 md:py-8">
        {view === 'home' && (
          <Home
            decks={decks}
            strings={strings}
            iconAssets={activeIconAssets}
            onSelectMode={openSection}
          />
        )}

        {view === 'dashboard' && (
          <Dashboard
            decks={decks.filter(d => (d.deckType ?? 'vocab') === sectionMode)}
            report={report}
            globalLimit={globalDailyLimit}
            strings={strings}
            listeningStrings={listeningStrings}
            iconAssets={activeIconAssets}
            onStartSession={(queue) => {
              setSessionQueue(queue);
              setSeenCardIds(new Set());
              setView('learning');
            }}
            onStartListening={(deckIds) => {
              setListeningDeckIds(deckIds);
              setView('listening');
            }}
            onEditDeck={(d) => setEditingDeck(d)}
            onDataChanged={() => cloudSyncController.notifyLocalChange()}
            onDeleteDeck={async (id) => {
              if (!id) {
                loadData();
                cloudSyncController.notifyLocalChange();
                return;
              }
              if (confirm(strings.confirmDelete)) {
                await DB.deleteDeck(id);
                loadData();
                cloudSyncController.notifyLocalChange();
              }
            }}
          />
        )}

        {view === 'learning' && (
          <LearningView
            queue={sessionQueue}
            setQueue={setSessionQueue}
            onCardSeen={(id) => setSeenCardIds(prev => { const s = new Set(prev); s.add(id); return s; })}
            strings={strings}
            decks={decks}
            onFinish={() => setView('finished')}
            onDataChanged={() => cloudSyncController.notifyLocalChange()}
            uiLang={uiLang}
            defLangPref={defLangPref}
          />
        )}

        {view === 'listening' && (
          <ListeningMode
            mode={sectionMode}
            deckIds={listeningDeckIds}
            decks={decks}
            globalLimit={globalDailyLimit}
            uiLang={uiLang}
            onBack={() => setView('dashboard')}
            onPreferencesChanged={() => cloudSyncController.notifyLocalChange()}
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
          defLangPref={defLangPref}
          appearance={appearance}
          systemTheme={systemTheme}
          uiLang={uiLang}
          uiPreferences={uiPreferences}
          iconRecords={iconRecords}
          strings={strings}
          onAppearancePreview={setAppearancePreview}
          onUiPreferencesPreview={setUiPreferencesPreview}
          onIconRecordsPreview={setIconRecordsPreview}
          onBackupImported={() => {
            void refreshSyncedState();
            setAppearancePreview(null);
            setUiPreferencesPreview(null);
            setIconRecordsPreview(null);
            setIsSettingsOpen(false);
          }}
          cloudSyncState={cloudSyncState}
          onCloudConnect={() => cloudSyncController.connect()}
          onCloudSyncNow={() => cloudSyncController.syncNow()}
          onCloudDisconnect={() => cloudSyncController.disconnect()}
          onCloudDelete={() => cloudSyncController.deleteCloudData()}
          onCloudResolveConflict={choice => (
            cloudSyncController.resolveConflict(choice)
          )}
          onSave={async (limit, pref, nextAppearance, nextUiPreferences, nextIconRecords) => {
            const normalizedUiPreferences = normalizeUiPreferences(nextUiPreferences);
            saveUiPreferences(normalizedUiPreferences);
            try {
              await DB.replaceAllIconAssets(nextIconRecords);
            } catch (error) {
              saveUiPreferences(uiPreferences);
              throw error;
            }
            setGlobalDailyLimit(limit);
            localStorage.setItem('srs_global_limit', limit.toString());
            setDefLangPref(pref);
            localStorage.setItem('srs_def_lang_pref', pref);
            setAppearance(nextAppearance);
            setUiPreferences(normalizedUiPreferences);
            setIconRecords(nextIconRecords);
            setAppearancePreview(null);
            setUiPreferencesPreview(null);
            setIconRecordsPreview(null);
            cloudSyncController.notifyLocalChange();
          }}
          onClose={() => {
            setAppearancePreview(null);
            setUiPreferencesPreview(null);
            setIconRecordsPreview(null);
            setIsSettingsOpen(false);
          }}
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
            cloudSyncController.notifyLocalChange();
          }}
          onClose={() => setEditingDeck(null)}
        />
      )}
    </div>
  );
}

export default App;
