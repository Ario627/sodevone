import { pathToFileURL } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { classMember } from './schema/class-member.js';
import type { ClassMemberInsert } from './schema/class-member.js';
import * as schema from './schema/index.js';

const REPLACE_FLAG = '--replace';

type SeedRow = {
  fullName: string;
  nickname: string;
  hobby: string;
  note: string;
};

const STUDENTS: readonly SeedRow[] = [
  {
    fullName: 'ABDILLAH KUKUH PRAKOSO',
    nickname: 'Kukuh',
    hobby: 'menyusun playlist',
    note: 'Kalau ada bug, dia yang pertama bilang "coba restart".',
  },
  {
    fullName: 'Alfeda',
    nickname: 'Alfeda',
    hobby: 'menulis puisi',
    note: 'Selalu ada buku catatan lebih di tasnya.',
  },
  {
    fullName: 'Alwalia',
    nickname: 'Bagas',
    hobby: 'futsal',
    note: 'Penjaga gawang dadakan tiap jam olahraga.',
  },
  {
    fullName: 'Anggun Kanza J',
    nickname: 'Bunga',
    hobby: 'fotografi',
    note: 'Memotret apa saja, termasuk galat di papan tulis.',
  },
  {
    fullName: 'Arfa',
    nickname: 'Cahyo',
    hobby: 'servis motor',
    note: 'Datang paling pagi, pulang paling akhir.',
  },
  {
    fullName: 'Ario Abdillah Sajad',
    nickname: 'Ario',
    hobby: 'ngoding',
    note: 'Tiada hari tanpa ngoding.',
  },
  {
    fullName: 'Aurel',
    nickname: 'Damar',
    hobby: 'catur',
    note: 'Suka menunda langkah, tapi sering menang.',
  },
  {
    fullName: 'Bagas',
    nickname: 'Dinda',
    hobby: 'vokal',
    note: 'Suaranya naik kalau lagu favorit diputar.',
  },
  {
    fullName: 'Bintang Dwi Syahputra',
    nickname: 'Bintang',
    hobby: 'bersepeda',
    note: 'Rute ke sekolah jadi rute latihan.',
  },
  {
    fullName: 'Bunga',
    nickname: 'Bunga',
    hobby: 'speedcubing',
    note: 'Rubik selalu ada di tas, selalu.',
  },
  {
    fullName: 'Caca',
    nickname: 'Farida',
    hobby: 'memasak',
    note: 'Bekalnya paling rapi seangkatan.',
  },
  {
    fullName: 'Celine',
    nickname: 'Gilang',
    hobby: 'musik',
    note: 'Gitar akustiknya ikut ke kelas.',
  },
  {
    fullName: 'Hana Pertiwi',
    nickname: 'Hana',
    hobby: 'melukis',
    note: 'Sketsa di pinggir buku, bukan di halamannya.',
  },
  {
    fullName: 'Ilham Maulana',
    nickname: 'Ilham',
    hobby: 'ngoding',
    note: 'Bisa tidur nyenyak setelah compile berhasil.',
  },
  {
    fullName: 'Intan Permata',
    nickname: 'Intan',
    hobby: 'editing video',
    note: 'Timeline-nya rapi sampai frame terakhir.',
  },
  {
    fullName: 'Joko Susilo',
    nickname: 'Joko',
    hobby: 'berkebun',
    note: 'Bawa tanaman kecil untuk meja kelas.',
  },
  {
    fullName: 'Kirana Wulandari',
    nickname: 'Kirana',
    hobby: 'menari',
    note: 'Latihan di koridor waktu jam istirahat.',
  },
  {
    fullName: 'Lutfi Hakim',
    nickname: 'Lutfi',
    hobby: 'robotik',
    note: 'Solder dan kabel ada di tasnya.',
  },
  {
    fullName: 'Maya Anggraini',
    nickname: 'Maya',
    hobby: 'membaca',
    note: 'Pinjam novel, kembali seminggu kemudian.',
  },
  {
    fullName: 'Naufal Arif',
    nickname: 'Naufal',
    hobby: 'basket',
    note: 'Nomor punggung pilihannya selalu ganjil.',
  },
  {
    fullName: 'Nabila Rahma',
    nickname: 'Nabila',
    hobby: 'cosplay',
    note: 'Kostumnya dirakit sendiri dari kertas dan kain.',
  },
  {
    fullName: 'Omar Fauzan',
    nickname: 'Omar',
    hobby: 'renang',
    note: 'Kalau hujan turun, dia justru senang.',
  },
  {
    fullName: 'Putri Sekar Arum',
    nickname: 'Putri',
    hobby: 'kaligrafi',
    note: 'Tulisannya jadi standar papan pengumuman.',
  },
  {
    fullName: 'Qori Ramadhani',
    nickname: 'Qori',
    hobby: 'tahfiz',
    note: 'Ngaji pagi sebelum kelas dimulai.',
  },
  {
    fullName: 'Raka Pratama',
    nickname: 'Raka',
    hobby: 'skateboard',
    note: 'Papan skate-nya dibawa naik angkot.',
  },
  {
    fullName: 'Rani Oktaviani',
    nickname: 'Rani',
    hobby: 'menyanyi',
    note: 'Hafal lirik lagu yang lebih tua dari dirinya.',
  },
  {
    fullName: 'Reza Firdaus',
    nickname: 'Reza',
    hobby: 'bulu tangkis',
    note: 'Raketnya bergantian dengan kakaknya.',
  },
  {
    fullName: 'Salma Nur Fadhilah',
    nickname: 'Salma',
    hobby: 'menulis cerita',
    note: 'Cerita pendeknya disimpan di catatan HP.',
  },
  {
    fullName: 'Satria Bagus',
    nickname: 'Satria',
    hobby: 'sepeda gunung',
    note: 'Serius sekali soal rem.',
  },
  {
    fullName: 'Shafira Zahra',
    nickname: 'Shafira',
    hobby: 'bahasa Jepang',
    note: 'Katanya belajar dari anime.',
  },
  {
    fullName: 'Taufik Hidayat',
    nickname: 'Taufik',
    hobby: 'servis laptop',
    note: 'Laptop kelas rusak, dia yang buka.',
  },
  {
    fullName: 'Tiara Lestari',
    nickname: 'Tiara',
    hobby: 'merias',
    note: 'Paling siap kalau ada foto bareng.',
  },
  {
    fullName: 'Umar Abdillah',
    nickname: 'Umar',
    hobby: 'panahan',
    note: 'Sabarnya lebih panjang dari yang lain.',
  },
  {
    fullName: 'Vina Rosalina',
    nickname: 'Vina',
    hobby: 'menyulam',
    note: 'Tangan diam, hasilnya rapi.',
  },
  {
    fullName: 'Wira Santoso',
    nickname: 'Wira',
    hobby: 'drum',
    note: 'Mengetuk meja jadi pola ketukan.',
  },
  {
    fullName: 'Zahra Amelia',
    nickname: 'Zahra',
    hobby: 'berenang',
    note: 'Tanpa pelampung sejak kelas tujuh.',
  },
];

