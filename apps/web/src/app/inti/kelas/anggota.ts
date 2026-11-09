import type { AnggotaServer } from '../api/anggota.api';

export const BARIS_KURSI = 6;

export const KOLOM_KURSI = 6;

export const JUMLAH_SISWA = BARIS_KURSI * KOLOM_KURSI;

export const WARNA_BAHAN = [
  '--color-batu-700',
  '--color-tinta-600',
  '--color-hijau-600',
  '--color-kuning-700',
  '--color-merah-700',
  '--color-sinyal-600',
] as const;

const CORAK = '250314403521132450501243324105045132';

export interface Kursi {
  readonly baris: number;
  readonly kolom: number;
}

export interface Anggota {
  readonly id: string;
  readonly urut: number;
  readonly nama: string;
  readonly panggilan: string;
  readonly hobi: string;
  readonly catatan: string;
  readonly warna: number;
}

export interface Siswa extends Anggota {
  readonly kursi: Kursi;
}

export function kursiDari(indeks: number): Kursi {
  return {
    baris: Math.floor(indeks / KOLOM_KURSI),
    kolom: indeks % KOLOM_KURSI,
  };
}

export function corakDari(indeks: number): number {
  return Number(CORAK[indeks % CORAK.length] ?? '0');
}

const SISWA: readonly (readonly [string, string, string, string])[] = [
  ['Aditya Pranawa', 'Adit', 'menyusun playlist', 'Kalau ada bug, dia yang pertama bilang "coba restart".'],
  ['Aisyah Nurhaliza', 'Aisyah', 'menulis puisi', 'Selalu ada buku catatan lebih di tasnya.'],
  ['Bagas Wicaksono', 'Bagas', 'futsal', 'Penjaga gawang dadakan tiap jam olahraga.'],
  ['Bunga Larasati', 'Bunga', 'fotografi', 'Memotret apa saja, termasuk galat di papan tulis.'],
  ['Cahyo Nugroho', 'Cahyo', 'servis motor', 'Datang paling pagi, pulang paling akhir.'],
  ['Citra Maharani', 'Citra', 'desain grafis', 'Bikin poster kelas dalam satu malam.'],
  ['Damar Prakoso', 'Damar', 'catur', 'Suka menunda langkah, tapi sering menang.'],
  ['Dinda Ayu Safitri', 'Dinda', 'vokal', 'Suaranya naik kalau lagu favorit diputar.'],
  ['Eka Saputra', 'Eka', 'bersepeda', 'Rute ke sekolah jadi rute latihan.'],
  ['Fahri Ramadhan', 'Fahri', 'speedcubing', 'Rubik selalu ada di tas, selalu.'],
  ['Farida Kusuma', 'Farida', 'memasak', 'Bekalnya paling rapi seangkatan.'],
  ['Gilang Saputro', 'Gilang', 'musik', 'Gitar akustiknya ikut ke kelas.'],
  ['Hana Pertiwi', 'Hana', 'melukis', 'Sketsa di pinggir buku, bukan di halamannya.'],
  ['Ilham Maulana', 'Ilham', 'ngoding', 'Bisa tidur nyenyak setelah compile berhasil.'],
  ['Intan Permata', 'Intan', 'editing video', 'Timeline-nya rapi sampai frame terakhir.'],
  ['Joko Susilo', 'Joko', 'berkebun', 'Bawa tanaman kecil untuk meja kelas.'],
  ['Kirana Wulandari', 'Kirana', 'menari', 'Latihan di koridor waktu jam istirahat.'],
  ['Lutfi Hakim', 'Lutfi', 'robotik', 'Solder dan kabel ada di tasnya.'],
  ['Maya Anggraini', 'Maya', 'membaca', 'Pinjam novel, kembali seminggu kemudian.'],
  ['Naufal Arif', 'Naufal', 'basket', 'Nomor punggung pilihannya selalu ganjil.'],
  ['Nabila Rahma', 'Nabila', 'cosplay', 'Kostumnya dirakit sendiri dari kertas dan kain.'],
  ['Omar Fauzan', 'Omar', 'renang', 'Kalau hujan turun, dia justru senang.'],
  ['Putri Sekar Arum', 'Putri', 'kaligrafi', 'Tulisannya jadi standar papan pengumuman.'],
  ['Qori Ramadhani', 'Qori', 'tahfiz', 'Ngaji pagi sebelum kelas dimulai.'],
  ['Raka Pratama', 'Raka', 'skateboard', 'Papan skate-nya dibawa naik angkot.'],
  ['Rani Oktaviani', 'Rani', 'menyanyi', 'Hafal lirik lagu yang lebih tua dari dirinya.'],
  ['Reza Firdaus', 'Reza', 'bulu tangkis', 'Raketnya bergantian dengan kakaknya.'],
  ['Salma Nur Fadhilah', 'Salma', 'menulis cerita', 'Cerita pendeknya disimpan di catatan HP.'],
  ['Satria Bagus', 'Satria', 'sepeda gunung', 'Serius sekali soal rem.'],
  ['Shafira Zahra', 'Shafira', 'bahasa Jepang', 'Katanya belajar dari anime.'],
  ['Taufik Hidayat', 'Taufik', 'servis laptop', 'Laptop kelas rusak, dia yang buka.'],
  ['Tiara Lestari', 'Tiara', 'merias', 'Paling siap kalau ada foto bareng.'],
  ['Umar Abdillah', 'Umar', 'panahan', 'Sabarnya lebih panjang dari yang lain.'],
  ['Vina Rosalina', 'Vina', 'menyulam', 'Tangan diam, hasilnya rapi.'],
  ['Wira Santoso', 'Wira', 'drum', 'Mengetuk meja jadi pola ketukan.'],
  ['Zahra Amelia', 'Zahra', 'berenang', 'Tanpa pelampung sejak kelas tujuh.'],
];

