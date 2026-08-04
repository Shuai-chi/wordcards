import { useEffect } from 'react';
import { AlertTriangle } from '../icons/koboyo';
import { useFocusTrap } from '../lib/useFocusTrap';

interface Props {
  title: string;
  description: string;
  returnLabel: string;
  discardLabel: string;
  onReturn: () => void;
  onDiscard: () => void;
}

export default function SettingsCloseConfirm({
  title,
  description,
  returnLabel,
  discardLabel,
  onReturn,
  onDiscard,
}: Props) {
  const dialogRef = useFocusTrap<HTMLDivElement>();

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onReturn();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onReturn]);

  return (
    <div
      className="settings-confirm-overlay"
      onClick={event => {
        event.stopPropagation();
        onReturn();
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="settings-unsaved-title"
        aria-describedby="settings-unsaved-description"
        className="settings-confirm-dialog animate-modal-in"
        onClick={event => event.stopPropagation()}
      >
        <span className="settings-confirm-dialog__icon" aria-hidden="true">
          <AlertTriangle />
        </span>
        <div className="min-w-0">
          <h2 id="settings-unsaved-title" className="text-base font-bold">{title}</h2>
          <p id="settings-unsaved-description" className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            {description}
          </p>
        </div>
        <div className="settings-confirm-dialog__actions">
          <button
            type="button"
            className="btn btn-secondary px-4"
            data-testid="settings-return-editing"
            onClick={onReturn}
          >
            {returnLabel}
          </button>
          <button
            type="button"
            className="btn px-4"
            data-testid="settings-discard-close"
            style={{ color: '#FFFFFF', background: 'var(--danger)' }}
            onClick={onDiscard}
          >
            {discardLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
