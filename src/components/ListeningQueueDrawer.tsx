import { useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { ListeningPlaylistItem } from '../lib/listeningPlaylist';

interface ListeningQueueDrawerProps {
  open: boolean;
  items: ListeningPlaylistItem[];
  currentIndex: number;
  title: string;
  closeLabel: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export default function ListeningQueueDrawer({
  open,
  items,
  currentIndex,
  title,
  closeLabel,
  triggerRef,
  onSelect,
  onClose,
}: ListeningQueueDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    onClose();
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, [onClose, triggerRef]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])',
      )];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [close, open]);

  if (!open) return null;

  return (
    <div className="listening-drawer-overlay" onMouseDown={event => {
      if (event.target === event.currentTarget) close();
    }}>
      <div
        ref={panelRef}
        className="listening-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="listening-drawer__header">
          <h2>{title}</h2>
          <button
            ref={closeRef}
            type="button"
            className="btn btn-ghost listening-icon-button"
            aria-label={closeLabel}
            title={closeLabel}
            onClick={close}
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="listening-drawer__list">
          {items.map((item, index) => (
            <button
              key={item.card.id}
              type="button"
              data-testid={`listening-queue-item-${index}`}
              className="listening-queue-item"
              aria-current={index === currentIndex ? 'true' : undefined}
              onClick={() => {
                onSelect(index);
                close();
              }}
            >
              <span>{index + 1}</span>
              <strong>{item.card.front}</strong>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
