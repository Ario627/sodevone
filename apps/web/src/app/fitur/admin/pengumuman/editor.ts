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
  AnnouncementCreateSchema,
  AnnouncementUpdateSchema,
  SlugSchema,
  UuidSchema,
  type AnnouncementAdminDetail,
  type AnnouncementCategory,
  type AnnouncementStatus,
} from '@kelas/contracts';
import { firstValueFrom } from 'rxjs';
import {
  alamatArsip,
  alamatBuat,
  alamatPengumuman,
  alamatTerbit,
  bacaDetailAdmin,
  permintaanDetailAdmin,
} from '../../../inti/api/admin-pengumuman.api';
import { toApiFailure } from '../../../inti/api/dasar';
import { KATEGORI_URUT, labelKategori } from '../../../inti/format/label';
import { GalatMuat } from '../../../komponen/galat-muat/galat-muat';
import { Memuat } from '../../../komponen/memuat/memuat';

const LABEL_STATUS: Record<AnnouncementStatus, string> = {
  draft: 'Draf',
  published: 'Terbit',
  archived: 'Arsip',
};

@Component({
  selector: 'kelas-editor-pengumuman',
  imports: [RouterLink, Memuat, GalatMuat],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './editor.html',
})
export class EditorPengumuman {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly id = input<string>();

  protected readonly idValid = computed(() => {
    const id = this.id();

    return id !== undefined && UuidSchema.safeParse(id).success;
  });

  private readonly sumber = httpResource(
    () => (this.idValid() ? permintaanDetailAdmin(this.id() as string) : undefined),
    { parse: bacaDetailAdmin },
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

  protected readonly tidakDitemukan = computed(
    () => this.id() !== undefined && !this.idValid(),
  );

  protected readonly judul = linkedSignal(() => this.detail()?.title ?? '');

  protected readonly isi = linkedSignal(() => this.detail()?.body ?? '');

  protected readonly slug = linkedSignal(() => this.detail()?.slug ?? '');

  protected readonly kategori = linkedSignal<AnnouncementCategory>(
    () => this.detail()?.category ?? 'umum',
  );

  protected readonly ringkasan = linkedSignal(() => this.detail()?.excerpt ?? '');

  protected readonly status = computed<AnnouncementStatus | undefined>(
    () => this.detail()?.status,
  );

  protected readonly versi = computed(() => this.detail()?.version);

  protected readonly sedangSimpan = signal(false);

  protected readonly sedangUbahStatus = signal(false);

  protected readonly pesan = signal<string | undefined>(undefined);

  protected readonly galat = signal<string | undefined>(undefined);

  protected readonly kategoriTersedia = KATEGORI_URUT;
  protected readonly labelKategori = labelKategori;

  private readonly adaPerubahan = computed(() => {
    const awal = this.detail();

    if (awal === undefined) {
      return this.judul().trim().length > 0 || this.isi().trim().length > 0;
    }

    return (
      awal.title !== this.judul() ||
      awal.body !== this.isi() ||
      awal.slug !== this.slug() ||
      awal.category !== this.kategori() ||
      awal.excerpt !== this.ringkasan()
    );
  });

  protected readonly bisaSimpan = computed(
    () => !this.sedangSimpan() && this.adaPerubahan(),
  );

  protected readonly judulTampil = computed(() =>
    this.id() === undefined ? 'Pengumuman baru' : 'Ubah pengumuman',
  );

  protected labelStatus(nilai: AnnouncementStatus): string {
    return LABEL_STATUS[nilai];
  }

  protected ubahJudul(peristiwa: Event): void {
    this.judul.set((peristiwa.target as HTMLInputElement).value);
  }

  protected ubahIsi(peristiwa: Event): void {
    this.isi.set((peristiwa.target as HTMLTextAreaElement).value);
  }

  protected ubahSlug(peristiwa: Event): void {
    this.slug.set((peristiwa.target as HTMLInputElement).value);
  }

  protected ubahKategori(peristiwa: Event): void {
    this.kategori.set((peristiwa.target as HTMLSelectElement).value as AnnouncementCategory);
  }

  protected ubahRingkasan(peristiwa: Event): void {
    this.ringkasan.set((peristiwa.target as HTMLInputElement).value);
  }

  protected simpan(peristiwa: Event): void {
    peristiwa.preventDefault();
    void this.prosesSimpan();
  }

  protected terbitkan(): void {
    void this.prosesStatus(alamatTerbit(this.id() as string), 'Pengumuman diterbitkan.');
  }

  protected arsipkan(): void {
    void this.prosesStatus(alamatArsip(this.id() as string), 'Pengumuman diarsipkan.');
  }

  protected muatUlang(): void {
    this.sumber.reload();
  }

  private masukan(): Record<string, unknown> {
    const slug = this.slug().trim();
    const ringkasan = this.ringkasan().trim();

    return {
      title: this.judul(),
      body: this.isi(),
      category: this.kategori(),
      slug: slug.length > 0 && SlugSchema.safeParse(slug).success ? slug : undefined,
      excerpt: ringkasan.length > 0 ? ringkasan : undefined,
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
        ? AnnouncementCreateSchema.safeParse(this.masukan())
        : AnnouncementUpdateSchema.safeParse(this.masukan());

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
          this.http.post(alamatBuat(), terbaca.data),
        )) as AnnouncementAdminDetail;

        this.pesan.set('Draf tersimpan. Terbitkan bila sudah siap.');
        await this.router.navigate(['/admin/pengumuman', dibuat.id]);

        return;
      }

      await firstValueFrom(
        this.http.patch(alamatPengumuman(id), terbaca.data, {
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

  private async prosesStatus(alamat: string, berhasil: string): Promise<void> {
    const versi = this.versi();

    if (this.sedangUbahStatus() || versi === undefined) {
      return;
    }

    this.sedangUbahStatus.set(true);
    this.galat.set(undefined);
    this.pesan.set(undefined);

    try {
      await firstValueFrom(
        this.http.post(alamat, {}, { headers: { 'If-Match': `"${versi}"` } }),
      );

      this.pesan.set(berhasil);
      this.sumber.reload();
    } catch (galat) {
      this.galat.set(toApiFailure(galat).message);
    } finally {
      this.sedangUbahStatus.set(false);
    }
  }
}