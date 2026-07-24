import type { IconProfileId } from './uiPreferences';

export const ICON_SLOTS = ['vocab', 'phrase', 'practiced', 'hard', 'good', 'easy'] as const;
export type IconSlot = typeof ICON_SLOTS[number];
export type IconFit = 'contain' | 'cover';
export type SupportedIconMime = 'image/png' | 'image/jpeg' | 'image/webp';

export const ICON_MAX_FILE_BYTES = 512 * 1024;
export const ICON_MIN_DIMENSION = 16;
export const ICON_MAX_DIMENSION = 4096;
export const ICON_MAX_PIXELS = 4096 * 4096;

export interface IconTransform {
  fit: IconFit;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface IconAssetRecord extends IconTransform {
  id: `${IconProfileId}:${IconSlot}`;
  profileId: IconProfileId;
  slot: IconSlot;
  blob: Blob;
  mimeType: SupportedIconMime;
  fileName: string;
  updatedAt: string;
}

export interface IconAssetView extends IconTransform {
  url: string;
  alt?: string;
}

export type ActiveIconAssets = Partial<Record<IconSlot, IconAssetView>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampStepped(value: unknown, min: number, max: number, step: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const clamped = Math.max(min, Math.min(max, value));
  return Number((min + Math.round((clamped - min) / step) * step).toFixed(2));
}

export function createDefaultIconTransform(): IconTransform {
  return { fit: 'contain', zoom: 1, offsetX: 0, offsetY: 0 };
}

export function normalizeIconTransform(value: unknown): IconTransform {
  if (!isRecord(value)) return createDefaultIconTransform();
  return {
    fit: value.fit === 'cover' ? 'cover' : 'contain',
    zoom: clampStepped(value.zoom, 0.5, 3, 0.05, 1),
    offsetX: clampStepped(value.offsetX, -50, 50, 1, 0),
    offsetY: clampStepped(value.offsetY, -50, 50, 1, 0),
  };
}

export function assertIconFileMetadata(file: Pick<File, 'type' | 'size'>): asserts file is Pick<File, 'type' | 'size'> & { type: SupportedIconMime } {
  if (file.size <= 0) throw new Error('empty_icon_file');
  if (file.size > ICON_MAX_FILE_BYTES) throw new Error('icon_file_too_large');
  if (file.type !== 'image/png' && file.type !== 'image/jpeg' && file.type !== 'image/webp') {
    throw new Error('unsupported_icon_type');
  }
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

export function assertIconSignature(mimeType: SupportedIconMime, bytes: Uint8Array): void {
  const valid = mimeType === 'image/png'
    ? startsWith(bytes, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    : mimeType === 'image/jpeg'
      ? startsWith(bytes, [0xFF, 0xD8, 0xFF])
      : startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8);
  if (!valid) throw new Error('invalid_icon_signature');
}

export function assertIconDimensions(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width * height > ICON_MAX_PIXELS) {
    throw new Error('icon_pixel_limit');
  }
  if (
    width < ICON_MIN_DIMENSION
    || height < ICON_MIN_DIMENSION
    || width > ICON_MAX_DIMENSION
    || height > ICON_MAX_DIMENSION
  ) {
    throw new Error('invalid_icon_dimensions');
  }
}

async function decodeIconDimensions(file: File): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('invalid_icon_image'));
    };
    image.src = url;
  });
}

export async function validateIconFile(file: File): Promise<{ width: number; height: number }> {
  assertIconFileMetadata(file);
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  assertIconSignature(file.type, bytes);
  let dimensions: { width: number; height: number };
  try {
    dimensions = await decodeIconDimensions(file);
  } catch {
    throw new Error('invalid_icon_image');
  }
  assertIconDimensions(dimensions.width, dimensions.height);
  return dimensions;
}

export function createIconAssetId(profileId: IconProfileId, slot: IconSlot): IconAssetRecord['id'] {
  return `${profileId}:${slot}`;
}
