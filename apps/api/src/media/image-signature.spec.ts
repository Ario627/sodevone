import { describe, expect, it } from 'vitest';
import { sniffImageFormat } from './image-signature.js';

function padded(bytes: number[]): Uint8Array {
  return Uint8Array.from([...bytes, ...Array.from({ length: 32 }, () => 0)]);
}

describe('sniffImageFormat', () => {
  it('mengenali JPEG dari tiga byte pertama', () => {
    expect(sniffImageFormat(padded([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
  });

  it('mengenali PNG dari tanda tangan delapan byte', () => {
    expect(sniffImageFormat(padded([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('png');
  });

  it('mengenali WebP dari RIFF dan penanda WEBP', () => {
    const head = [0x52, 0x49, 0x46, 0x46, 0x10, 0x02, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];

    expect(sniffImageFormat(padded(head))).toBe('webp');
  });

  it('menolak berkas teks walaupun bernama gambar', () => {
    expect(sniffImageFormat(padded([0x3c, 0x3f, 0x78, 0x6d, 0x6c]))).toBeUndefined();
  });

  it('menolak SVG', () => {
    expect(sniffImageFormat(padded([0x3c, 0x73, 0x76, 0x67]))).toBeUndefined();
  });

  it('menolak RIFF yang bukan WebP', () => {
    const wav = [0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45];

    expect(sniffImageFormat(padded(wav))).toBeUndefined();
  });

  it('menolak berkas yang lebih pendek dari enam belas byte', () => {
    expect(sniffImageFormat(Uint8Array.from([0xff, 0xd8, 0xff]))).toBeUndefined();
  });

  it('membaca dari offset nol tanpa terpengaruh isi setelahnya', () => {
    const body = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];

    expect(sniffImageFormat(padded([...body, 0xff, 0xd8, 0xff]))).toBe('webp');
  });
});
