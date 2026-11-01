import { ConflictException } from '@nestjs/common';
import type { AnnouncementStatus } from '@kelas/contracts';
import { describe, expect, it } from 'vitest';
import { assertTransition, canTransition } from './announcement-status.js';

const SEMUA: AnnouncementStatus[] = ['draft', 'published', 'archived'];

const DIIZINKAN: ReadonlyArray<[AnnouncementStatus, AnnouncementStatus]> = [
  ['draft', 'published'],
  ['published', 'archived'],
  ['published', 'draft'],
  ['archived', 'draft'],
];

describe('canTransition', () => {
  it('mengizinkan tepat pasangan yang tercatat di tabel transisi', () => {
    for (const dari of SEMUA) {
      for (const ke of SEMUA) {
        const diharapkan = DIIZINKAN.some(([a, b]) => a === dari && b === ke);

        expect(canTransition(dari, ke)).toBe(diharapkan);
      }
    }
  });

  it('menolak draf yang langsung diarsipkan', () => {
    expect(canTransition('draft', 'archived')).toBe(false);
  });

  it('menolak arsip yang langsung diterbitkan', () => {
    expect(canTransition('archived', 'published')).toBe(false);
  });

  it('menolak status berpindah ke dirinya sendiri', () => {
    for (const status of SEMUA) {
      expect(canTransition(status, status)).toBe(false);
    }
  });
});

describe('assertTransition', () => {
  it('tidak melempar galat untuk transisi sah', () => {
    expect(() => assertTransition('draft', 'published')).not.toThrow();
  });

  it('melempar ConflictException dengan kode CONFLICT untuk transisi terlarang', () => {
    try {
      assertTransition('archived', 'published');
      expect.unreachable('seharusnya melempar');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);

      const body = (error as ConflictException).getResponse() as { code?: string };

      expect(body.code).toBe('CONFLICT');
    }
  });
});