import type { EventStatus } from '@kelas/contracts';
import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { assertEventTransition, canTransitionEvent } from './event-status.js';

const SEMUA: EventStatus[] = ['draft', 'published', 'archived'];

const DIIZINKAN: ReadonlyArray<[EventStatus, EventStatus]> = [
  ['draft', 'published'],
  ['published', 'archived'],
  ['archived', 'draft'],
];

describe('canTransitionEvent', () => {
  it('mengizinkan tepat pasangan yang tercatat di tabel transisi', () => {
    for (const dari of SEMUA) {
      for (const ke of SEMUA) {
        const diharapkan = DIIZINKAN.some(([a, b]) => a === dari && b === ke);

        expect(canTransitionEvent(dari, ke)).toBe(diharapkan);
      }
    }
  });

  it('menolak draf yang langsung diarsipkan', () => {
    expect(canTransitionEvent('draft', 'archived')).toBe(false);
  });

  it('menolak arsip yang langsung diterbitkan', () => {
    expect(canTransitionEvent('archived', 'published')).toBe(false);
  });

  it('menolak kegiatan terbit yang dikembalikan menjadi draf', () => {
    expect(canTransitionEvent('published', 'draft')).toBe(false);
  });

  it('menolak status berpindah ke dirinya sendiri', () => {
    for (const status of SEMUA) {
      expect(canTransitionEvent(status, status)).toBe(false);
    }
  });
});

describe('assertEventTransition', () => {
  it('tidak melempar galat untuk transisi sah', () => {
    expect(() => assertEventTransition('draft', 'published')).not.toThrow();
  });

  it('melempar ConflictException dengan kode CONFLICT untuk transisi terlarang', () => {
    try {
      assertEventTransition('archived', 'published');
      expect.unreachable('seharusnya melempar');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);

      const body = (error as ConflictException).getResponse() as { code?: string };

      expect(body.code).toBe('CONFLICT');
    }
  });
});
