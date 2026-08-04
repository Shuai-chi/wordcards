import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Database, Download, FileUp, Palette, RotateCcw, X } from '../icons/koboyo';
import { useFocusTrap } from '../lib/useFocusTrap';
import { t, type UILang, type UIStrings } from '../lib/languages';
import { PERSONALIZATION_STRINGS } from '../lib/personalizationStrings';
import type { IconAssetRecord } from '../lib/iconAssets';
import { normalizeUiPreferences, type UiPreferencesV1 } from '../lib/uiPreferences';
import {
  areSettingsDraftsEqual,
  type DefinitionLanguagePreference,
  type SettingsDraft,
} from '../lib/settingsDraft';
import ScaleControls from './ScaleControls';
import AppearancePreview from './AppearancePreview';
import IconPreviewDock from './IconPreviewDock';
import IconProfilesPanel from './IconProfilesPanel';
import SettingsCloseConfirm from './SettingsCloseConfirm';
import ColorCommandBar from './ColorCommandBar';
import CloudSyncPanel from './CloudSyncPanel';
import type { CloudSyncState } from '../lib/cloudSyncController';
import { CLOUD_SYNC_STRINGS } from '../lib/cloudSyncStrings';
import type { ConflictResolution } from '../lib/sync';
import {
  THEME_PRESETS,
  getThemeContrastIssues,
  getThemeCore,
  isHexColor,
  normalizeHex,
  resetThemeMode,
  setCustomTheme,
  setThemePreset,
  withAppearanceTimestamp,
  type AppearanceSettingsV1,
  type EffectiveTheme,
  type ThemeCoreTokens,
  type ThemeMode,
} from '../lib/theme';
import {
  DEFAULT_MAX_BACKUP_BYTES,
  downloadPreparedBackup,
  importLocalBackup,
  prepareLocalBackup,
  validateBackupText,
  type BackupEnvelopeV1,
} from '../lib/backup';

type DefLangPref = DefinitionLanguagePreference;

interface Props {
  currentLimit: number;
  defLangPref: DefLangPref;
  appearance: AppearanceSettingsV1;
  systemTheme: EffectiveTheme;
  uiLang: UILang;
  uiPreferences: UiPreferencesV1;
  iconRecords: IconAssetRecord[];
  strings: UIStrings;
  onAppearancePreview: (appearance: AppearanceSettingsV1) => void;
  onUiPreferencesPreview: (settings: UiPreferencesV1) => void;
  onIconRecordsPreview: (records: IconAssetRecord[]) => void;
  onBackupImported: () => void;
  cloudSyncState: CloudSyncState;
  onCloudConnect: () => void | Promise<void>;
  onCloudSyncNow: () => void | Promise<void>;
  onCloudDisconnect: () => void;
  onCloudDelete: () => void | Promise<unknown>;
  onCloudResolveConflict: (choice: ConflictResolution) => void | Promise<void>;
  onSave: (
    limit: number,
    pref: DefLangPref,
    appearance: AppearanceSettingsV1,
    uiPreferences: UiPreferencesV1,
    iconRecords: IconAssetRecord[],
  ) => void | Promise<void>;
  onClose: () => void;
}

interface ColorFieldProps {
  label: string;
  token: keyof ThemeCoreTokens;
  value: string;
  onChange: (value: string) => void;
}

function ColorField({ label, token, value, onChange }: ColorFieldProps) {
  const [textValue, setTextValue] = useState(value);

  useEffect(() => setTextValue(value), [value]);

  const handleTextChange = (next: string) => {
    setTextValue(next);
    const normalized = normalizeHex(next);
    if (normalized) onChange(normalized);
  };

  return (
    <label className="block min-w-0">
      <span className="block text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} color picker`}
          data-testid={`theme-color-${token}-picker`}
          value={value}
          onChange={event => onChange(event.target.value.toUpperCase())}
          className="theme-color-picker"
        />
        <input
          type="text"
          aria-label={`${label} HEX`}
          data-testid={`theme-color-${token}`}
          value={textValue}
          onChange={event => handleTextChange(event.target.value)}
          onBlur={() => {
            if (!isHexColor(textValue)) setTextValue(value);
          }}
          className="input font-mono min-w-0"
          maxLength={7}
          spellCheck={false}
        />
      </div>
    </label>
  );
}