export const SISWA_LIST: readonly Siswa[] = SISWA.map(
  ([nama, panggilan, hobi, catatan], indeks) => ({
    id: `siswa-${String(indeks + 1).padStart(2, '0')}`,
    urut: indeks + 1,
    nama,
    panggilan,
    hobi,
    catatan,
    warna: corakDari(indeks),
    kursi: kursiDari(indeks),
  }),
);

export const WALI_KELAS: Anggota = {
  id: 'wali-kelas',
  urut: JUMLAH_SISWA + 1,
  nama: 'Ratna Kusumaningrum',
  panggilan: 'Bu Ratna',
  hobi: 'menyusun jadwal',
  catatan: 'Selalu ingat siapa yang belum mengumpulkan, tanpa perlu catatan.',
  warna: 5,
};

export const SEMUA_ANGGOTA: readonly Anggota[] = [...SISWA_LIST, WALI_KELAS];

export const ANGGOTA_CADANGAN = SEMUA_ANGGOTA;

export function dariServer(daftar: readonly AnggotaServer[]): readonly Anggota[] {
  const urut = [...daftar].sort((a, b) => a.order - b.order);
  const peserta = urut.filter((item) => item.role === 'student').slice(0, JUMLAH_SISWA);
  const wali = urut.find((item) => item.role === 'homeroom');

  const siswa = peserta.map((item, indeks) => ({
    id: item.id,
    urut: indeks + 1,
    nama: item.fullName,
    panggilan: item.nickname,
    hobi: item.hobby,
    catatan: item.note,
    warna: corakDari(indeks),
  }));

  if (wali === undefined) {
    return siswa;
  }

  return [
    ...siswa,
    {
      id: wali.id,
      urut: siswa.length + 1,
      nama: wali.fullName,
      panggilan: wali.nickname,
      hobi: wali.hobby,
      catatan: wali.note,
      warna: 5,
    },
  ];
}