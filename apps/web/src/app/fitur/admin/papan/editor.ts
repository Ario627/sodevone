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
import {
  VOXEL_COLORS,
  VOXEL_GLYPH_HEIGHT,
  type VoxelBoard,
  type VoxelColor,
} from '@kelas/contracts';
import { firstValueFrom } from 'rxjs';
import {
  TOKEN_WARNA,
  alamatPapanPiksel,
  bacaPengaturan,
  permintaanPengaturan,
} from '../../../inti/api/pengaturan.api';
import { toApiFailure } from '../../../inti/api/dasar';
import { TINGGI_GLYPH, lebarTeks, titikTeks } from '../../../inti/piksel/glyph';
import { GalatMuat } from '../../../komponen/galat-muat/galat-muat';
import { Memuat } from '../../../komponen/memuat/memuat';

const LABEL_WARNA: Record<VoxelColor, string> = {
  sinyal: 'Sinyal',
  tinta: 'Tinta',
  batu: 'Batu',
  hijau: 'Hijau',
};

const KOLOM_MIN = 5;
const KOLOM_MAKS = 32;
const BARIS_MIN = VOXEL_GLYPH_HEIGHT;
const BARIS_MAKS = 16;
const TEKS_MAKS = 16;

const KELAS_ISIAN =
  'mt-1.5 block min-h-11 w-full border border-garis-halus bg-latar-panel px-3 py-2 text-sm text-teks-utama transition-colors duration-100 ease-keluar focus:border-garis-tegas focus:outline-none focus-visible:outline-2 focus-visible:outline-sinyal';

const KELAS_LABEL = 'teks-meta block text-teks-sekunder';

const KELAS_TOMBOL =
  'teks-meta inline-flex min-h-11 items-center border border-garis-halus px-3 transition-colors duration-100 ease-keluar hover:border-garis-tegas disabled:opacity-40';

function barisKosong(kolom: number): string {
  return '0'.repeat(kolom);
}

function dariTeks(teks: string, kolomLama: number): readonly string[] {
  const titik = titikTeks(teks);
  const lebar = Math.max(lebarTeks(teks), KOLOM_MIN);
  const kolom = Math.min(Math.max(lebar, kolomLama, KOLOM_MIN), KOLOM_MAKS);
  const baris = Array.from({ length: TINGGI_GLYPH }, () => barisKosong(kolom));

  for (const satu of titik) {
    const isi = baris[satu.baris];

    if (isi === undefined || satu.kolom >= kolom) {
      continue;
    }

    baris[satu.baris] = `${isi.slice(0, satu.kolom)}1${isi.slice(satu.kolom + 1)}`;
  }

  return baris;
}

