import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { assertEventSchedule, isEventScheduleOrdered } from './event-schedule.js';

const MULAI = '2026-12-01T09:00:00.000Z';

describe('isEventScheduleOrdered', () => {
  it('menerima kegiatan tanpa waktu selesai', () => {
    expect(isEventScheduleOrdered(MULAI, null)).toBe(true);
  });

  it('menerima waktu selesai yang sama dengan waktu mulai', () => {
    expect(isEventScheduleOrdered(MULAI, MULAI)).toBe(true);
  });

  it('menerima waktu selesai setelah waktu mulai', () => {
    expect(isEventScheduleOrdered(MULAI, '2026-12-01T11:00:00.000Z')).toBe(true);
  });

  it('menolak waktu selesai sebelum waktu mulai', () => {
    expect(isEventScheduleOrdered(MULAI, '2026-12-01T08:59:59.000Z')).toBe(false);
  });

  it('membandingkan waktu sesudah normalisasi format basis data', () => {
    expect(isEventScheduleOrdered('2026-12-01 09:00:00+00', '2026-12-01 10:00:00+00')).toBe(true);
  });

  it('menormalkan zona waktu sebelum membandingkan', () => {
    expect(isEventScheduleOrdered('2026-12-01T16:00:00+07:00', '2026-12-01T09:30:00Z')).toBe(true);
  });

  it('menolak waktu selesai sebelum mulai walau zona waktu berbeda', () => {
    expect(isEventScheduleOrdered('2026-12-01T16:00:00+07:00', '2026-12-01T08:00:00Z')).toBe(false);
  });
});

describe('assertEventSchedule', () => {
  it('tidak melempar galat untuk jadwal yang sah', () => {
    expect(() => assertEventSchedule(MULAI, null)).not.toThrow();
  });

  it('melempar BadRequestException dengan field endsAt', () => {
    try {
      assertEventSchedule(MULAI, '2026-11-30T09:00:00.000Z');
      expect.unreachable('seharusnya melempar');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);

      const body = (error as BadRequestException).getResponse() as {
        code?: string;
        fields?: Array<{ path: string }>;
      };

      expect(body.code).toBe('VALIDATION_FAILED');
      expect(body.fields?.[0]?.path).toBe('endsAt');
    }
  });
});
