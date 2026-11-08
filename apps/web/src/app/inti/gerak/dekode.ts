const GLYPH = '█▓▒░<>/\\|=+*#%&@$';

const JEDA_TRAIL = 0.18;

const WAKTU_MINIMUM = 60;

export function progresDekode(berlalu: number, durasi: number): number {
  if (durasi <= WAKTU_MINIMUM) {
    return 1;
  }

  const mentah = Math.min(Math.max(berlalu / durasi, 0), 1);

  return 1 - Math.pow(1 - mentah, 3);
}

function glyphAcak(acak: () => number): string {
  const posisi = Math.floor(acak() * GLYPH.length);

  return GLYPH.charAt(Math.min(posisi, GLYPH.length - 1));
}

export function bingkaiDekode(teks: string, progres: number, acak: () => number): string {
  if (progres >= 1) {
    return teks;
  }

  const panjang = teks.length;

  const depan = progres * panjang;

  const ekor = depan + JEDA_TRAIL * panjang;

  let hasil = '';

  for (let indeks = 0; indeks < panjang; indeks += 1) {
    const karakter = teks.charAt(indeks);

    if (karakter === ' ') {
      hasil += ' ';

      continue;
    }

    if (indeks < depan) {
      hasil += karakter;

      continue;
    }

    hasil += indeks < ekor ? glyphAcak(acak) : '\u00a0';
  }

  return hasil;
}