@Component({
  selector: 'kelas-editor-admin-papan',
  imports: [RouterLink, Memuat, GalatMuat],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <h1 class="font-serif text-2xl leading-tight tracking-[-0.03em] sm:text-3xl">
          Papan piksel
        </h1>
        <p class="mt-2 max-w-[52ch] text-sm text-teks-kuat-sekunder">
          Isi monogram besar di beranda. Bisa satu kata pendek, atau gambar sendiri
          kotak demi kotak.
        </p>
      </div>

      <a
        routerLink="/"
        class="teks-meta inline-flex min-h-11 items-center text-teks-sekunder hover:text-sinyal"
        >Lihat beranda &rarr;</a
      >
    </div>

    @if (sedangMemuat()) {
      <kelas-memuat class="mt-8" pesan="Memuat papan" [jumlah]="3" />
    } @else if (galatMuat(); as kegagalan) {
      <kelas-galat-muat
        class="mt-8"
        [pesan]="kegagalan.message"
        [korelasi]="kegagalan.correlationId"
        (cobaLagi)="muatUlang()"
      />
    } @else {
      <div class="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="{{ tombol }}"
          [class]="mode() === 'teks' ? 'border-sinyal text-sinyal' : ''"
          (click)="ubahMode('teks')"
        >
          Dari teks
        </button>

        <button
          type="button"
          class="{{ tombol }}"
          [class]="mode() === 'matriks' ? 'border-sinyal text-sinyal' : ''"
          (click)="ubahMode('matriks')"
        >
          Gambar sendiri
        </button>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
        <div class="grid gap-4">
          @if (mode() === 'teks') {
            <div>
              <label class="{{ kelasLabel }}" for="teks">Teks papan</label>
              <input
                id="teks"
                type="text"
                [attr.maxlength]="teksMaks"
                [value]="teks()"
                (input)="ubahTeks($event)"
                class="{{ isian }}"
              />
              <p class="teks-meta mt-1 text-teks-sekunder">
                {{ teks().length }} / {{ teksMaks }} karakter
              </p>
            </div>
          } @else {
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" class="{{ tombol }}" (click)="tambahKolom(-1)">
                &minus; kolom
              </button>
              <button type="button" class="{{ tombol }}" (click)="tambahKolom(1)">
                + kolom
              </button>
              <button type="button" class="{{ tombol }}" (click)="tambahBaris(-1)">
                &minus; baris
              </button>
              <button type="button" class="{{ tombol }}" (click)="tambahBaris(1)">
                + baris
              </button>
              <button type="button" class="{{ tombol }}" (click)="isiDariTeks()">
                Isi dari teks
              </button>
              <button type="button" class="{{ tombol }}" (click)="bersihkan()">Kosongkan</button>
            </div>

            <p class="teks-meta text-teks-sekunder">
              {{ kolom() }} × {{ baris().length }} · klik kotak untuk menyalakan
            </p>

            <div class="scrollbar-none overflow-x-auto">
              <div
                class="inline-grid gap-px border border-garis-halus bg-garis-halus"
                [style.grid-template-columns]="'repeat(' + kolom() + ', 1.35rem)'"
              >
                @for (isi of baris(); track $index; let r = $index) {
                  @for (sel of selDari(isi); track $index; let c = $index) {
                    <button
                      type="button"
                      class="aspect-square transition-colors duration-75 ease-keluar"
                      [class]="
                        sel === '1' ? 'bg-sinyal' : 'bg-latar-halaman hover:bg-latar-sekunder'
                      "
                      (click)="alihkan(r, c)"
                      [attr.aria-label]="'Baris ' + (r + 1) + ' kolom ' + (c + 1)"
                      [attr.aria-pressed]="sel === '1'"
                    ></button>
                  }
                }
              </div>
            </div>
          }

          <div>
            <span class="{{ kelasLabel }}">Warna</span>
            <div class="mt-1.5 flex flex-wrap items-center gap-2">
              @for (warna of warnaTersedia; track warna) {
                <button
                  type="button"
                  class="teks-meta inline-flex min-h-11 items-center gap-2 border px-3 transition-colors duration-100 ease-keluar"
                  [class]="
                    pilihanWarna() === warna
                      ? 'border-sinyal text-sinyal'
                      : 'border-garis-halus text-teks-sekunder hover:border-garis-tegas'
                  "
                  (click)="ubahWarna(warna)"
                >
                  <span
                    aria-hidden="true"
                    class="size-3"
                    [style.background-color]="'var(' + token(warna) + ')'"
                  ></span>
                  {{ label(warna) }}
                </button>
              }
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3 border-t border-garis-halus pt-5">
            <button
              type="button"
              [disabled]="!bisaSimpan()"
              class="teks-meta inline-flex min-h-11 items-center border px-4 transition-colors duration-100 ease-keluar disabled:opacity-45"
              [class]="bisaSimpan() ? 'border-sinyal text-sinyal' : 'border-garis-halus'"
              (click)="simpan()"
            >
              {{ sedangSimpan() ? 'Menyimpan…' : 'Simpan papan' }}
            </button>

            <button
              type="button"
              class="{{ tombol }}"
              [disabled]="!kotor()"
              (click)="kembalikan()"
            >
              Batalkan
            </button>
          </div>

          @if (pesan(); as kabar) {
            <p class="teks-meta text-berhasil">{{ kabar }}</p>
          }

          @if (galat(); as kegagalan) {
            <p class="teks-meta text-galat">{{ kegagalan }}</p>
          }
        </div>

        <aside class="border border-garis-halus">
          <p class="teks-meta border-b border-garis-halus px-3 py-2 text-teks-sekunder">
            Pratinjau
          </p>

          <div class="grid gap-px bg-garis-halus p-3" [style.grid-template-columns]="kolomPratinjau()">
            @for (isi of barisPratinjau(); track $index) {
              @for (sel of selDari(isi); track $index) {
                <span
                  class="aspect-square"
                  [class]="sel === '1' ? 'bg-sinyal' : 'bg-latar-halaman'"
                ></span>
              }
            }
          </div>
        </aside>
      </div>
    }
  `,
})
export class EditorAdminPapan {
  private readonly http = inject(HttpClient);

  protected readonly isian = KELAS_ISIAN;
  protected readonly kelasLabel = KELAS_LABEL;
  protected readonly tombol = KELAS_TOMBOL;
  protected readonly teksMaks = TEKS_MAKS;
  protected readonly warnaTersedia = VOXEL_COLORS;

  private readonly sumber = httpResource(permintaanPengaturan, { parse: bacaPengaturan });

  private readonly awal = computed<VoxelBoard>(() => {
    const sumber = this.sumber;

    return sumber.hasValue()
      ? sumber.value().voxelBoard
      : { kind: 'teks', teks: 'XI', warna: 'sinyal' };
  });

  protected readonly mode = linkedSignal<'teks' | 'matriks'>(() => this.awal().kind);

  protected readonly teks = linkedSignal(() => {
    const awal = this.awal();

    return awal.kind === 'teks' ? awal.teks : '';
  });

  protected readonly mentah = linkedSignal<readonly string[]>(() => {
    const awal = this.awal();

    return awal.kind === 'matriks' ? awal.baris : dariTeks(awal.teks, KOLOM_MIN);
  });

  protected readonly pilihanWarna = linkedSignal<VoxelColor>(() => this.awal().warna);

  protected readonly sedangMemuat = this.sumber.isLoading;

  protected readonly galatMuat = computed(() => {
    const kegagalan = this.sumber.error();

    return kegagalan === undefined ? undefined : toApiFailure(kegagalan);
  });

  protected readonly sedangSimpan = signal(false);
  protected readonly pesan = signal<string | undefined>(undefined);
  protected readonly galat = signal<string | undefined>(undefined);

  protected readonly kolom = computed(() => this.mentah()[0]?.length ?? KOLOM_MIN);

  protected readonly baris = computed(() => this.mentah());

  protected readonly barisPratinjau = computed<readonly string[]>(() => {
    const mode = this.mode();

    return mode === 'matriks' ? this.mentah() : dariTeks(this.teks(), KOLOM_MIN);
  });

  protected readonly kolomPratinjau = computed(
    () => `repeat(${this.barisPratinjau()[0]?.length ?? KOLOM_MIN}, 1.15rem)`,
  );

  protected readonly kotor = computed(() => {
    const awal = this.awal();

    if (this.mode() !== awal.kind) {
      return true;
    }

    if (this.pilihanWarna() !== awal.warna) {
      return true;
    }

    return awal.kind === 'teks' ? this.teks() !== awal.teks : this.mentah() !== awal.baris;
  });

  protected readonly bisaSimpan = computed(
    () => !this.sedangSimpan() && this.kotor() && this.teks() !== undefined,
  );

  protected label(warna: VoxelColor): string {
    return LABEL_WARNA[warna];
  }

  protected token(warna: VoxelColor): string {
    return TOKEN_WARNA[warna];
  }

  protected selDari(isi: string): readonly string[] {
    return [...isi];
  }

  protected ubahMode(mode: 'teks' | 'matriks'): void {
    this.mode.set(mode);
  }

  protected ubahTeks(peristiwa: Event): void {
    this.teks.set((peristiwa.target as HTMLInputElement).value);
  }

  protected ubahWarna(warna: VoxelColor): void {
    this.pilihanWarna.set(warna);
  }

  protected alihkan(baris: number, kolom: number): void {
    this.mentah.update((daftar) =>
      daftar.map((isi, r) => {
        if (r !== baris) {
          return isi;
        }

        const nilai = isi[kolom] === '1' ? '0' : '1';

        return `${isi.slice(0, kolom)}${nilai}${isi.slice(kolom + 1)}`;
      }),
    );
  }

  protected tambahKolom(arah: number): void {
    const kolom = this.kolom() + arah;

    if (kolom < KOLOM_MIN || kolom > KOLOM_MAKS) {
      return;
    }

    this.mentah.update((daftar) =>
      daftar.map((isi) => (arah > 0 ? `${isi}0` : isi.slice(0, kolom))),
    );
  }

  protected tambahBaris(arah: number): void {
    const jumlah = this.mentah().length + arah;

    if (jumlah < BARIS_MIN || jumlah > BARIS_MAKS) {
      return;
    }

    this.mentah.update((daftar) =>
      arah > 0 ? [...daftar, barisKosong(this.kolom())] : daftar.slice(0, jumlah),
    );
  }

  protected isiDariTeks(): void {
    this.mentah.set(dariTeks(this.teks(), this.kolom()));
  }

  protected bersihkan(): void {
    this.mentah.update((daftar) => daftar.map(() => barisKosong(this.kolom())));
  }

  protected muatUlang(): void {
    this.sumber.reload();
  }

  protected kembalikan(): void {
    const awal = this.awal();

    this.mode.set(awal.kind);
    this.pilihanWarna.set(awal.warna);

    if (awal.kind === 'teks') {
      this.teks.set(awal.teks);
    } else {
      this.mentah.set(awal.baris);
    }

    this.pesan.set(undefined);
    this.galat.set(undefined);
  }

  protected simpan(): void {
    void this.prosesSimpan();
  }

  private papan(): VoxelBoard {
    return this.mode() === 'teks'
      ? { kind: 'teks', teks: this.teks().trim(), warna: this.pilihanWarna() }
      : { kind: 'matriks', baris: [...this.mentah()], warna: this.pilihanWarna() };
  }

  private async prosesSimpan(): Promise<void> {
    if (!this.bisaSimpan()) {
      return;
    }

    this.sedangSimpan.set(true);
    this.galat.set(undefined);
    this.pesan.set(undefined);

    try {
      await firstValueFrom(this.http.put(alamatPapanPiksel(), { voxelBoard: this.papan() }));

      this.pesan.set('Papan tersimpan. Beranda memakai papan ini.');
      this.sumber.reload();
    } catch (galat) {
      const kegagalan = toApiFailure(galat);

      this.galat.set(kegagalan.message);
    } finally {
      this.sedangSimpan.set(false);
    }
  }
}