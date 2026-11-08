const GERAK_REDUP = '(prefers-reduced-motion: reduce)';

const PENUNJUK_HALUS = '(pointer: fine)';

const SKEMA_GELAP = '(prefers-color-scheme: dark)';

const MAKS_KEDALAMAN_TOKEN = 4;

const RUJUKAN_VAR = /^var\(\s*(--[a-z0-9-]+)\s*(?:,\s*(.+))?\)$/i;

function cocok(kueri: string): boolean {
  return globalThis.matchMedia?.(kueri).matches ?? false;
}

function nilaiToken(nama: string, kedalaman: number): string {
  const mentah = getComputedStyle(document.documentElement).getPropertyValue(nama).trim();

  if (mentah.length === 0) {
    return '';
  }

  const rujukan = RUJUKAN_VAR.exec(mentah);

  const namaDalam = rujukan?.[1];

  if (rujukan === null || namaDalam === undefined) {
    return mentah;
  }

  if (kedalaman >= MAKS_KEDALAMAN_TOKEN) {
    return rujukan[2]?.trim() ?? '';
  }

  const dalam = nilaiToken(namaDalam, kedalaman + 1);

  return dalam.length > 0 ? dalam : (rujukan[2]?.trim() ?? '');
}


export function gerakDikurangi(): boolean {
  return cocok(GERAK_REDUP);
}

export function penunjukHalus(): boolean {
  return cocok(PENUNJUK_HALUS);
}

export function skemaGelap(): boolean {
  return cocok(SKEMA_GELAP);
}

export function bolehBergerak(): boolean {
  return penunjukHalus() && !gerakDikurangi();
}

export function pantauMedia(kueri: string, ubah: (cocokSekarang: boolean) => void): () => void {
  const daftar = globalThis.matchMedia?.(kueri);

  if (daftar === undefined) {
    return () => undefined;
  }

  const dengar = () => ubah(daftar.matches);

  daftar.addEventListener('change', dengar);

  return () => daftar.removeEventListener('change', dengar);
}

export function warnaToken(nama: string, cadangan: string): string {
  const nilai = nilaiToken(nama, 0);

  return nilai.length > 0 ? nilai : cadangan;
}