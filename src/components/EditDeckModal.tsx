import { useState, useEffect } from 'react';
import type { Deck } from '../lib/types';

interface Props {
  deck: Deck;
  onSave: (deck: Deck) => void;
  onClose: () => void;
}

export default function EditDeckModal({ deck, onSave, onClose }: Props) {
  const [name, setName] = useState(deck.name);
  const [limit, setLimit] = useState((deck.newCardLimit ?? 20).toString());

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="bg-card w-full max-w-sm rounded-xl shadow-lg border border-border p-6 relative" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">編輯套牌</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-muted mb-2">套牌名稱</label>
          <input 
            type="text" 
            className="input" 
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-muted mb-2">此套牌每日新卡上限</label>
          <input 
            type="number" 
            className="input" 
            value={limit}
            onChange={e => setLimit(e.target.value)}
            min={0}
            max={100}
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <button className="btn btn-secondary px-6" onClick={onClose}>取消</button>
          <button className="btn btn-primary px-6" onClick={() => {
            onSave({
              ...deck,
              name: name.trim() || deck.name,
              newCardLimit: Math.max(0, parseInt(limit) || 0)
            });
          }}>儲存</button>
        </div>
      </div>
    </div>
  );
}
