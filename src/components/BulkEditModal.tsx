import { useState, useEffect } from 'react';
import type { UIStrings } from '../lib/languages';

interface Props {
  selectedCount: number;
  strings: UIStrings;
  onClose: () => void;
  onSave: (limit: number) => void;
}

export default function BulkEditModal({ selectedCount, strings, onClose, onSave }: Props) {
  const [val, setVal] = useState('20');

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel animate-modal-in" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-1" style={{ letterSpacing: '-0.01em' }}>
          {strings.editLimit}
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
          {selectedCount} {strings.selected}
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--muted)' }}>
            {strings.deckLimit}
          </label>
          <input
            type="number"
            className="input"
            value={val}
            onChange={e => setVal(e.target.value)}
            min={0}
            max={100}
            autoFocus
          />
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
