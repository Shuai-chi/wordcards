import { useState, useEffect } from 'react';

interface Props {
  currentLimit: number;
  onSave: (limit: number) => void;
  onClose: () => void;
}

export default function SettingsModal({ currentLimit, onSave, onClose }: Props) {
  const [val, setVal] = useState(currentLimit.toString());
  
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="bg-card w-full max-w-sm rounded-xl shadow-lg border border-border p-6 relative" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">全域設定</h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-muted mb-2">每日全域新卡上限 (0-1000)</label>
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

        <div className="flex items-center justify-end gap-3">
          <button className="btn btn-secondary px-6" onClick={onClose}>取消</button>
          <button className="btn btn-primary px-6" onClick={() => onSave(Math.max(0, parseInt(val) || 0))}>儲存</button>
        </div>
      </div>
    </div>
  );
}
