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
  EventCreateSchema,
  EventUpdateSchema,
  SlugSchema,
  UuidSchema,
  type AlbumListQuery,
  type AlbumSummary,
  type EventPhoto,
  type GalleryImage,
  type EventAdmin,
  type EventStatus,
} from '@kelas/contracts';
import { firstValueFrom } from 'rxjs';
import {
  alamatAgenda,
  alamatArsipAgenda,
  alamatBuatAgenda,
  alamatFotoAgenda,
  alamatPulihkanAgenda,
  alamatTerbitkanAgenda,
  bacaAgendaDetail,
  permintaanAgenda,
} from '../../../inti/api/admin-agenda.api';
import {
  bacaDetailAlbum,
  bacaHalamanAlbum,
  permintaanDaftarAlbum,
  permintaanDetailAlbum,
  sumberFoto,
} from '../../../inti/api/galeri.api';
import { ALBUM_IMAGES_PER_PAGE, EVENT_PHOTO_MAX } from '@kelas/contracts';
import { toApiFailure } from '../../../inti/api/dasar';
import { GalatMuat } from '../../../komponen/galat-muat/galat-muat';
import { Memuat } from '../../../komponen/memuat/memuat';

const LABEL_STATUS: Record<EventStatus, string> = {
  draft: 'Draf',
  published: 'Terbit',
  archived: 'Arsip',
};

const KELAS_ISIAN =
  'mt-1.5 block min-h-11 w-full border border-garis-halus bg-latar-panel px-3 py-2 text-sm text-teks-utama transition-colors duration-100 ease-keluar focus:border-garis-tegas focus:outline-none focus-visible:outline-2 focus-visible:outline-sinyal';

const KELAS_LABEL = 'teks-meta block text-teks-sekunder';

const KELAS_TOMBOL =
  'teks-meta inline-flex min-h-11 items-center border border-garis-halus px-4 transition-colors duration-100 ease-keluar hover:border-garis-tegas';

function keLokal(iso: string): string {
  const waktu = new Date(iso);
  const geser = waktu.getTime() - waktu.getTimezoneOffset() * 60000;

  return new Date(geser).toISOString().slice(0, 16);
}

function keIso(lokal: string): string | undefined {
  const waktu = new Date(lokal);

  return Number.isNaN(waktu.getTime()) ? undefined : waktu.toISOString();
}

