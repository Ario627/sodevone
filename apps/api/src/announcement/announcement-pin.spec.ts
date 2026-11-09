import { describe, expect, it } from 'vitest';
import {
  canPin,
  hasRoom,
  pinRoomLeft,
  PIN_FULL_MESSAGE,
  PIN_NOT_PUBLISHED_MESSAGE,
} from './announcement-pin.js';

describe('canPin', () => {
  it('hanya mengizinkan pengumuman terbit', () => {
    expect(canPin('published')).toBe(true);
    expect(canPin('draft')).toBe(false);
    expect(canPin('archived')).toBe(false);
  });
});

describe('pinRoomLeft', () => {
  it('menghitung sisa jatah sematan', () => {
    expect(pinRoomLeft(0, false)).toBe(3);
    expect(pinRoomLeft(2, false)).toBe(1);
    expect(pinRoomLeft(3, false)).toBe(0);
  });

  it('tidak mengurangi jatah saat baris sudah tersemat', () => {
    expect(pinRoomLeft(3, true)).toBe(1);
  });
});

describe('hasRoom', () => {
  it('menolak sematan keempat', () => {
    expect(hasRoom(3, false)).toBe(false);
    expect(hasRoom(2, false)).toBe(true);
  });

  it('mengizinkan menyematkan ulang baris yang sudah tersemat', () => {
    expect(hasRoom(3, true)).toBe(true);
  });
});

describe('pesan', () => {
  it('menyebut syarat terbit pada pesan draf', () => {
    expect(PIN_NOT_PUBLISHED_MESSAGE).toContain('terbit');
  });

  it('menyebut batas tiga sematan', () => {
    expect(PIN_FULL_MESSAGE).toContain('3');
  });
});
