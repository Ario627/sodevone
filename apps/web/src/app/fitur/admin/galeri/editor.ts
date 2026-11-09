import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AlbumCreateSchema,
  AlbumUpdateSchema,
  SlugSchema,
  UuidSchema,
  type AlbumStatus,
  type GalleryImage,
} from '@kelas/contracts';
import { firstValueFrom } from 'rxjs';
import {
  alamatAlbum,
  alamatArsipAlbum,
  alamatBuatAlbum,
  alamatFoto,
  alamatPratinjauFoto,
  alamatPulihkanAlbum,
  alamatTerbitkanAlbum,
  alamatUnggahFoto,
  alamatUrutFoto,
  bacaAlbumAdmin,
  bacaUnggahan,
  berkasUnggahan,
  permintaanAlbumAdmin,
} from '../../../inti/api/admin-galeri.api';
import { toApiFailure } from '../../../inti/api/dasar';
import { GalatMuat } from '../../../komponen/galat-muat/galat-muat';
import { Memuat } from '../../../komponen/memuat/memuat';

const LABEL_STATUS: Record<AlbumStatus, string> = {
  draft: 'Draf',
  published: 'Terbit',
  archived: 'Arsip',
};

const KELAS_ISIAN =
  'mt-1.5 block min-h-11 w-full border border-garis-halus bg-latar-panel px-3 py-2 text-sm text-teks-utama transition-colors duration-100 ease-keluar focus:border-garis-tegas focus:outline-none focus-visible:outline-2 focus-visible:outline-sinyal';

const KELAS_LABEL = 'teks-meta block text-teks-sekunder';

const KELAS_TOMBOL =
  'teks-meta inline-flex min-h-11 items-center border border-garis-halus px-3 transition-colors duration-100 ease-keluar hover:border-garis-tegas disabled:opacity-40';

