import { ImagePlus, Maximize2, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  createDefaultIconTransform,
  createIconAssetId,
  normalizeIconTransform,
  validateIconFile,
  type IconAssetRecord,
  type IconSlot,
} from '../lib/iconAssets';
import type { IconProfileId } from '../lib/uiPreferences';
import type { PersonalizationStrings } from '../lib/personalizationStrings';

interface Props {
  profileId: IconProfileId;
  slot: IconSlot;
  label: string;
  record?: IconAssetRecord;
  copy: PersonalizationStrings;
  onChange: (record: IconAssetRecord) => void;
  onRemove: () => void;
}

export default function IconImageEditor({ profileId, slot, label, record, copy, onChange, onRemove }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    if (!record) { setUrl(null); return; }
    const nextUrl = URL.createObjectURL(record.blob);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [record]);

  const updateTransform = (patch: Partial<Pick<IconAssetRecord, 'fit' | 'zoom' | 'offsetX' | 'offsetY'>>) => {
    if (!record) return;
    onChange({ ...record, ...normalizeIconTransform({ ...record, ...patch }), updatedAt: new Date().toISOString() });
  };

  const handleUpload = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    try {
      await validateIconFile(file);
      onChange({
        id: createIconAssetId(profileId, slot),
        profileId,
        slot,
        blob: file,
        mimeType: file.type as IconAssetRecord['mimeType'],
        fileName: file.name,
        ...createDefaultIconTransform(),
        updatedAt: new Date().toISOString(),
      });
    } catch (uploadError) {
      setError(`${copy.uploadError}: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
    }
  };

  return (
    <article className="icon-editor">
      <div className="icon-editor__header">
        <h4 className="text-sm font-bold">{label}</h4>
        {record && (
          <button type="button" className="settings-reset-link danger" data-testid={`icon-remove-${slot}`} onClick={onRemove}>
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            {copy.removeImage}
          </button>
        )}
      </div>

      <div
        className="icon-editor__preview"
        data-testid={`icon-preview-${slot}`}
        onPointerDown={event => {
          if (!record) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            offsetX: record.offsetX,
            offsetY: record.offsetY,
          };
        }}
        onPointerMove={event => {
          const drag = dragRef.current;
          if (!record || !drag || drag.pointerId !== event.pointerId) return;
          const rect = event.currentTarget.getBoundingClientRect();
          updateTransform({
            offsetX: drag.offsetX + ((event.clientX - drag.x) / rect.width) * 100,
            offsetY: drag.offsetY + ((event.clientY - drag.y) / rect.height) * 100,
          });
        }}
        onPointerUp={event => {
          if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
        }}
        onPointerCancel={() => { dragRef.current = null; }}
      >
        {record && url ? (
          <img
            src={url}
            alt=""
            draggable={false}
            style={{
              objectFit: record.fit,
              transform: `translate(${record.offsetX}%, ${record.offsetY}%) scale(${record.zoom})`,
            }}
          />
        ) : (
          <div className="icon-editor__empty">
            <ImagePlus className="w-6 h-6" aria-hidden="true" />
            <span>{copy.defaultIcon}</span>
          </div>
        )}
      </div>

      <label className="btn btn-secondary icon-upload-label">
        <ImagePlus className="w-4 h-4" aria-hidden="true" />
        {record ? copy.replaceImage : copy.uploadImage}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
          className="sr-only"
          data-testid={`icon-upload-${slot}`}
          onChange={event => {
            void handleUpload(event.target.files?.[0]);
            event.currentTarget.value = '';
          }}
        />
      </label>

      {record && (
        <div className="icon-editor__controls">
          <div className="icon-fit-buttons" role="group" aria-label={`${label} fit`}>
            <button
              type="button"
              data-testid={`icon-fit-contain-${slot}`}
              aria-pressed={record.fit === 'contain'}
              className="btn btn-secondary"
              onClick={() => updateTransform({ fit: 'contain' })}
            >
              {copy.fitImage}
            </button>
            <button
              type="button"
              data-testid={`icon-fit-cover-${slot}`}
              aria-pressed={record.fit === 'cover'}
              className="btn btn-secondary"
              onClick={() => updateTransform({ fit: 'cover' })}
            >
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
              {copy.fillImage}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => updateTransform(createDefaultIconTransform())}
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              {copy.resetPosition}
            </button>
          </div>
          <label className="icon-zoom-label" htmlFor={`icon-zoom-${slot}`}>
            <span>{copy.imageZoom}</span>
            <span data-testid={`icon-zoom-value-${slot}`}>{Math.round(record.zoom * 100)}%</span>
          </label>
          <input
            id={`icon-zoom-${slot}`}
            data-testid={`icon-zoom-${slot}`}
            type="range"
            min="0.5"
            max="3"
            step="0.05"
            value={record.zoom}
            onChange={event => updateTransform({ zoom: Number(event.target.value) })}
          />
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{copy.dragHint}</p>
        </div>
      )}
      <p className="text-xs" style={{ color: 'var(--muted)' }}>{copy.imageRequirements}</p>
      {error && <p role="alert" className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
    </article>
  );
}

