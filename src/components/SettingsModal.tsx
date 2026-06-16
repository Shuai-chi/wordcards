import { useState, useEffect } from 'react';
import type { UIStrings } from '../lib/languages';

type DefLangPref = 'deck' | 'user' | 'bilingual';

interface Props {
  currentLimit: number;
  defLangPref: DefLangPref;
  strings: UIStrings;
  onSave: (limit: number) => void;
  onDefLangPrefSave: (pref: DefLangPref) => void;
  onClose: () => void;
}

export default function SettingsModal({ currentLimit, defLangPref, strings, onSave, onDefLangPrefSave, onClose }: Props) {
  const [val, setVal] = useState(currentLimit.toString());
  const [selectedPref, setSelectedPref] = useState<DefLangPref>(defLangPref);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const prefOptions: { value: DefLangPref; labelKey: keyof UIStrings }[] = [
    { value: 'deck', labelKey: 'defLangDeck' },
    { value: 'user', labelKey: 'defLangUser' },
    { value: 'bilingual', labelKey: 'defLangBilingual' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel animate-modal-in" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-5" style={{ letterSpacing: '-0.01em' }}>
          {strings.globalSettings}
        </h2>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--muted)' }}>
            {strings.globalLimit}
          </label>
          <input
            type="number"
            className="input"
            value={val}
            onChange={e => setVal(e.target.value)}
            min={0}
            max={1000}
            autoFocus
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--muted)' }}>
            {strings.definitionDisplay}
          </label>
          <div className="flex gap-2 flex-wrap">
            {prefOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSelectedPref(opt.value)}
                className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                style={{
                  background: selectedPref === opt.value ? 'var(--primary)' : 'var(--card)',
                  color: selectedPref === opt.value ? 'var(--primary-foreground)' : 'var(--foreground)',
                  border: '1px solid var(--border)',
                }}
              >
                {strings[opt.labelKey]}
              </button>
            ))}
          </div>
          {selectedPref === 'bilingual' && (
            <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
              {strings.defLangBilingualHint}
            </p>
          )}
        </div>

        <div className="mb-6 text-xs text-center" style={{ color: 'var(--muted)', opacity: 0.8 }}>
          {strings.ttsFallbackHint}
        </div>

        <div className="flex items-center justify-end gap-2">
          <button className="btn btn-secondary px-5" onClick={onClose}>
            {strings.cancel}
          </button>
          <button
            className="btn btn-primary px-5"
            onClick={() => {
              onSave(Math.max(0, parseInt(val) || 0));
              onDefLangPrefSave(selectedPref);
            }}
          >
            {strings.save}
          </button>
        </div>
      </div>
    </div>
  );
}
