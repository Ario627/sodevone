export const HALAMAN_MINIMUM = 1;

export const HALAMAN_MAKSIMUM = 1000;

const POLA_HALAMAN = /^[0-9]{1,4}$/;

export function halamanDari(nilai: string | undefined): number {
  if (nilai === undefined || !POLA_HALAMAN.test(nilai)) {
    return HALAMAN_MINIMUM;
  }

  return Math.min(Math.max(Number.parseInt(nilai, 10), HALAMAN_MINIMUM), HALAMAN_MAKSIMUM);
}

export function halamanTautan(halaman: number): Record<string, string> {
  return halaman > HALAMAN_MINIMUM ? { page: String(halaman) } : {};
}