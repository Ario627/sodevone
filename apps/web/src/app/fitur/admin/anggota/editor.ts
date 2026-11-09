import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MemberRosterSchema, type MemberInput } from '@kelas/contracts';
import { firstValueFrom } from 'rxjs';
import {
  alamatRoster,
  barisBaru,
  bacaRoster,
  dariAdmin,
  keMasukan,
  permintaanRoster,
  type BarisAnggota,
} from '../../../inti/api/admin-anggota.api';
import { toApiFailure } from '../../../inti/api/dasar';
import { GalatMuat } from '../../../komponen/galat-muat/galat-muat';
import { Memuat } from '../../../komponen/memuat/memuat';

const KELAS_ISIAN =
  'block min-h-10 w-full border border-garis-halus bg-latar-panel px-2 py-1.5 text-sm text-teks-utama transition-colors duration-100 ease-keluar focus:border-garis-tegas focus:outline-none';

const BATAS_SISWA = 60;

@Component({
  selector: 'kelas-editor-admin-anggota',
  imports: [RouterLink, Memuat, GalatMuat],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <h1 class="font-serif text-2xl leading-tight tracking-[-0.03em] sm:text-3xl">Anggota kelas</h1>
        <p class="mt-2 max-w-[52ch] text-sm text-teks-kuat-sekunder">
          Nama, nama panggilan, hobi, dan catatan yang muncul di ruang kelas tiga dimensi. Kursi
          mengikuti urutan baris di bawah.
        </p>
      </div>

      <p class="teks-meta text-teks-sekunder">{{ baris().length }} baris</p>
    </div>

    @if (sedangMemuat()) {
      <kelas-memuat class="mt-8" pesan="Memuat anggota" [jumlah]="4" />
    } @else if (galatMuat(); as kegagalan) {
      <kelas-galat-muat
        class="mt-8"
        [pesan]="kegagalan.message"
        [korelasi]="kegagalan.correlationId"
        (cobaLagi)="muatUlang()"
      />
    } @else {
      <div class="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" class="{{ tombol }}" (click)="tambah()">Tambah siswa</button>
        <button type="button" class="{{ tombol }}" [disabled]="!bisaSimpan()" (click)="simpan()">
          {{ sedangSimpan() ? 'Menyimpan…' : 'Simpan urutan' }}
        </button>
        <button type="button" class="{{ tombol }}" (click)="kembalikan()" [disabled]="!kotor()">
          Batalkan perubahan
        </button>
      </div>

      @if (pesan(); as kabar) {
        <p class="teks-meta mt-3 text-berhasil">{{ kabar }}</p>
      }

      @if (galat(); as kegagalan) {
        <p class="teks-meta mt-3 text-galat">{{ kegagalan }}</p>
      }

      <div class="scrollbar-none mt-6 overflow-x-auto border-t border-garis-halus">
        <table class="w-full min-w-[54rem] border-collapse text-left">
          <thead>
            <tr class="border-b border-garis-halus">
              <th class="teks-meta py-2 pr-2 font-normal text-teks-sekunder">#</th>
              <th class="teks-meta py-2 pr-2 font-normal text-teks-sekunder">Peran</th>
              <th class="teks-meta py-2 pr-2 font-normal text-teks-sekunder">Nama lengkap</th>
              <th class="teks-meta py-2 pr-2 font-normal text-teks-sekunder">Panggilan</th>
              <th class="teks-meta py-2 pr-2 font-normal text-teks-sekunder">Hobi</th>
              <th class="teks-meta py-2 pr-2 font-normal text-teks-sekunder">Catatan</th>
              <th class="teks-meta py-2 pr-2 font-normal text-teks-sekunder">Tampil</th>
              <th class="teks-meta py-2 font-normal text-teks-sekunder"></th>
            </tr>
          </thead>

          <tbody>
            @for (item of baris(); track item.kunci; let i = $index) {
              <tr class="border-b border-garis-halus align-top">
                <td class="teks-meta py-2 pr-2 text-teks-sekunder">{{ i + 1 }}</td>

                <td class="py-2 pr-2">
                  <select
                    class="{{ isian }}"
                    [value]="item.role"
                    (change)="ubah(i, 'role', $event)"
                    aria-label="Peran baris {{ i + 1 }}"
                  >
                    <option value="student">Siswa</option>
                    <option value="homeroom">Wali kelas</option>
                  </select>
                </td>

                <td class="py-2 pr-2">
                  <input
                    type="text"
                    maxlength="80"
                    class="{{ isian }}"
                    [value]="item.fullName"
                    (input)="ubah(i, 'fullName', $event)"
                    aria-label="Nama lengkap baris {{ i + 1 }}"
                  />
                </td>

                <td class="py-2 pr-2">
                  <input
                    type="text"
                    maxlength="32"
                    class="{{ isian }}"
                    [value]="item.nickname"
                    (input)="ubah(i, 'nickname', $event)"
                    aria-label="Nama panggilan baris {{ i + 1 }}"
                  />
                </td>

                <td class="py-2 pr-2">
                  <input
                    type="text"
                    maxlength="48"
                    class="{{ isian }}"
                    [value]="item.hobby"
                    (input)="ubah(i, 'hobby', $event)"
                    aria-label="Hobi baris {{ i + 1 }}"
                  />
                </td>

                <td class="py-2 pr-2">
                  <input
                    type="text"
                    maxlength="200"
                    class="{{ isian }}"
                    [value]="item.note"
                    (input)="ubah(i, 'note', $event)"
                    aria-label="Catatan baris {{ i + 1 }}"
                  />
                </td>

                <td class="py-2 pr-2">
                  <label class="flex min-h-10 items-center gap-2">
                    <input
                      type="checkbox"
                      class="size-4 accent-[var(--color-sinyal)]"
                      [checked]="item.isPublished"
                      (change)="ubahTampil(i, $event)"
                      aria-label="Tampilkan baris {{ i + 1 }}"
                    />
                  </label>
                </td>

                <td class="py-2">
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      class="teks-meta min-h-9 px-1.5 text-teks-sekunder hover:text-sinyal disabled:opacity-30"
                      [disabled]="i === 0"
                      (click)="geser(i, -1)"
                      aria-label="Naikkan baris {{ i + 1 }}"
                    >
                      &uarr;
                    </button>

                    <button
                      type="button"
                      class="teks-meta min-h-9 px-1.5 text-teks-sekunder hover:text-sinyal disabled:opacity-30"
                      [disabled]="i === baris().length - 1"
                      (click)="geser(i, 1)"
                      aria-label="Turunkan baris {{ i + 1 }}"
                    >
                      &darr;
                    </button>

                    <button
                      type="button"
                      class="teks-meta min-h-9 px-1.5 text-teks-sekunder hover:text-galat"
                      (click)="hapus(i)"
                      aria-label="Hapus baris {{ i + 1 }}"
                    >
                      &times;
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <p class="mt-4 max-w-[58ch] text-sm leading-relaxed text-teks-sekunder">
        Siswa dengan kotak tampil mati tetap tersimpan, tapi tidak muncul di ruang kelas. Hanya
        boleh ada satu baris berperan wali kelas.
      </p>

      <a
        routerLink="/kelas"
        class="teks-meta mt-4 inline-flex min-h-11 items-center gap-1.5 border-b border-garis-tegas pb-1 text-teks-kuat-sekunder hover:border-sinyal hover:text-sinyal"
        >Lihat ruang kelas &rarr;</a
      >
    }
  `,
})
export class EditorAdminAnggota {
  private readonly http = inject(HttpClient);

  protected readonly isian = KELAS_ISIAN;

  protected readonly tombol =
    'teks-meta inline-flex min-h-11 items-center border border-garis-halus px-3 transition-colors duration-100 ease-keluar hover:border-garis-tegas disabled:opacity-40';

  private readonly sumber = httpResource(permintaanRoster, { parse: bacaRoster });

  private readonly awal = computed<readonly BarisAnggota[]>(() => {
    const sumber = this.sumber;

    return sumber.hasValue() ? dariAdmin(sumber.value().items) : [];
  });

  protected readonly baris = linkedSignal(() => [...this.awal()]);

  protected readonly sedangMemuat = this.sumber.isLoading;

  protected readonly galatMuat = computed(() => {
    const kegagalan = this.sumber.error();

    return kegagalan === undefined ? undefined : toApiFailure(kegagalan);
  });

  protected readonly sedangSimpan = signal(false);
  protected readonly pesan = signal<string | undefined>(undefined);
  protected readonly galat = signal<string | undefined>(undefined);

  protected readonly kotor = computed(
    () =>
      this.baris().some((item, indeks) => item !== this.awal()[indeks]) ||
      this.baris().length !== this.awal().length,
  );

  protected readonly bisaSimpan = computed(() => !this.sedangSimpan() && this.kotor());

  protected ubah(indeks: number, kolom: keyof MemberInput, peristiwa: Event): void {
    const sasaran = peristiwa.target as HTMLInputElement | HTMLSelectElement;
    const nilai = sasaran.value;

    this.baris.update((daftar) =>
      daftar.map((item, posisi) => (posisi === indeks ? { ...item, [kolom]: nilai } : item)),
    );
  }

  protected ubahTampil(indeks: number, peristiwa: Event): void {
    const sasaran = peristiwa.target as HTMLInputElement;
    const nilai = sasaran.checked;

    this.baris.update((daftar) =>
      daftar.map((item, posisi) => (posisi === indeks ? { ...item, isPublished: nilai } : item)),
    );
  }

  protected tambah(): void {
    if (this.baris().length >= BATAS_SISWA) {
      return;
    }

    this.baris.update((daftar) => [...daftar, barisBaru(daftar.length + 1)]);
  }

  protected hapus(indeks: number): void {
    this.baris.update((daftar) => daftar.filter((_, posisi) => posisi !== indeks));
  }

  protected geser(indeks: number, arah: number): void {
    const daftar = [...this.baris()];
    const target = indeks + arah;
    const kini = daftar[indeks];
    const tukar = daftar[target];

    if (kini === undefined || tukar === undefined) {
      return;
    }

    daftar[indeks] = tukar;
    daftar[target] = kini;
    this.baris.set(daftar);
  }

  protected kembalikan(): void {
    this.baris.set([...this.awal()]);
    this.pesan.set(undefined);
    this.galat.set(undefined);
  }

  protected muatUlang(): void {
    this.sumber.reload();
  }

  protected simpan(): void {
    void this.prosesSimpan();
  }

  private async prosesSimpan(): Promise<void> {
    if (!this.bisaSimpan()) {
      return;
    }

    const terbaca = MemberRosterSchema.safeParse({ items: keMasukan(this.baris()) });

    if (!terbaca.success) {
      this.galat.set(terbaca.error.issues[0]?.message ?? 'Isian belum lengkap.');
      this.pesan.set(undefined);

      return;
    }

    this.sedangSimpan.set(true);
    this.galat.set(undefined);
    this.pesan.set(undefined);

    try {
      await firstValueFrom(this.http.put(alamatRoster(), terbaca.data));

      this.pesan.set('Daftar anggota tersimpan.');
      this.sumber.reload();
    } catch (galat) {
      this.galat.set(toApiFailure(galat).message);
    } finally {
      this.sedangSimpan.set(false);
    }
  }
}