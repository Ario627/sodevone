import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { SlugSchema } from '@kelas/contracts';
import { toApiFailure } from '../../inti/api/dasar';
import {
  bacaDetailAlbum,
  permintaanDetailAlbum,
  srcsetFoto,
  sumberFoto,
} from '../../inti/api/galeri.api';
import { tanggalTeks } from '../../inti/format/tanggal';
import { FOTO_PER_HALAMAN, halamanDari, tautanFoto } from '../../inti/query/galeri';
import { GalatMuat } from '../../komponen/galat-muat/galat-muat';
import { Kosong } from '../../komponen/kosong/kosong';
import { Memuat } from '../../komponen/memuat/memuat';

type FotoBernomor = {
  id: string;
  width: number;
  height: number;
  altText: string | null;
  nomor: number;
};

@Component({
  selector: 'kelas-detail-galeri',
  imports: [RouterLink, Memuat, Kosong, GalatMuat],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail-galeri.html',
  host: {
    '(document:keydown.escape)': 'tutup()',
    '(document:keydown.arrowright)': 'berikutnya()',
    '(document:keydown.arrowleft)': 'sebelumnya()',
  },
})
export class DetailGaleri {
  private readonly judulHalaman = inject(Title);

  private readonly tombolTutup = viewChild<ElementRef<HTMLButtonElement>>('tombolTutup');

  readonly slug = input.required<string>();

  readonly page = input<string>();

  protected readonly query = computed(() => ({
    page: halamanDari(this.page()),
    perPage: FOTO_PER_HALAMAN,
  }));

  protected readonly slugValid = computed(() => SlugSchema.safeParse(this.slug()).success);

  private readonly sumber = httpResource(
    () => (this.slugValid() ? permintaanDetailAlbum(this.slug(), this.query()) : undefined),
    { parse: bacaDetailAlbum },
  );

  protected readonly sedangMemuat = this.sumber.isLoading;

  protected readonly data = computed(() => {
    const sumber = this.sumber;

    return sumber.hasValue() ? sumber.value() : undefined;
  });

  protected readonly galat = computed(() => {
    const kegagalan = this.sumber.error();

    return kegagalan === undefined ? undefined : toApiFailure(kegagalan);
  });

  protected readonly tidakDitemukan = computed(
    () => !this.slugValid() || this.galat()?.missing === true,
  );

  protected readonly foto = computed<FotoBernomor[]>(() => {
    const album = this.data();

    if (album === undefined) {
      return [];
    }

    const { page, perPage } = album.images.meta;

    return album.images.items.map((gambar, indeks) => ({
      id: gambar.id,
      width: gambar.width,
      height: gambar.height,
      altText: gambar.altText,
      nomor: (page - 1) * perPage + indeks + 1,
    }));
  });

  protected readonly totalFoto = computed(() => this.data()?.images.meta.total ?? 0);

  protected readonly kosong = computed(() => this.data() !== undefined && this.totalFoto() === 0);

  private readonly meta = computed(() => this.data()?.images.meta);

  private readonly halamanAktif = computed(() => {
    const meta = this.meta();

    return meta === undefined ? 1 : Math.min(meta.page, Math.max(meta.totalPages, 1));
  });

  protected readonly ringkasanHalaman = computed(() => {
    const meta = this.meta();

    return meta === undefined ? '' : `Halaman ${this.halamanAktif()} dari ${meta.totalPages}`;
  });

  protected readonly tautanMundur = computed(() => {
    const meta = this.meta();

    return meta === undefined || this.halamanAktif() <= 1
      ? undefined
      : tautanFoto(this.halamanAktif() - 1);
  });

  protected readonly tautanMaju = computed(() => {
    const meta = this.meta();

    return meta === undefined || this.halamanAktif() >= meta.totalPages
      ? undefined
      : tautanFoto(this.halamanAktif() + 1);
  });

  protected readonly indeksAktif = signal<number | null>(null);

  protected readonly tampil = computed(() => {
    const indeks = this.indeksAktif();

    return indeks === null ? undefined : this.foto()[indeks];
  });

  protected readonly adaSebelumnya = computed(() => (this.indeksAktif() ?? 0) > 0);

  protected readonly adaBerikutnya = computed(() => {
    const indeks = this.indeksAktif();

    return indeks !== null && indeks < this.foto().length - 1;
  });

  protected readonly tanggalTeks = tanggalTeks;
  protected readonly sumberFoto = sumberFoto;
  protected readonly srcsetFoto = srcsetFoto;

  private pemicu: HTMLElement | undefined;

  constructor() {
    effect(() => {
      const terbuka = this.indeksAktif() !== null;

      if (terbuka) {
        this.tombolTutup()?.nativeElement.focus();
      } else {
        this.pemicu?.focus();
        this.pemicu = undefined;
      }
    });

    effect(() => {
      const album = this.data();

      if (album !== undefined) {
        this.judulHalaman.setTitle(`${album.title} — Galeri Kelas XI PPLG 1`);
      }
    });
  }

  protected label(gambar: FotoBernomor): string {
    return `Foto album, gambar ${gambar.nomor} dari ${this.totalFoto()}`;
  }

  protected nomorTeks(nomor: number): string {
    return String(nomor).padStart(3, '0');
  }

  protected teksAlternatif(gambar: FotoBernomor): string {
    return gambar.altText ?? `Foto ${gambar.nomor} album ini`;
  }

  protected buka(indeks: number, peristiwa: Event): void {
    this.pemicu = peristiwa.currentTarget as HTMLElement;
    this.indeksAktif.set(indeks);
  }

  protected tutup(): void {
    if (this.indeksAktif() !== null) {
      this.indeksAktif.set(null);
    }
  }

  protected berikutnya(): void {
    const indeks = this.indeksAktif();

    if (indeks !== null && indeks < this.foto().length - 1) {
      this.indeksAktif.set(indeks + 1);
    }
  }

  protected sebelumnya(): void {
    const indeks = this.indeksAktif();

    if (indeks !== null && indeks > 0) {
      this.indeksAktif.set(indeks - 1);
    }
  }

  protected muatUlang(): void {
    this.sumber.reload();
  }
}