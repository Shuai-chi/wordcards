import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Cloud, CloudOff, Download, RefreshCw, Trash2, Unplug } from '../icons/koboyo';
import type { CloudSyncState } from '../lib/cloudSyncController';
import type { CloudSyncStrings } from '../lib/cloudSyncStrings';
import type { UILang } from '../lib/languages';
import type { ConflictResolution } from '../lib/sync';

interface Props {
  state: CloudSyncState;
  copy: CloudSyncStrings;
  uiLang: UILang;
  onConnect: () => void | Promise<void>;
  onSyncNow: () => void | Promise<void>;
  onDisconnect: () => void;
  onDeleteCloudData: () => void | Promise<unknown>;
  onExportLocal: () => void | Promise<void>;
  onResolveConflict: (choice: ConflictResolution) => void | Promise<void>;
}

function statusIcon(status: CloudSyncState['status'], busy: boolean) {
  const className = `w-3.5 h-3.5${busy ? ' animate-spin' : ''}`;
  if (status === 'ready') {
    return <CheckCircle2 className={className} aria-hidden="true" />;
  }
  if (status === 'offline') {
    return <CloudOff className={className} aria-hidden="true" />;
  }
  if (status === 'conflict' || status === 'error') {
    return <AlertTriangle className={className} aria-hidden="true" />;
  }
  return <Cloud className={className} aria-hidden="true" />;
}

export default function CloudSyncPanel({
  state,
  copy,
  uiLang,
  onConnect,
  onSyncNow,
  onDisconnect,
  onDeleteCloudData,
  onExportLocal,
  onResolveConflict,
}: Props) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const busy = state.status === 'connecting' || state.status === 'syncing';
  const canUseConnectedActions = (
    state.status === 'ready'
    || state.status === 'offline'
    || state.status === 'conflict'
  );
  const needsConnect = (
    state.status === 'disconnected'
    || state.status === 'reauthorize'
    || state.status === 'error'
  );
  const lastSynced = state.lastSyncedAt
    ? new Intl.DateTimeFormat(uiLang, {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(state.lastSyncedAt))
    : copy.neverSynced;

  return (
    <section className="cloud-sync-panel" data-testid="cloud-sync-panel" aria-labelledby="cloud-sync-heading">
      <div className="cloud-sync-panel__heading">
        <div className="cloud-sync-panel__icon" aria-hidden="true">
          <Cloud className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 id="cloud-sync-heading" className="text-sm font-bold">{copy.heading}</h3>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{copy.description}</p>
        </div>
      </div>

      <p className="cloud-sync-panel__scope">{copy.dataScope}</p>

      <div className="cloud-sync-panel__status-row">
        <span
          className={`cloud-sync-status cloud-sync-status--${state.status}`}
          data-testid="cloud-sync-status"
          role="status"
        >
          {statusIcon(state.status, busy)}
          {copy.status[state.status]}
        </span>
        <span className="cloud-sync-last" data-testid="cloud-last-synced">
          {copy.lastSynced}: {lastSynced}
        </span>
      </div>

      {state.status === 'unconfigured' && (
        <p className="cloud-sync-message">{copy.unconfiguredMessage}</p>
      )}
      {state.status === 'offline' && (
        <p className="cloud-sync-message">{copy.offlineMessage}</p>
      )}
      {state.status === 'reauthorize' && (
        <p className="cloud-sync-message">{copy.reauthorizeMessage}</p>
      )}
      {state.status === 'conflict' && (
        <div className="cloud-sync-message cloud-sync-message--warning">
          <p>{copy.conflictMessage}</p>
          <button
            type="button"
            className="btn btn-secondary mt-3 px-3"
            onClick={onExportLocal}
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            {copy.exportLocal}
          </button>
          {state.conflictKind === 'local-remote' && (
            <div className="cloud-sync-conflict-actions">
              <button
                type="button"
                className="btn btn-secondary px-3"
                onClick={() => onResolveConflict('remote')}
              >
                {copy.useCloudCopy}
              </button>
              <button
                type="button"
                className="btn btn-primary px-3"
                onClick={() => onResolveConflict('local')}
              >
                {copy.keepDeviceCopy}
              </button>
            </div>
          )}
        </div>
      )}
      {state.status === 'error' && (
        <p className="cloud-sync-message">
          {copy.genericError}
          {state.errorCode ? ` (${state.errorCode})` : ''}
        </p>
      )}

      <div className="cloud-sync-actions">
        {needsConnect && (
          <button
            type="button"
            className="btn btn-primary px-4"
            disabled={busy}
            onClick={onConnect}
          >
            <Cloud className="w-4 h-4" aria-hidden="true" />
            {state.status === 'disconnected' ? copy.connect : copy.reconnect}
          </button>
        )}
        {state.status === 'unconfigured' && (
          <button type="button" className="btn btn-primary px-4" disabled>
            <Cloud className="w-4 h-4" aria-hidden="true" />
            {copy.connect}
          </button>
        )}
        {canUseConnectedActions && (
          <>
            <button
              type="button"
              className="btn btn-primary px-4"
              disabled={busy}
              onClick={onSyncNow}
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              {copy.syncNow}
            </button>
            <button
              type="button"
              className="btn btn-secondary px-4"
              disabled={busy}
              onClick={onDisconnect}
            >
              <Unplug className="w-4 h-4" aria-hidden="true" />
              {copy.disconnect}
            </button>
            <button
              type="button"
              className="btn cloud-sync-delete px-4"
              disabled={busy}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              {copy.deleteCloud}
            </button>
          </>
        )}
      </div>

      <p className="cloud-sync-disconnect-hint">{copy.disconnectHint}</p>

      {deleteConfirmOpen && (
        <div className="cloud-sync-confirm" data-testid="cloud-delete-confirm" role="alertdialog" aria-modal="true">
          <h4 className="text-sm font-bold">{copy.deleteConfirmTitle}</h4>
          <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
            {copy.deleteConfirmDescription}
          </p>
          <div className="flex flex-wrap justify-end gap-2 mt-4">
            <button
              type="button"
              className="btn btn-secondary px-3"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              {copy.cancelDelete}
            </button>
            <button
              type="button"
              className="btn cloud-sync-delete px-3"
              onClick={async () => {
                await onDeleteCloudData();
                setDeleteConfirmOpen(false);
              }}
            >
              {copy.confirmDelete}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
