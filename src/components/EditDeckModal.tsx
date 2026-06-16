import { useState, useEffect } from 'react';
import type { Deck } from '../lib/types';
import type { UIStrings } from '../lib/languages';

interface Props {
  deck: Deck;
  strings: UIStrings;
  onSave: (deck: Deck) => void;
  onClose: () => void;
}

export default function EditDeckModal({ deck, strings, onSave, onClose }: Props) {
  const [name, setName] = useState(deck.name);
  const [limit, setLimit] = useState((deck.newCardLimit ?? 20).toString());

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel animate-modal-in" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-5" style={{ letterSpacing: '-0.01em' }}>
          {strings.editDeck}
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--muted)' }}>
            {strings.deckName}
          </label>
          <input
            type="text"
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--muted)' }}>
            {strings.deckLimit}
          </label>
          <input
            type="number"
            className="input"
            value={limit}
            onChange={e => setLimit(e.target.value)}
            min={0}
            max={100}
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <button className="btn btn-secondary px-5" onClick={onClose}>
            {strings.cancel}
          </button>
          <button
            className="btn btn-primary px-5"
            onClick={() => onSave({
              ...deck,
              name: name.trim() || deck.name,
              newCardLimit: Math.max(0, parseInt(limit) || 0),
            })}
          >
            {strings.save}
          </button>
        </div>
      </div>
    </div>
  );
}
