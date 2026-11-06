import type { AlbumStatus } from '@kelas/contracts';
import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { assertAlbumTransition, canTransitionAlbum } from './album-status.js';

const SEMUA: AlbumStatus[] = ['draft', 'published', 'archived'];

const DIIZINKAN: ReadonlyArray<[AlbumStatus, AlbumStatus]> = [
  ['draft', 'published'],
  ['published', 'archived'],
  ['archived', 'draft'],
];

describe('canTransitionAlbum', () => {
  it('mengizinkan tepat pasangan yang tercatat', () => {
    for (const dari of SEMUA) {
      for (const ke of SEMUA) {
        const diharapkan = DIIZINKAN.some(([a, b]) => a === dari && b === ke);

        expect(canTransitionAlbum(dari, ke)).toBe(diharapkan);
      }
    }
  });

  it('menolak draf yang langsung diarsipkan', () => {
    expect(canTransitionAlbum('draft', 'archived')).toBe(false);
  });

  it('menolak album terbit yang kembali ke draf', () => {
    expect(canTransitionAlbum('published', 'draft')).toBe(false);
  });

  it('menolak status berpindah ke dirinya sendiri', () => {
    for (const status of SEMUA) {
      expect(canTransitionAlbum(status, status)).toBe(false);
    }
  });
});

describe('assertAlbumTransition', () => {
  it('tidak melempar galat untuk transisi sah', () => {
    expect(() => assertAlbumTransition('archived', 'draft')).not.toThrow();
  });

  it('melempar ConflictException dengan kode CONFLICT', () => {
    try {
      assertAlbumTransition('draft', 'archived');
      expect.unreachable('seharusnya melempar');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);

      const body = (error as ConflictException).getResponse() as { code?: string };

      expect(body.code).toBe('CONFLICT');
    }
  });
});