@Component({
  selector: 'kelas-editor-admin-galeri',
  imports: [RouterLink, Memuat, GalatMuat],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <a
          routerLink="/admin/galeri"
          class="teks-meta text-teks-sekunder transition-colors duration-100 ease-keluar hover:text-sinyal"
          >&larr; Galeri</a
        >
        <h1 class="mt-2 font-serif text-2xl leading-tight tracking-[-0.03em] sm:text-3xl">
          {{ id() === undefined ? 'Album baru' : 'Ubah album' }}
        </h1>
      </div>

      @if (status(); as nilai) {
        <p class="teks-meta text-teks-sekunder">{{ label(nilai) }}</p>
      }
    </div>

    @if (tidakValid()) {
      <p class="mt-8 border-y border-garis-halus py-5 text-sm text-teks-sekunder">
        Alamat album tidak dikenali. Kembali ke daftar galeri.
      </p>
    } @else if (sedangMemuat()) {
      <kelas-memuat class="mt-8" pesan="Memuat album" [jumlah]="3" />
    } @else if (galatMuat(); as kegagalan) {
      <kelas-galat-muat
        class="mt-8"
        [pesan]="kegagalan.message"
        [korelasi]="kegagalan.correlationId"
        (cobaLagi)="muatUlang()"
      />
    } @else {
      <form class="mt-8 grid gap-5" (submit)="simpan($event)">
        <div>
          <label class="{{ kelasLabel }}" for="judul">Nama album</label>
          <input
            id="judul"
            type="text"
            maxlength="160"
            [value]="judul()"
            (input)="ubahJudul($event)"
            class="{{ isian }}"
          />
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          <div>
            <label class="{{ kelasLabel }}" for="tanggal">Tanggal kegiatan</label>
            <input
              id="tanggal"
              type="date"
              [value]="tanggal()"
              (input)="ubahTanggal($event)"
              class="{{ isian }}"
            />
          </div>

          <div>
            <label class="{{ kelasLabel }}" for="slug">Slug (opsional)</label>
            <input
              id="slug"
              type="text"
              maxlength="120"
              [value]="slug()"
              (input)="ubahSlug($event)"
              class="{{ isian }}"
            />
          </div>
        </div>

        <div>
          <label class="{{ kelasLabel }}" for="keterangan">Keterangan</label>
          <textarea
            id="keterangan"
            rows="3"
            maxlength="600"
            [value]="keterangan()"
            (input)="ubahKeterangan($event)"
            class="{{ isian }}"
          ></textarea>
        </div>

        <div class="flex flex-wrap items-center gap-3 border-t border-garis-halus pt-5">
          <button
            type="submit"
            [disabled]="!bisaSimpan()"
            class="teks-meta inline-flex min-h-11 items-center border px-4 transition-colors duration-100 ease-keluar disabled:opacity-45"
            [class]="bisaSimpan() ? 'border-sinyal text-sinyal' : 'border-garis-halus'"
          >
            {{ sedangSimpan() ? 'Menyimpan…' : 'Simpan' }}
          </button>

          @if (id(); as albumId) {
            @if (status() === 'draft') {
              <button type="button" class="{{ tombol }}" (click)="ubahStatus('terbit')">
                Terbitkan
              </button>
            }

            @if (status() === 'published') {
              <button type="button" class="{{ tombol }}" (click)="ubahStatus('arsip')">
                Arsipkan
              </button>
            }

            @if (status() === 'archived') {
              <button type="button" class="{{ tombol }}" (click)="ubahStatus('pulih')">
                Pulihkan
              </button>
            }

            <a
              routerLink="/galeri/{{ slug() }}"
              class="teks-meta inline-flex min-h-11 items-center text-teks-sekunder hover:text-sinyal"
              >Lihat di situs</a
            >

            <span class="teks-meta text-teks-sekunder" aria-hidden="true">{{
              albumId.slice(0, 8)
            }}</span>
          }
        </div>

        @if (pesan(); as kabar) {
          <p class="teks-meta text-berhasil">{{ kabar }}</p>
        }

        @if (galat(); as kegagalan) {
          <p class="teks-meta text-galat">{{ kegagalan }}</p>
        }
      </form>

      @if (id(); as albumId) {
        <section class="mt-10 border-t border-garis-halus pt-5">
          <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <h2 class="font-serif text-lg tracking-[-0.02em]">Foto</h2>
            <p class="teks-meta text-teks-sekunder">{{ foto().length }} foto di album</p>
          </div>

          <div class="mt-4 flex flex-wrap items-center gap-3">
            <label
              class="teks-meta inline-flex min-h-11 items-center border border-garis-halus px-3 hover:border-garis-tegas"
            >
              <span>{{ sedangUnggah() ? 'Mengunggah…' : 'Pilih foto' }}</span>
              <input
                type="file"
                class="sr-only"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                [disabled]="sedangUnggah()"
                (change)="unggah($event)"
              />
            </label>

            <p class="teks-meta text-teks-sekunder">Maksimal 10 berkas, 5 MB per berkas.</p>
          </div>

          @if (hasilUnggah(); as hasil) {
            <p class="teks-meta mt-2 text-berhasil">
              {{ hasil.uploaded }} foto masuk, {{ hasil.failed.length }} gagal.
            </p>

            @if (hasil.failed.length > 0) {
              <ul class="mt-2 grid gap-1">
                @for (kegagalan of hasil.failed; track kegagalan.fileName) {
                  <li class="teks-meta text-galat">
                    {{ kegagalan.fileName }} — {{ kegagalan.reason }}
                  </li>
                }
              </ul>
            }
          }

          @if (foto().length === 0) {
            <p class="mt-4 border-y border-garis-halus py-4 text-sm text-teks-sekunder">
              Album ini belum berisi foto.
            </p>
          } @else {
            <ol class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              @for (gambar of foto(); track gambar.id; let i = $index) {
                <li class="border border-garis-halus">
                  <img
                    [src]="pratinjau(albumId, gambar.id)"
                    [attr.alt]="gambar.altText ?? 'Foto album'"
                    [attr.width]="gambar.width"
                    [attr.height]="gambar.height"
                    loading="lazy"
                    decoding="async"
                    class="block w-full bg-latar-sekunder object-cover"
                    style="aspect-ratio: 4 / 3"
                  />

                  <div class="flex flex-wrap items-center gap-1 border-t border-garis-halus p-1.5">
                    <span class="teks-meta mr-auto text-teks-sekunder">
                      {{ i === 0 ? 'sampul' : i + 1 }}
                    </span>

                    <button
                      type="button"
                      class="teks-meta min-h-9 px-1.5 text-teks-sekunder hover:text-sinyal disabled:opacity-30"
                      [disabled]="i === 0"
                      (click)="geser(i, -1)"
                      aria-label="Naikkan foto"
                    >
                      &uarr;
                    </button>

                    <button
                      type="button"
                      class="teks-meta min-h-9 px-1.5 text-teks-sekunder hover:text-sinyal disabled:opacity-30"
                      [disabled]="i === foto().length - 1"
                      (click)="geser(i, 1)"
                      aria-label="Turunkan foto"
                    >
                      &darr;
                    </button>

                    <button
                      type="button"
                      class="teks-meta min-h-9 px-1.5 text-teks-sekunder hover:text-sinyal disabled:opacity-30"
                      [disabled]="sampul() === gambar.id"
                      (click)="jadikanSampul(gambar.id)"
                    >
                      sampul
                    </button>

                    <button
                      type="button"
                      class="teks-meta min-h-9 px-1.5 text-teks-sekunder hover:text-galat disabled:opacity-30"
                      [disabled]="status() !== 'archived'"
                      [attr.title]="
                        status() === 'archived'
                          ? null
                          : 'Arsipkan album dulu untuk menghapus foto permanen'
                      "
                      (click)="hapusFoto(gambar.id)"
                      aria-label="Hapus foto"
                    >
                      hapus
                    </button>
                  </div>
                </li>
              }
            </ol>
            @if (status() !== 'archived') {
              <p class="teks-meta mt-3 text-teks-sekunder">
                Hapus permanen hanya terbuka setelah album diarsipkan.
              </p>
            }
          }
        </section>
      } @else {
        <p
          class="mt-10 max-w-[52ch] border-l-2 border-garis-tegas pl-3 text-sm leading-relaxed text-teks-sekunder"
        >
          Simpan album dulu. Setelah tersimpan, unggahan foto dan pemilihan sampul muncul di sini.
        </p>
      }
    }
  `,
})
export class EditorAdminGaleri {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly id = input<string>();

  protected readonly isian = KELAS_ISIAN;
  protected readonly kelasLabel = KELAS_LABEL;
  protected readonly tombol = KELAS_TOMBOL;

  protected readonly idValid = computed(() => {
    const id = this.id();

    return id === undefined || UuidSchema.safeParse(id).success;
  });

  protected readonly tidakValid = computed(() => this.id() !== undefined && !this.idValid());

  private readonly sumber = httpResource(
    () =>
      this.id() === undefined || !this.idValid()
        ? undefined
        : permintaanAlbumAdmin(this.id() as string),
    { parse: bacaAlbumAdmin },
  );

  private readonly detail = computed(() => {
    const sumber = this.sumber;

    return sumber.hasValue() ? sumber.value() : undefined;
  });

  protected readonly sedangMemuat = this.sumber.isLoading;

  protected readonly galatMuat = computed(() => {
    const kegagalan = this.sumber.error();

    return kegagalan === undefined ? undefined : toApiFailure(kegagalan);
  });

  protected readonly judul = linkedSignal(() => this.detail()?.title ?? '');
  protected readonly keterangan = linkedSignal(() => this.detail()?.description ?? '');
  protected readonly slug = linkedSignal(() => this.detail()?.slug ?? '');
  protected readonly tanggal = linkedSignal(() => this.detail()?.eventDate ?? '');

  protected readonly status = computed<AlbumStatus | undefined>(() => this.detail()?.status);
  protected readonly sampul = computed(() => this.detail()?.coverImageId ?? null);

  protected readonly foto = computed<readonly GalleryImage[]>(() => {
    const isi = this.detail()?.images ?? [];

    return [...isi].sort((kiri, kanan) => kiri.sortOrder - kanan.sortOrder);
  });

  protected readonly sedangSimpan = signal(false);
  protected readonly sedangStatus = signal(false);
  protected readonly sedangUnggah = signal(false);
  protected readonly pesan = signal<string | undefined>(undefined);
  protected readonly galat = signal<string | undefined>(undefined);
  protected readonly hasilUnggah = signal<
    { uploaded: number; failed: { fileName: string; reason: string }[] } | undefined
  >(undefined);

  protected readonly adaPerubahan = computed(() => {
    const awal = this.detail();

    if (awal === undefined) {
      return this.judul().trim().length > 2 && this.tanggal().length === 10;
    }

    return (
      awal.title !== this.judul() ||
      (awal.description ?? '') !== this.keterangan() ||
      awal.slug !== this.slug() ||
      awal.eventDate !== this.tanggal()
    );
  });

  protected readonly bisaSimpan = computed(
    () => !this.sedangSimpan() && this.adaPerubahan() && this.tanggal().length === 10,
  );

  protected label(nilai: AlbumStatus): string {
    return LABEL_STATUS[nilai];
  }

  protected pratinjau(albumId: string, imageId: string): string {
    return alamatPratinjauFoto(albumId, imageId, 'kecil');
  }

  protected ubahJudul(peristiwa: Event): void {
    this.judul.set((peristiwa.target as HTMLInputElement).value);
  }

  protected ubahKeterangan(peristiwa: Event): void {
    this.keterangan.set((peristiwa.target as HTMLTextAreaElement).value);
  }

  protected ubahSlug(peristiwa: Event): void {
    this.slug.set((peristiwa.target as HTMLInputElement).value);
  }

  protected ubahTanggal(peristiwa: Event): void {
    this.tanggal.set((peristiwa.target as HTMLInputElement).value);
  }

  protected muatUlang(): void {
    this.sumber.reload();
  }

  protected simpan(peristiwa: Event): void {
    peristiwa.preventDefault();
    void this.prosesSimpan();
  }

  protected ubahStatus(arah: 'terbit' | 'arsip' | 'pulih'): void {
    void this.prosesStatus(arah);
  }

  protected unggah(peristiwa: Event): void {
    void this.prosesUnggah(peristiwa);
  }

  protected geser(indeks: number, arah: number): void {
    void this.prosesGeser(indeks, arah);
  }

  protected jadikanSampul(imageId: string): void {
    void this.prosesSampul(imageId);
  }

  protected hapusFoto(imageId: string): void {
    void this.prosesHapus(imageId);
  }

  private masukan(): Record<string, unknown> {
    const slug = this.slug().trim();
    const keterangan = this.keterangan().trim();

    return {
      title: this.judul(),
      description: keterangan.length > 0 ? keterangan : null,
      eventDate: this.tanggal(),
      slug: slug.length > 0 && SlugSchema.safeParse(slug).success ? slug : undefined,
    };
  }

  private async prosesSimpan(): Promise<void> {
    if (!this.bisaSimpan()) {
      return;
    }

    const id = this.id();
    const detail = this.detail();

    const terbaca =
      id === undefined
        ? AlbumCreateSchema.safeParse(this.masukan())
        : AlbumUpdateSchema.safeParse(this.masukan());

    if (!terbaca.success) {
      this.galat.set(terbaca.error.issues[0]?.message ?? 'Isian belum lengkap.');
      this.pesan.set(undefined);

      return;
    }

    this.sedangSimpan.set(true);
    this.galat.set(undefined);
    this.pesan.set(undefined);

    try {
      if (id === undefined) {
        const dibuat = (await firstValueFrom(this.http.post(alamatBuatAlbum(), terbaca.data))) as {
          id: string;
        };

        this.pesan.set('Album tersimpan. Sekarang unggah fotonya.');
        await this.router.navigate(['/admin/galeri', dibuat.id]);

        return;
      }

      await firstValueFrom(
        this.http.patch(alamatAlbum(id), terbaca.data, {
          headers: detail === undefined ? {} : { 'If-Match': `"${detail.updatedAt}"` },
        }),
      );

      this.pesan.set('Perubahan tersimpan.');
      this.sumber.reload();
    } catch (galat) {
      this.galat.set(toApiFailure(galat).message);
    } finally {
      this.sedangSimpan.set(false);
    }
  }

  private async prosesStatus(arah: 'terbit' | 'arsip' | 'pulih'): Promise<void> {
    const id = this.id();
    const versi = this.detail()?.updatedAt;

    if (id === undefined || versi === undefined || this.sedangStatus()) {
      return;
    }

    const alamat =
      arah === 'terbit'
        ? alamatTerbitkanAlbum(id)
        : arah === 'arsip'
          ? alamatArsipAlbum(id)
          : alamatPulihkanAlbum(id);

    const kabar =
      arah === 'terbit'
        ? 'Album diterbitkan.'
        : arah === 'arsip'
          ? 'Album diarsipkan.'
          : 'Album dipulihkan.';

    this.sedangStatus.set(true);
    this.galat.set(undefined);
    this.pesan.set(undefined);

    try {
      await firstValueFrom(this.http.post(alamat, {}, { headers: { 'If-Match': `"${versi}"` } }));

      this.pesan.set(kabar);
      this.sumber.reload();
    } catch (galat) {
      this.galat.set(toApiFailure(galat).message);
    } finally {
      this.sedangStatus.set(false);
    }
  }

  private async prosesUnggah(peristiwa: Event): Promise<void> {
    const id = this.id();
    const masukan = peristiwa.target as HTMLInputElement;
    const berkas = Array.from(masukan.files ?? []);

    masukan.value = '';

    if (id === undefined || berkas.length === 0 || this.sedangUnggah()) {
      return;
    }

    this.sedangUnggah.set(true);
    this.galat.set(undefined);
    this.pesan.set(undefined);
    this.hasilUnggah.set(undefined);

    try {
      const hasil = bacaUnggahan(
        await firstValueFrom(this.http.post(alamatUnggahFoto(id), berkasUnggahan(berkas))),
      );

      this.hasilUnggah.set({ uploaded: hasil.uploaded.length, failed: hasil.failed });
      this.sumber.reload();
    } catch (galat) {
      this.galat.set(toApiFailure(galat).message);
    } finally {
      this.sedangUnggah.set(false);
    }
  }

  private async prosesGeser(indeks: number, arah: number): Promise<void> {
    const id = this.id();
    const daftar = [...this.foto()];
    const target = indeks + arah;
    const kini = daftar[indeks];
    const tukar = daftar[target];

    if (id === undefined || kini === undefined || tukar === undefined) {
      return;
    }

    daftar[indeks] = tukar;
    daftar[target] = kini;

    try {
      await firstValueFrom(
        this.http.patch(alamatUrutFoto(id), { ids: daftar.map((item) => item.id) }),
      );

      this.sumber.reload();
    } catch (galat) {
      this.galat.set(toApiFailure(galat).message);
    }
  }

  private async prosesSampul(imageId: string): Promise<void> {
    const id = this.id();

    if (id === undefined) {
      return;
    }

    try {
      await firstValueFrom(this.http.patch(alamatAlbum(id), { coverImageId: imageId }));

      this.pesan.set('Sampul album diganti.');
      this.sumber.reload();
    } catch (galat) {
      this.galat.set(toApiFailure(galat).message);
    }
  }

  private async prosesHapus(imageId: string): Promise<void> {
    const id = this.id();

    if (id === undefined) {
      return;
    }

    try {
      await firstValueFrom(this.http.delete(alamatFoto(id, imageId)));

      this.pesan.set('Foto dihapus.');
      this.sumber.reload();
    } catch (galat) {
      this.galat.set(toApiFailure(galat).message);
    }
  }
}