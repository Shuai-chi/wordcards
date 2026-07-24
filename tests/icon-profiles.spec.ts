import { expect, test } from '@playwright/test';
import {
  ICON_MAX_FILE_BYTES,
  ICON_MAX_PIXELS,
  ICON_SLOTS,
  assertIconDimensions,
  assertIconFileMetadata,
  assertIconSignature,
  createDefaultIconTransform,
  normalizeIconTransform,
} from '../src/lib/iconAssets';

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const JPEG_SIGNATURE = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
const WEBP_SIGNATURE = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50,
]);

test.describe('custom icon constraints', () => {
  test('defines exactly the six supported icon slots', () => {
    expect(ICON_SLOTS).toEqual(['vocab', 'phrase', 'practiced', 'hard', 'good', 'easy']);
  });

  test('accepts supported metadata and rejects unsupported or oversized files', () => {
    expect(() => assertIconFileMetadata({ type: 'image/png', size: ICON_MAX_FILE_BYTES })).not.toThrow();
    expect(() => assertIconFileMetadata({ type: 'image/jpeg', size: 12 })).not.toThrow();
    expect(() => assertIconFileMetadata({ type: 'image/webp', size: 12 })).not.toThrow();
    expect(() => assertIconFileMetadata({ type: 'image/svg+xml', size: 12 })).toThrow('unsupported_icon_type');
    expect(() => assertIconFileMetadata({ type: 'image/png', size: ICON_MAX_FILE_BYTES + 1 })).toThrow('icon_file_too_large');
    expect(() => assertIconFileMetadata({ type: 'image/png', size: 0 })).toThrow('empty_icon_file');
  });

  test('checks the actual file signature instead of trusting MIME alone', () => {
    expect(() => assertIconSignature('image/png', PNG_SIGNATURE)).not.toThrow();
    expect(() => assertIconSignature('image/jpeg', JPEG_SIGNATURE)).not.toThrow();
    expect(() => assertIconSignature('image/webp', WEBP_SIGNATURE)).not.toThrow();
    expect(() => assertIconSignature('image/png', JPEG_SIGNATURE)).toThrow('invalid_icon_signature');
    expect(() => assertIconSignature('image/webp', PNG_SIGNATURE)).toThrow('invalid_icon_signature');
  });

  test('rejects implausible decoded dimensions and decompression-heavy images', () => {
    expect(() => assertIconDimensions(16, 16)).not.toThrow();
    expect(() => assertIconDimensions(4096, 4096)).not.toThrow();
    expect(4096 * 4096).toBe(ICON_MAX_PIXELS);
    expect(() => assertIconDimensions(15, 100)).toThrow('invalid_icon_dimensions');
    expect(() => assertIconDimensions(4097, 100)).toThrow('invalid_icon_dimensions');
    expect(() => assertIconDimensions(4096, 4097)).toThrow('icon_pixel_limit');
  });

  test('uses contain/center defaults and clamps hostile transforms', () => {
    expect(createDefaultIconTransform()).toEqual({ fit: 'contain', zoom: 1, offsetX: 0, offsetY: 0 });
    expect(normalizeIconTransform({ fit: 'cover', zoom: 99, offsetX: -900, offsetY: 900 })).toEqual({
      fit: 'cover',
      zoom: 3,
      offsetX: -50,
      offsetY: 50,
    });
    expect(normalizeIconTransform({ fit: 'stretch', zoom: Number.NaN, offsetX: null, offsetY: undefined })).toEqual({
      fit: 'contain',
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    });
  });
});

test('persists three-profile assets without changing learning stores', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    const { DB } = await import('/src/lib/db.ts');
    const { createIconAssetId } = await import('/src/lib/iconAssets.ts');
    const before = await DB.getAllData();
    const now = '2026-07-20T00:00:00.000Z';
    const first = {
      id: createIconAssetId('profile-1', 'vocab'),
      profileId: 'profile-1' as const,
      slot: 'vocab' as const,
      blob: new Blob(['first-image'], { type: 'image/png' }),
      mimeType: 'image/png' as const,
      fileName: 'first.png',
      fit: 'contain' as const,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      updatedAt: now,
    };
    const second = {
      ...first,
      id: createIconAssetId('profile-2', 'vocab'),
      profileId: 'profile-2' as const,
      blob: new Blob(['second-image'], { type: 'image/webp' }),
      mimeType: 'image/webp' as const,
      fileName: 'second.webp',
      fit: 'cover' as const,
      zoom: 1.5,
      offsetX: 10,
    };

    await DB.replaceAllIconAssets([first, second]);
    const saved = await DB.getAllIconAssets();
    const savedBodies = await Promise.all(saved.map(record => record.blob.text()));
    await DB.replaceAllIconAssets([second]);
    const afterReplace = await DB.getAllIconAssets();
    const after = await DB.getAllData();

    return {
      ids: saved.map(record => record.id).sort(),
      bodies: savedBodies.sort(),
      remainingIds: afterReplace.map(record => record.id),
      learningCountsBefore: [before.decks.length, before.cards.length, before.reports.length],
      learningCountsAfter: [after.decks.length, after.cards.length, after.reports.length],
    };
  });

  expect(result.ids).toEqual(['profile-1:vocab', 'profile-2:vocab']);
  expect(result.bodies).toEqual(['first-image', 'second-image']);
  expect(result.remainingIds).toEqual(['profile-2:vocab']);
  expect(result.learningCountsAfter).toEqual(result.learningCountsBefore);

  await page.reload();
  const persisted = await page.evaluate(async () => {
    const { DB } = await import('/src/lib/db.ts');
    const records = await DB.getAllIconAssets();
    return { ids: records.map(record => record.id), body: await records[0].blob.text() };
  });
  expect(persisted).toEqual({ ids: ['profile-2:vocab'], body: 'second-image' });
});
