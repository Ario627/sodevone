import { describe, expect, it } from 'vitest';
import {
  isManagedDirectoryName,
  isManagedFileName,
  isSafeStorageKey,
} from './managed-file.js';

const ALBUM = 'd7b9913b-3784-4c41-b8bb-35eeb74f1b87';

const IMAGE = 'fda21022-5a3a-439a-b675-08bfaae93951';

describe('isManagedFileName', () => {
  it('menerima nama master dan kedua turunannya', () => {
    expect(isManagedFileName(`${IMAGE}.webp`)).toBe(true);
    expect(isManagedFileName(`${IMAGE}-sedang.webp`)).toBe(true);
    expect(isManagedFileName(`${IMAGE}-kecil.webp`)).toBe(true);
  });

  it('menolak nama asli pengguna', () => {
    expect(isManagedFileName('rapor-budi.jpg')).toBe(false);
    expect(isManagedFileName(`${IMAGE}.jpg`)).toBe(false);
  });

  it('menolak akhiran yang tidak dikenal', () => {
    expect(isManagedFileName(`${IMAGE}-besar.webp`)).toBe(false);
  });

  it('menolak uuid yang cacat', () => {
    expect(isManagedFileName('bukan-uuid.webp')).toBe(false);
  });

  it('menolak nama dengan jalur di dalamnya', () => {
    expect(isManagedFileName(`${ALBUM}/${IMAGE}.webp`)).toBe(false);
  });
});

describe('isManagedDirectoryName', () => {
  it('menerima uuid album', () => {
    expect(isManagedDirectoryName(ALBUM)).toBe(true);
  });

  it('menolak nama lain', () => {
    expect(isManagedDirectoryName('album-lain')).toBe(false);
    expect(isManagedDirectoryName('..')).toBe(false);
    expect(isManagedDirectoryName('.')).toBe(false);
  });
});

describe('isSafeStorageKey', () => {
  it('menerima kunci berbentuk album/uuid.webp', () => {
    expect(isSafeStorageKey(`${ALBUM}/${IMAGE}.webp`)).toBe(true);
  });

  it('menolak kunci kosong', () => {
    expect(isSafeStorageKey('')).toBe(false);
  });

  it('menolak karakter di luar daftar izin', () => {
    expect(isSafeStorageKey(`${ALBUM}/../etc/passwd`)).toBe(false);
    expect(isSafeStorageKey(`${ALBUM}/${IMAGE}.webp;rm -rf /`)).toBe(false);
    expect(isSafeStorageKey(`${ALBUM}\\${IMAGE}.webp`)).toBe(false);
  });

  it('menolak kunci yang melebihi panjang kolom', () => {
    expect(isSafeStorageKey(`${'a'.repeat(199)}/x`)).toBe(false);
  });

  it('menerima kunci tepat pada batas panjang kolom', () => {
    expect(isSafeStorageKey(`${'a'.repeat(198)}/x`)).toBe(true);
  });
});
