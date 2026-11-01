const ZONA = 'Asia/Jakarta';

const FORMAT_TANGGAL = new Intl.DateTimeFormat('id-ID', {
  timeZone: ZONA,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const FORMAT_JAM = new Intl.DateTimeFormat('id-ID', {
  timeZone: ZONA,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const FORMAT_TANGGAL_PANJANG = new Intl.DateTimeFormat('id-ID', {
  timeZone: ZONA,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const FORMAT_BAGIAN = new Intl.DateTimeFormat('id-ID', {
  timeZone: ZONA,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const FORMAT_BULAN = new Intl.DateTimeFormat('en-US', { timeZone: ZONA, month: 'numeric' });

const FORMAT_TAHUN = new Intl.DateTimeFormat('en-US', { timeZone: ZONA, year: 'numeric' });

const AWAL_TAHUN_AJARAN = 7;

const BAGIAN_KOSONG = { hari: '--', bulan: '---', tahun: '----' };

function waktuOf(iso: string): Date | undefined {
  const waktu = new Date(iso);

  return Number.isNaN(waktu.getTime()) ? undefined : waktu;
}

export function hariBulan(iso: string): { hari: string; bulan: string; tahun: string } {
  const waktu = waktuOf(iso);

  if (waktu === undefined) {
    return BAGIAN_KOSONG;
  }

  const potongan = FORMAT_BAGIAN.formatToParts(waktu);

  const ambil = (tipe: Intl.DateTimeFormatPartTypes): string =>
    potongan.find((bagian) => bagian.type === tipe)?.value ?? '';

  return {
    hari: ambil('day'),
    bulan: ambil('month').replace('.', '').toUpperCase(),
    tahun: ambil('year'),
  };
}

export function tahunAjaran(referensi: Date = new Date()): string {
  const bulan = Number(FORMAT_BULAN.format(referensi));

  const tahun = Number(FORMAT_TAHUN.format(referensi));

  return bulan >= AWAL_TAHUN_AJARAN ? `${tahun}/${tahun + 1}` : `${tahun - 1}/${tahun}`;
}

export function jamTeks(iso: string): string {
  const waktu = waktuOf(iso);

  return waktu === undefined ? '' : FORMAT_JAM.format(waktu);
}

export function tanggalTeks(iso: string): string {
  const waktu = waktuOf(iso);

  return waktu === undefined ? 'Tanggal tidak dikenal' : FORMAT_TANGGAL.format(waktu);
}

export function tanggalPanjangTeks(iso: string): string {
  const waktu = waktuOf(iso);

  return waktu === undefined ? 'Tanggal tidak dikenal' : FORMAT_TANGGAL_PANJANG.format(waktu);
}

export function tanggalJamTeks(iso: string): string {
  const tanggal = tanggalTeks(iso);

  if (tanggal === 'Tanggal tidak dikenal') {
    return tanggal;
  }

  return `${tanggal}, ${jamTeks(iso)}`;
}

export function rentangJam(startsAt: string, endsAt: string | null): string {
  const mulai = jamTeks(startsAt);

  if (mulai.length === 0) {
    return '';
  }

  if (endsAt === null) {
    return mulai;
  }

  const selesai = jamTeks(endsAt);

  if (selesai.length === 0) {
    return mulai;
  }

  return tanggalTeks(startsAt) === tanggalTeks(endsAt)
    ? `${mulai}–${selesai}`
    : `${tanggalJamTeks(startsAt)} – ${tanggalJamTeks(endsAt)}`;
}