@Component({
  selector: 'kelas-editor-admin-agenda',
  imports: [RouterLink, Memuat, GalatMuat],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <a
          routerLink="/admin/agenda"
          class="teks-meta text-teks-sekunder transition-colors duration-100 ease-keluar hover:text-sinyal"
          >&larr; Agenda</a
        >
        <h1 class="mt-2 font-serif text-2xl leading-tight tracking-[-0.03em] sm:text-3xl">
          {{ id() === undefined ? 'Kegiatan baru' : 'Ubah kegiatan' }}
        </h1>
      </div>

      @if (status(); as nilai) {
        <p class="teks-meta text-teks-sekunder">{{ label(nilai) }} · v{{ versi() }}</p>
      }
    </div>

    @if (tidakValid()) {
      <p class="mt-8 border-y border-garis-halus py-5 text-sm text-teks-sekunder">
        Alamat kegiatan tidak dikenali. Kembali ke daftar agenda.
      </p>
    } @else if (sedangMemuat()) {
      <kelas-memuat class="mt-8" pesan="Memuat kegiatan" [jumlah]="3" />
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
          <label class="{{ kelasLabel }}" for="judul">Nama kegiatan</label>
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
            <label class="{{ kelasLabel }}" for="mulai">Mulai</label>
            <input
              id="mulai"
              type="datetime-local"
              [value]="mulai()"
              (input)="ubahMulai($event)"
              class="{{ isian }}"
            />
          </div>

          <div>
            <label class="{{ kelasLabel }}" for="selesai">Selesai (opsional)</label>
            <input
              id="selesai"
              type="datetime-local"
              [value]="selesai()"
              (input)="ubahSelesai($event)"
              class="{{ isian }}"
            />
          </div>
        </div>

        <div>
          <label class="{{ kelasLabel }}" for="lokasi">Tempat (opsional)</label>
          <input
            id="lokasi"
            type="text"
            maxlength="200"
            [value]="lokasi()"
            (input)="ubahLokasi($event)"
            class="{{ isian }}"
          />
        </div>

        <div>
          <label class="{{ kelasLabel }}" for="keterangan">Keterangan</label>
          <textarea
            id="keterangan"
            rows="5"
            maxlength="4000"
            [value]="keterangan()"
            (input)="ubahKeterangan($event)"
            class="{{ isian }}"
          ></textarea>
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

        <div class="flex flex-wrap items-center gap-3 border-t border-garis-halus pt-5">
          <button
            type="submit"
            [disabled]="!bisaSimpan()"
            class="teks-meta inline-flex min-h-11 items-center border px-4 transition-colors duration-100 ease-keluar disabled:opacity-45"
            [class]="bisaSimpan() ? 'border-sinyal text-sinyal' : 'border-garis-halus'"
          >
            {{ sedangSimpan() ? 'Menyimpan…' : 'Simpan' }}
          </button>

          @if (id(); as nomor) {
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
              routerLink="/agenda/{{ slug() }}"
              class="teks-meta inline-flex min-h-11 items-center text-teks-sekunder hover:text-sinyal"
              >Lihat di situs</a
            >

            <span class="teks-meta text-teks-sekunder" aria-hidden="true">{{
              nomor.slice(0, 8)
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

      <section class="mt-10 border-t border-garis-halus pt-5">
        <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h2 class="font-serif text-lg tracking-[-0.02em]">Foto kegiatan</h2>
          <p class="teks-meta text-teks-sekunder">{{ foto().length }} / {{ maksFoto }} dipilih</p>
        </div>

        @if (id() === undefined) {
          <p class="mt-3 max-w-[58ch] border-l-2 border-garis-tegas pl-3 text-sm leading-relaxed text-teks-sekunder">
            Simpan kegiatan dulu. Setelah tersimpan, foto dari album galeri bisa dipilih di sini.
          </p>
        } @else {
          <div class="mt-4 grid gap-3 sm:max-w-[26rem]">
            <label class="{{ kelasLabel }}" for="album-foto">Ambil dari album</label>
            <select
              id="album-foto"
              class="{{ isian }}"
              [value]="albumPilih()"
              (change)="pilihAlbum($event)"
            >
              <option value="">— pilih album terbit —</option>
              @for (album of albumTersedia(); track album.slug) {
                <option [value]="album.slug">{{ album.title }} ({{ album.imageCount }} foto)</option>
              }
            </select>
          </div>

          @if (albumPilih().length > 0 && isiAlbum().length === 0) {
            <p class="mt-4 border-y border-garis-halus py-4 text-sm text-teks-sekunder">
              Album ini belum berisi foto.
            </p>
          }

          @if (isiAlbum().length > 0) {
            <ul class="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              @for (gambar of isiAlbum(); track gambar.id) {
                <li>
                  <button
                    type="button"
                    class="group relative block w-full overflow-hidden border transition-colors duration-100 ease-keluar disabled:opacity-50"
                    [class]="
                      terpilihkah(gambar.id)
                        ? 'border-sinyal'
                        : 'border-garis-halus hover:border-garis-tegas'
                    "
                    [disabled]="sedangFoto()"
                    (click)="alihkanFoto(gambar.id)"
                    [attr.aria-pressed]="terpilihkah(gambar.id)"
                    [attr.aria-label]="
                      (terpilihkah(gambar.id) ? 'Lepas foto ' : 'Pilih foto ') + gambar.sortOrder
                    "
                  >
                    <img
                      [src]="gambarFoto(gambar.id)"
                      [attr.alt]="gambar.altText ?? 'Foto album'"
                      [attr.width]="gambar.width"
                      [attr.height]="gambar.height"
                      loading="lazy"
                      decoding="async"
                      class="block w-full bg-latar-sekunder object-cover"
                      style="aspect-ratio: 1"
                    />

                    @if (terpilihkah(gambar.id)) {
                      <span
                        class="teks-meta absolute inset-x-0 bottom-0 bg-sinyal px-1 py-0.5 text-center text-teks-terbalik"
                        >dipakai</span
                      >
                    }
                  </button>
                </li>
              }
            </ul>
          }

          @if (foto().length > 0) {
            <p class="mt-4 max-w-[58ch] text-sm leading-relaxed text-teks-sekunder">
              Foto terpilih muncul di halaman agenda dan di papan penunjuk linimasa.
            </p>
          }
        }
      </section>
    }
  `,
})
export class EditorAdminAgenda {
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
        : permintaanAgenda(this.id() as string),
    { parse: bacaAgendaDetail },
  );

  private readonly sumberAlbum = httpResource(
    () => permintaanDaftarAlbum({ page: 1, perPage: 24 } as AlbumListQuery),
    { parse: bacaHalamanAlbum },
  );

  private readonly sumberIsiAlbum = httpResource(
    () => {
      const slug = this.albumPilih();

      return slug.length === 0 ? undefined : permintaanDetailAlbum(slug, { page: 1, perPage: ALBUM_IMAGES_PER_PAGE });
    },
    { parse: bacaDetailAlbum },
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
  protected readonly lokasi = linkedSignal(() => this.detail()?.location ?? '');
  protected readonly slug = linkedSignal(() => this.detail()?.slug ?? '');
  protected readonly mulai = linkedSignal(() =>
    this.detail() === undefined ? '' : keLokal(this.detail()?.startsAt as string),
  );
  protected readonly selesai = linkedSignal(() => {
    const akhir = this.detail()?.endsAt;

    return akhir === null || akhir === undefined ? '' : keLokal(akhir);
  });

  protected readonly status = computed<EventStatus | undefined>(() => this.detail()?.status);
  protected readonly versi = computed(() => this.detail()?.version);

  protected readonly foto = computed<readonly EventPhoto[]>(() => this.detail()?.photos ?? []);

  protected readonly albumPilih = signal('');

  protected readonly sedangFoto = signal(false);

  protected readonly maksFoto = EVENT_PHOTO_MAX;

  protected readonly sedangSimpan = signal(false);
  protected readonly sedangStatus = signal(false);
  protected readonly pesan = signal<string | undefined>(undefined);
  protected readonly galat = signal<string | undefined>(undefined);

  protected readonly albumTersedia = computed<readonly AlbumSummary[]>(() => {
    const sumber = this.sumberAlbum;

    return sumber.hasValue() ? sumber.value().items : [];
  });

  protected readonly isiAlbum = computed<readonly GalleryImage[]>(() => {
    const sumber = this.sumberIsiAlbum;

    return sumber.hasValue() ? sumber.value().images.items : [];
  });

  protected readonly terpilih = computed(() => this.foto().map((item) => item.id));

  protected readonly adaPerubahan = computed(() => {
    const awal = this.detail();

    if (awal === undefined) {
      return this.judul().trim().length > 2;
    }

    return (
      awal.title !== this.judul() ||
      (awal.description ?? '') !== this.keterangan() ||
      (awal.location ?? '') !== this.lokasi() ||
      awal.slug !== this.slug() ||
      keLokal(awal.startsAt) !== this.mulai() ||
      (awal.endsAt === null ? '' : keLokal(awal.endsAt)) !== this.selesai()
    );
  });

  protected readonly bisaSimpan = computed(
    () => !this.sedangSimpan() && this.adaPerubahan() && this.mulai().length > 0,
  );

  protected gambarFoto(id: string): string {
    return sumberFoto(id, 'kecil');
  }

  protected pilihAlbum(peristiwa: Event): void {
    this.albumPilih.set((peristiwa.target as HTMLSelectElement).value);
  }

  protected terpilihkah(id: string): boolean {
    return this.terpilih().includes(id);
  }

  protected alihkanFoto(id: string): void {
    void this.prosesFoto(id);
  }

  protected label(nilai: EventStatus): string {
    return LABEL_STATUS[nilai];
  }

  protected ubahJudul(peristiwa: Event): void {
    this.judul.set((peristiwa.target as HTMLInputElement).value);
  }

  protected ubahKeterangan(peristiwa: Event): void {
    this.keterangan.set((peristiwa.target as HTMLTextAreaElement).value);
  }

  protected ubahLokasi(peristiwa: Event): void {
    this.lokasi.set((peristiwa.target as HTMLInputElement).value);
  }

  protected ubahSlug(peristiwa: Event): void {
    this.slug.set((peristiwa.target as HTMLInputElement).value);
  }

  protected ubahMulai(peristiwa: Event): void {
    this.mulai.set((peristiwa.target as HTMLInputElement).value);
  }

  protected ubahSelesai(peristiwa: Event): void {
    this.selesai.set((peristiwa.target as HTMLInputElement).value);
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

  private masukan(): Record<string, unknown> {
    const slug = this.slug().trim();
    const lokasi = this.lokasi().trim();
    const keterangan = this.keterangan().trim();
    const selesai = keIso(this.selesai());

    return {
      title: this.judul(),
      description: keterangan.length > 0 ? keterangan : null,
      location: lokasi.length > 0 ? lokasi : null,
      startsAt: keIso(this.mulai()),
      endsAt: this.selesai().length > 0 ? (selesai ?? null) : null,
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
        ? EventCreateSchema.safeParse(this.masukan())
        : EventUpdateSchema.safeParse(this.masukan());

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
        const dibuat = (await firstValueFrom(
          this.http.post(alamatBuatAgenda(), terbaca.data),
        )) as EventAdmin;

        this.pesan.set('Draf tersimpan. Terbitkan bila sudah siap.');
        await this.router.navigate(['/admin/agenda', dibuat.id]);

        return;
      }

      await firstValueFrom(
        this.http.patch(alamatAgenda(id), terbaca.data, {
          headers: detail === undefined ? {} : { 'If-Match': `"${detail.version}"` },
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

  private async prosesFoto(id: string): Promise<void> {
    const agendaId = this.id();

    if (agendaId === undefined || this.sedangFoto()) {
      return;
    }

    const kini = this.terpilih();
    const berikut = kini.includes(id)
      ? kini.filter((item) => item !== id)
      : [...kini, id].slice(-this.maksFoto);

    this.sedangFoto.set(true);
    this.galat.set(undefined);
    this.pesan.set(undefined);

    try {
      await firstValueFrom(
        this.http.patch(alamatFotoAgenda(agendaId), { imageIds: berikut }),
      );

      this.pesan.set('Foto kegiatan tersimpan.');
      this.sumber.reload();
    } catch (galat) {
      this.galat.set(toApiFailure(galat).message);
    } finally {
      this.sedangFoto.set(false);
    }
  }

  private async prosesStatus(arah: 'terbit' | 'arsip' | 'pulih'): Promise<void> {
    const id = this.id();
    const versi = this.versi();

    if (id === undefined || versi === undefined || this.sedangStatus()) {
      return;
    }

    const alamat =
      arah === 'terbit'
        ? alamatTerbitkanAgenda(id)
        : arah === 'arsip'
          ? alamatArsipAgenda(id)
          : alamatPulihkanAgenda(id);

    const kabar =
      arah === 'terbit'
        ? 'Kegiatan diterbitkan.'
        : arah === 'arsip'
          ? 'Kegiatan diarsipkan.'
          : 'Kegiatan dipulihkan.';

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
}