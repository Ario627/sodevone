import { describe, expect, it } from 'vitest';
import { baseKeyOf, extensionOf, storageKeysOf, variantKeyOf } from './image-keys.js';

describe('baseKeyOf', () => {
  it('membuang ekstensi terakhir', () => {
    expect(baseKeyOf('album/foto.webp')).toBe('album/foto');
  });

  it('mempertahankan titik pada nama tanpa ekstensi tambahan', () => {
    expect(baseKeyOf('album/a.b.webp')).toBe('album/a.b');
  });

  it('mengembalikan nilai apa adanya bila tidak ada titik', () => {
    expect(baseKeyOf('album/foto')).toBe('album/foto');
  });
});

describe('extensionOf', () => {
  it('mengembalikan ekstensi termasuk titik', () => {
    expect(extensionOf('album/foto.webp')).toBe('.webp');
  });

  it('memakai ekstensi cadangan bila tidak ada titik', () => {
    expect(extensionOf('album/foto')).toBe('.webp');
  });
});

describe('variantKeyOf', () => {
  it('menyisipkan akhiran ukuran sebelum ekstensi', () => {
    expect(variantKeyOf('album/foto.webp', 'kecil')).toBe('album/foto-kecil.webp');
    expect(variantKeyOf('album/foto.webp', 'sedang')).toBe('album/foto-sedang.webp');
  });
});

describe('storageKeysOf', () => {
  it('menghasilkan tiga kunci dari satu kunci induk', () => {
    expect(storageKeysOf('album/foto.webp')).toEqual({
      master: 'album/foto.webp',
      medium: 'album/foto-sedang.webp',
      small: 'album/foto-kecil.webp',
    });
  });

  it('tetap konsisten ketika dipanggil ulang', () => {
    const kunci = storageKeysOf('album/foto.webp');

    expect(storageKeysOf(kunci.master)).toEqual(kunci);
  });
});