const HOMEROOM: SeedRow = {
  fullName: 'Ratna Kusumaningrum',
  nickname: 'Bu Ratna',
  hobby: 'menyusun jadwal',
  note: 'Selalu ingat siapa yang belum mengumpulkan, tanpa perlu catatan.',
};

function loadEnvFile(): void {
  try {
    process.loadEnvFile();
  } catch {
    return;
  }
}

function requiredOf(name: string): string {
  const value = process.env[name]?.trim();

  if (value === undefined || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function seedRows(): ClassMemberInsert[] {
  const students = STUDENTS.map((row, index) => ({
    ...row,
    role: 'student',
    sortOrder: index,
    isPublished: true,
  }));

  return [
    ...students,
    { ...HOMEROOM, role: 'homeroom', sortOrder: students.length, isPublished: true },
  ];
}

async function run(): Promise<void> {
  loadEnvFile();

  const databaseUrl = requiredOf('DATABASE_URL');
  const replace = process.argv.includes(REPLACE_FLAG);

  const client = postgres(databaseUrl, { max: 1, onnotice: () => undefined });
  const db = drizzle(client, { schema });

  try {
    const existing = await db.select({ id: classMember.id }).from(classMember);

    if (existing.length > 0 && !replace) {
      console.log(`sudah ada ${existing.length} baris anggota; tidak ada yang diubah`);
      console.log('jalankan dengan --replace untuk mengganti seluruh daftar');

      return;
    }

    const rows = seedRows();

    await db.transaction(async (tx) => {
      await tx.delete(classMember);

      if (rows.length > 0) {
        await tx.insert(classMember).values(rows);
      }
    });

    console.log(`${rows.length} baris anggota ditulis (${STUDENTS.length} siswa + 1 wali kelas)`);
  } finally {
    await client.end({ timeout: 5 });
  }
}

const dijalankanLangsung =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (dijalankanLangsung) {
  await run();
}