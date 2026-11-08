import { TestBed } from '@angular/core/testing';
import { AngkaPiksel } from '../../komponen/angka-piksel/angka-piksel';
import { TINGGI_GLYPH, barisGlyph, lebarTeks, punyaGlyph, titikTeks } from './glyph';

function terang(karakter: string): number {
  return barisGlyph(karakter)
    .join('')
    .split('')
    .filter((b) => b === '1').length;
}

describe('glyph piksel', () => {
  it('setiap glyph punya 7 baris dan 5 kolom', () => {
    for (const karakter of '0123456789ACPEGIKLNPRSTUWX') {
      const baris = barisGlyph(karakter);

      expect(baris).toHaveLength(TINGGI_GLYPH);

      for (const isi of baris) {
        expect(isi).toHaveLength(5);
        expect(/^[01]+$/.test(isi)).toBe(true);
      }
    }
  });

  it('menolak karakter yang tidak ada dan memakai kotak cadangan', () => {
    expect(punyaGlyph('X')).toBe(true);
    expect(punyaGlyph('x')).toBe(true);
    expect(punyaGlyph('?')).toBe(false);
    expect(terang('?')).toBe(20);
  });

  it('menghitung lebar teks dengan jarak antar glyph', () => {
    expect(lebarTeks('')).toBe(0);
    expect(lebarTeks('1')).toBe(5);
    expect(lebarTeks('11')).toBe(11);
    expect(lebarTeks('XI')).toBe(11);
    expect(lebarTeks('X I')).toBe(17);
  });

  it('menyusun titik sesuai posisi kolom dan baris', () => {
    const titik = titikTeks('XI');

    expect(titik).toHaveLength(terang('X') + terang('I'));
    expect(titik.filter((t) => t.teks === 'X')).toHaveLength(13);
    expect(titik.filter((t) => t.teks === 'I')).toHaveLength(15);

    const barisPertama = titik.filter((t) => t.baris === 0).map((t) => `${t.kolom}`);

    expect(barisPertama).toEqual(['0', '4', '6', '7', '8', '9', '10']);
    expect(Math.max(...titik.map((t) => t.kolom))).toBe(10);
  });

  it('melewatkan spasi tanpa menghasilkan titik', () => {
    const titik = titikTeks('X I');

    expect(titik.filter((t) => t.teks === 'I').every((t) => t.kolom >= 6)).toBe(true);
    expect(titik.some((t) => t.teks === ' ')).toBe(false);
  });

  it('memberi cadangan untuk angka nol', () => {
    expect(terang('0')).toBe(19);
    expect(terang('1')).toBe(10);
  });
});

describe('komponen angka piksel', () => {
  it('menggambar satu rect per piksel menyala', async () => {
    const fixture = TestBed.createComponent(AngkaPiksel);

    fixture.componentRef.setInput('teks', '01');
    fixture.detectChanges();
    await fixture.whenStable();

    const elemen: HTMLElement = fixture.nativeElement;
    const rect = elemen.querySelectorAll('rect');
    const svg = elemen.querySelector('svg');

    expect(rect).toHaveLength(terang('0') + terang('1'));
    expect(svg?.getAttribute('viewBox')).toBe('0 0 11 7');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(elemen.querySelector('.sr-only')?.textContent?.trim()).toBe('01');
  });

  it('mengikuti tinggi yang diminta lewat rasio glyph', async () => {
    const fixture = TestBed.createComponent(AngkaPiksel);

    fixture.componentRef.setInput('teks', '2026');
    fixture.componentRef.setInput('tinggi', 21);
    fixture.detectChanges();
    await fixture.whenStable();

    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');

    expect(svg?.style.height).toBe('21px');
    expect(svg?.style.width).toBe('69px');
  });
});
