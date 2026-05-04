import { useState, useEffect } from 'react';
import type { UIStrings } from '../lib/languages';

interface Props {
  currentLimit: number;
  strings: UIStrings;
  onSave: (limit: number) => void;
  onClose: () => void;
}

export default function SettingsModal({ currentLimit, strings, onSave, onClose }: Props) {
  const [val, setVal] = useState(currentLimit.toString());

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

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

        <div className="mb-6 text-xs text-center" style={{ color: 'var(--muted)', opacity: 0.8 }}>
          {strings.ttsFallbackHint}
        </div>

        <div className="flex items-center justify-end gap-2">
          <button className="btn btn-secondary px-5" onClick={onClose}>
            {strings.cancel}
          </button>
          <button
            className="btn btn-primary px-5"
            onClick={() => onSave(Math.max(0, parseInt(val) || 0))}
          >
            {strings.save}
          </button>
        </div>
      </div>
    </div>
  );
}