export default function SettingsModal({
  currentLimit,
  defLangPref,
  appearance,
  systemTheme,
  uiLang,
  uiPreferences,
  iconRecords,
  strings,
  onAppearancePreview,
  onUiPreferencesPreview,
  onIconRecordsPreview,
  onBackupImported,
  cloudSyncState,
  onCloudConnect,
  onCloudSyncNow,
  onCloudDisconnect,
  onCloudDelete,
  onCloudResolveConflict,
  onSave,
  onClose,
}: Props) {
  const [val, setVal] = useState(currentLimit.toString());
  const [selectedPref, setSelectedPref] = useState<DefLangPref>(defLangPref);
  const [draftAppearance, setDraftAppearance] = useState<AppearanceSettingsV1>(appearance);
  const [draftUiPreferences, setDraftUiPreferences] = useState<UiPreferencesV1>(uiPreferences);
  const [draftIconRecords, setDraftIconRecords] = useState<IconAssetRecord[]>(iconRecords);
  const [activeTab, setActiveTab] = useState<'appearance' | 'icons' | 'general'>('appearance');
  const [backupBusy, setBackupBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<SettingsDraft>(() => ({
    limit: Math.max(0, Math.min(1000, currentLimit)),
    defLangPref,
    appearance,
    uiPreferences,
    iconRecords,
  }));
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    text: string;
    summary: BackupEnvelopeV1['manifest']['counts'];
  } | null>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useFocusTrap<HTMLDivElement>();

  const previewAppearance = (next: AppearanceSettingsV1) => {
    setDraftAppearance(next);
    onAppearancePreview(next);
  };

  const previewUiPreferences = (next: UiPreferencesV1) => {
    setDraftUiPreferences(next);
    onUiPreferencesPreview(next);
  };

  const previewIconRecords = (next: IconAssetRecord[]) => {
    setDraftIconRecords(next);
    onIconRecordsPreview(next);
  };

  const copy = PERSONALIZATION_STRINGS[uiLang];
  const currentDraft: SettingsDraft = {
    limit: Math.max(0, Math.min(1000, parseInt(val, 10) || 0)),
    defLangPref: selectedPref,
    appearance: draftAppearance,
    uiPreferences: draftUiPreferences,
    iconRecords: draftIconRecords,
  };
  const isDirty = !areSettingsDraftsEqual(savedSnapshot, currentDraft);

  useEffect(() => {
    if (
      iconRecords.length === 0
      || savedSnapshot.iconRecords.length > 0
      || draftIconRecords.length > 0
    ) return;
    setDraftIconRecords(iconRecords);
    setSavedSnapshot(snapshot => ({ ...snapshot, iconRecords }));
  }, [draftIconRecords.length, iconRecords, savedSnapshot.iconRecords.length]);

  const requestClose = useCallback(() => {
    if (isDirty) {
      setCloseConfirmOpen(true);
      return;
    }
    onClose();
  }, [isDirty, onClose]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !closeConfirmOpen) requestClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [closeConfirmOpen, requestClose]);

  const tabs = [
    { id: 'appearance' as const, label: strings.appearance },
    { id: 'icons' as const, label: copy.icons },
    { id: 'general' as const, label: copy.generalAndBackup },
  ];

  const selectTabFromKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    const next = tabs[nextIndex];
    setActiveTab(next.id);
    document.getElementById(`settings-tab-${next.id}`)?.focus();
  };

  const editorMode: EffectiveTheme = draftAppearance.mode === 'system'
    ? systemTheme
    : draftAppearance.mode;
  const selectedTheme = draftAppearance[editorMode];
  const coreTokens = getThemeCore(draftAppearance, editorMode);
  const contrastIssues = getThemeContrastIssues(coreTokens, editorMode);

  const modeOptions: Array<{ value: ThemeMode; label: string }> = [
    { value: 'system', label: strings.themeSystem },
    { value: 'light', label: strings.themeLight },
    { value: 'dark', label: strings.themeDark },
  ];
  const prefOptions: { value: DefLangPref; labelKey: keyof UIStrings }[] = [
    { value: 'deck', labelKey: 'defLangDeck' },
    { value: 'user', labelKey: 'defLangUser' },
    { value: 'bilingual', labelKey: 'defLangBilingual' },
  ];
  const colorFields: Array<{ token: keyof ThemeCoreTokens; label: string }> = [
    { token: 'primary', label: strings.primaryColor },
    { token: 'accent', label: strings.accentColor },
    { token: 'background', label: strings.backgroundColor },
    { token: 'card', label: strings.cardColor },
  ];

  const updateCustomColor = (token: keyof ThemeCoreTokens, value: string) => {
    previewAppearance(setCustomTheme(draftAppearance, editorMode, { ...coreTokens, [token]: value }));
  };

  const applyColorCommand = (patch: Partial<ThemeCoreTokens>) => {
    previewAppearance(setCustomTheme(draftAppearance, editorMode, { ...coreTokens, ...patch }));
  };

  const restoreSavedColors = () => {
    previewAppearance({
      ...draftAppearance,
      [editorMode]: savedSnapshot.appearance[editorMode],
    });
  };

  const handleBackupError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    setBackupMessage(t(strings, 'backupImportError', { error: message }));
  };

  const handleExportBackup = async () => {
    setBackupBusy(true);
    setBackupMessage(null);
    try {
      const prepared = await prepareLocalBackup();
      downloadPreparedBackup(prepared);
      setBackupMessage(strings.backupExported);
    } catch (error) {
      handleBackupError(error);
    } finally {
      setBackupBusy(false);
    }
  };

  const handleImportSelection = async (file: File | undefined) => {
    setPendingImport(null);
    setBackupMessage(null);
    if (!file) return;
    setBackupBusy(true);
    try {
      if (file.size > DEFAULT_MAX_BACKUP_BYTES) throw new Error('file_too_large');
      const text = await file.text();
      const dryRun = await validateBackupText(text);
      setPendingImport({ text, summary: dryRun.summary });
    } catch (error) {
      handleBackupError(error);
    } finally {
      setBackupBusy(false);
      if (backupInputRef.current) backupInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    setBackupBusy(true);
    setBackupMessage(null);
    try {
      await importLocalBackup(pendingImport.text);
      onBackupImported();
    } catch (error) {
      handleBackupError(error);
      setBackupBusy(false);
    }
  };

  const handleSave = async () => {
    setSaveBusy(true);
    setSaveError(null);
    const nextLimit = Math.max(0, Math.min(1000, parseInt(val, 10) || 0));
    const nextAppearance = withAppearanceTimestamp(draftAppearance);
    const nextUiPreferences = normalizeUiPreferences(draftUiPreferences);
    const nextSnapshot: SettingsDraft = {
      limit: nextLimit,
      defLangPref: selectedPref,
      appearance: nextAppearance,
      uiPreferences: nextUiPreferences,
      iconRecords: draftIconRecords,
    };
    try {
      await onSave(
        nextLimit,
        selectedPref,
        nextAppearance,
        nextUiPreferences,
        draftIconRecords,
      );
      setVal(String(nextLimit));
      setDraftAppearance(nextAppearance);
      setDraftUiPreferences(nextUiPreferences);
      setSavedSnapshot(nextSnapshot);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaveBusy(false);
    }
  };

  return (
    <div className="modal-overlay" data-testid="settings-overlay" onClick={requestClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="modal-panel settings-panel animate-modal-in"
        data-preview={activeTab !== 'general'}
        data-testid="settings-panel"
        onClick={event => event.stopPropagation()}
      >
        <header className="settings-fixed-header" data-testid="settings-fixed-header">
          <div className="settings-toolbar">
            <h2 id="settings-title" className="settings-toolbar__title">
              {strings.globalSettings}
            </h2>
            <div className="settings-toolbar__status">
              {saveError && <p role="alert" className="text-xs" style={{ color: 'var(--danger)' }}>{saveError}</p>}
              <span data-testid="settings-save-state" role="status" className="text-xs font-semibold" style={{ color: 'var(--success)' }}>
                {!isDirty ? copy.saved : ''}
              </span>
            </div>
            <button
              className="btn btn-primary settings-toolbar__save"
              data-testid="settings-save"
              disabled={contrastIssues.length > 0 || saveBusy || !isDirty}
              onClick={() => void handleSave()}
            >
              {copy.saveChanges}
            </button>
            <button
              type="button"
              className="settings-close-button"
              data-testid="settings-close"
              aria-label={copy.closeSettings}
              onClick={requestClose}
            >
              <X aria-hidden="true" />
            </button>
          </div>

          <div className="settings-tabs" role="tablist" aria-label={strings.globalSettings}>
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                id={`settings-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`settings-panel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                className="settings-tab"
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={event => selectTabFromKey(event, index)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {activeTab !== 'general' && (
          <div className="settings-preview-dock" data-testid="settings-preview-dock">
            {activeTab === 'appearance' ? (
              <AppearancePreview strings={strings} copy={copy} />
            ) : (
              <IconPreviewDock settings={draftUiPreferences} records={draftIconRecords} strings={strings} />
            )}
          </div>
        )}

        <div className="settings-scroll-region" data-testid="settings-scroll-region">

        {activeTab === 'appearance' && (
        <div role="tabpanel" id="settings-panel-appearance" aria-labelledby="settings-tab-appearance" className="settings-tabpanel">
        <section aria-labelledby="appearance-heading" className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            <h3 id="appearance-heading" className="text-sm font-bold">{strings.appearance}</h3>
          </div>

          <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>
            {strings.themeMode}
          </label>
          <div className="grid grid-cols-3 gap-2 mb-2" role="group" aria-label={strings.themeMode}>
            {modeOptions.map(option => (
              <button
                key={option.value}
                type="button"
                data-testid={`theme-mode-${option.value}`}
                onClick={() => previewAppearance({ ...draftAppearance, mode: option.value })}
                className="px-3 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: draftAppearance.mode === option.value ? 'var(--primary)' : 'var(--secondary)',
                  color: draftAppearance.mode === option.value ? 'var(--primary-foreground)' : 'var(--foreground)',
                  border: '1px solid var(--border)',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          {draftAppearance.mode === 'system' && (
            <p className="text-xs mb-5" style={{ color: 'var(--muted)' }}>
              {t(strings, 'systemThemeHint', {
                mode: systemTheme === 'dark' ? strings.themeDark : strings.themeLight,
              })}
            </p>
          )}

          <div className="flex items-center justify-between gap-4 mb-2 mt-5">
            <label className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
              {strings.recommendedThemes}
            </label>
            <button
              type="button"
              onClick={() => previewAppearance(resetThemeMode(draftAppearance, editorMode))}
              className="inline-flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: 'var(--primary)' }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {strings.resetTheme}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
            {THEME_PRESETS[editorMode].map(preset => {
              const selected = selectedTheme.presetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`theme-preset-${preset.id}`}
                  aria-pressed={selected}
                  onClick={() => previewAppearance(setThemePreset(draftAppearance, editorMode, preset.id))}
                  className="theme-preset-card"
                  style={{
                    background: preset.card,
                    color: editorMode === 'light' ? '#0F172A' : '#F8FAFC',
                    borderColor: selected ? preset.primary : 'var(--border)',
                    boxShadow: selected ? `0 0 0 2px ${preset.primary}` : 'none',
                  }}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-left">{preset.name}</span>
                    {selected && <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                  </span>
                  <span className="flex gap-1.5 mt-3" aria-hidden="true">
                    {[preset.background, preset.card, preset.primary, preset.accent].map((color, index) => (
                      <span
                        key={`${color}-${index}`}
                        className="w-5 h-5 rounded-full"
                        style={{ background: color, border: '1px solid rgba(127,127,127,0.35)' }}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
              {strings.customColors}
            </span>
            {selectedTheme.presetId === 'custom' && (
              <span className="badge text-[10px]" style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}>
                {strings.customTheme}
              </span>
            )}
          </div>
          <ColorCommandBar
            mode={editorMode}
            tokens={coreTokens}
            strings={copy}
            onApply={applyColorCommand}
            onRestore={restoreSavedColors}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {colorFields.map(field => (
              <ColorField
                key={field.token}
                label={field.label}
                token={field.token}
                value={coreTokens[field.token]}
                onChange={value => updateCustomColor(field.token, value)}
              />
            ))}
          </div>

          {contrastIssues.length > 0 && (
            <div
              role="alert"
              data-testid="theme-contrast-warning"
              className="mt-4 rounded-xl p-3 text-xs font-medium"
              style={{
                color: 'var(--danger)',
                background: 'color-mix(in srgb, var(--danger) 10%, var(--card))',
                border: '1px solid color-mix(in srgb, var(--danger) 28%, var(--border))',
              }}
            >
              <p>{strings.contrastWarning}</p>
              <p className="font-mono mt-1 break-words">{contrastIssues.join(', ')}</p>
            </div>
          )}
        </section>
        <ScaleControls
          settings={draftUiPreferences}
          copy={copy}
          onChange={previewUiPreferences}
        />
        </div>
        )}

        {activeTab === 'icons' && (
          <div role="tabpanel" id="settings-panel-icons" aria-labelledby="settings-tab-icons" className="settings-tabpanel">
            <IconProfilesPanel
              settings={draftUiPreferences}
              records={draftIconRecords}
              strings={strings}
              copy={copy}
              onSettingsChange={previewUiPreferences}
              onRecordsChange={previewIconRecords}
            />
          </div>
        )}

        {activeTab === 'general' && (
        <div role="tabpanel" id="settings-panel-general" aria-labelledby="settings-tab-general" className="settings-tabpanel">
        <section className="pt-6 mb-6" style={{ borderTop: '1px solid var(--border)' }}>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--muted)' }}>
            {strings.globalLimit}
          </label>
          <input
            type="number"
            className="input"
            value={val}
            onChange={event => setVal(event.target.value)}
            min={0}
            max={1000}
          />
        </section>

        <section className="mb-6">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--muted)' }}>
            {strings.definitionDisplay}
          </label>
          <div className="flex gap-2 flex-wrap">
            {prefOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedPref(option.value)}
                className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                style={{
                  background: selectedPref === option.value ? 'var(--primary)' : 'var(--card)',
                  color: selectedPref === option.value ? 'var(--primary-foreground)' : 'var(--foreground)',
                  border: '1px solid var(--border)',
                }}
              >
                {strings[option.labelKey]}
              </button>
            ))}
          </div>
          {selectedPref === 'bilingual' && (
            <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
              {strings.defLangBilingualHint}
            </p>
          )}
        </section>

        <section className="pt-6 mb-6" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4" style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <h3 className="text-sm font-bold">{strings.dataBackup}</h3>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
            {strings.backupDescription}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-secondary px-4"
              data-testid="backup-export"
              disabled={backupBusy}
              onClick={handleExportBackup}
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              {strings.exportBackup}
            </button>
            <label className="btn btn-secondary px-4 cursor-pointer">
              <FileUp className="w-4 h-4" aria-hidden="true" />
              {strings.importBackup}
              <input
                ref={backupInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                data-testid="backup-import-input"
                disabled={backupBusy}
                onChange={event => handleImportSelection(event.target.files?.[0])}
              />
            </label>
          </div>

          {pendingImport && (
            <div
              data-testid="backup-import-summary"
              className="mt-4 rounded-xl p-3 text-xs"
              style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}
            >
              <p className="font-semibold">
                {t(strings, 'backupSummary', pendingImport.summary)}
              </p>
              <p className="mt-1" style={{ color: 'var(--muted)' }}>
                {strings.backupImportWarning}
              </p>
              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  className="btn btn-secondary px-3"
                  onClick={() => setPendingImport(null)}
                  disabled={backupBusy}
                >
                  {strings.cancel}
                </button>
                <button
                  type="button"
                  className="btn btn-primary px-3"
                  data-testid="backup-import-confirm"
                  onClick={handleConfirmImport}
                  disabled={backupBusy}
                >
                  {strings.restoreBackup}
                </button>
              </div>
            </div>
          )}

          {backupMessage && (
            <p role="status" className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
              {backupMessage}
            </p>
          )}
        </section>

        <CloudSyncPanel
          state={cloudSyncState}
          copy={CLOUD_SYNC_STRINGS[uiLang]}
          uiLang={uiLang}
          onConnect={onCloudConnect}
          onSyncNow={onCloudSyncNow}
          onDisconnect={onCloudDisconnect}
          onDeleteCloudData={onCloudDelete}
          onExportLocal={handleExportBackup}
          onResolveConflict={onCloudResolveConflict}
        />

        <div className="mb-6 text-xs text-center" style={{ color: 'var(--muted)', opacity: 0.8 }}>
          {strings.ttsFallbackHint}
        </div>
        </div>
        )}
        </div>
      </div>
      {closeConfirmOpen && (
        <SettingsCloseConfirm
          title={copy.unsavedTitle}
          description={copy.unsavedDescription}
          returnLabel={copy.returnToEditing}
          discardLabel={copy.discardAndClose}
          onReturn={() => setCloseConfirmOpen(false)}
          onDiscard={onClose}
        />
      )}
    </div>
  );
}
