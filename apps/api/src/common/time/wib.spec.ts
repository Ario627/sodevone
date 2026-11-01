import { describe, expect, it } from 'vitest';
import { isWibDateRangeValid, wibDayEndUtc, wibDayStartUtc } from './wib.js';

describe('wibDayStartUtc', () => {
  it('menggeser tengah malam WIB ke hari sebelumnya dalam UTC', () => {
    expect(wibDayStartUtc('2026-11-01')).toBe('2026-10-31T17:00:00.000Z');
  });

  it('menangani pergantian bulan', () => {
    expect(wibDayStartUtc('2026-01-01')).toBe('2025-12-31T17:00:00.000Z');
  });
});

describe('wibDayEndUtc', () => {
  it('berakhir 23:59:59.999 WIB', () => {
    expect(wibDayEndUtc('2026-11-01')).toBe('2026-11-01T16:59:59.999Z');
  });

  it('berbeda tepat satu hari dari awal hari berikutnya', () => {
    const akhir = Date.parse(wibDayEndUtc('2026-11-01'));
    const awalBerikut = Date.parse(wibDayStartUtc('2026-11-02'));

    expect(awalBerikut - akhir).toBe(1);
  });
});

describe('isWibDateRangeValid', () => {
  it('menerima rentang yang berurutan', () => {
    expect(isWibDateRangeValid('2026-10-01', '2026-10-31')).toBe(true);
  });

  it('menerima tanggal yang sama', () => {
    expect(isWibDateRangeValid('2026-10-31', '2026-10-31')).toBe(true);
  });

  it('menolak rentang terbalik', () => {
    expect(isWibDateRangeValid('2026-11-02', '2026-11-01')).toBe(false);
  });
});
