import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AlbumListQuery } from '@kelas/contracts';
import { toApiFailure } from '../../inti/api/dasar';
import {
  bacaHalamanAlbum,
  permintaanDaftarAlbum,
  srcsetSampul,
  sumberSampul,
} from '../../inti/api/galeri.api';
import { nomorUrut } from '../../inti/format/label';
import { tanggalTeks } from '../../inti/format/tanggal';
import { GALERI_PER_HALAMAN, halamanDari, tautanAlbum } from '../../inti/query/galeri';
import { GalatMuat } from '../../komponen/galat-muat/galat-muat';
import { Kosong } from '../../komponen/kosong/kosong';
import { Memuat } from '../../komponen/memuat/memuat';

@Component({
  selector: 'kelas-daftar-galeri',
  imports: [RouterLink, Memuat, Kosong, GalatMuat],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './daftar-galeri.html',
})
export class DaftarGaleri {
  protected readonly page = input<string>();

  protected readonly query = computed<AlbumListQuery>(() => ({
    page: halamanDari(this.page()),
    perPage: GALERI_PER_HALAMAN,
  }));

  private readonly sumber = httpResource(() => permintaanDaftarAlbum(this.query()), {
    parse: bacaHalamanAlbum,
  });

  protected readonly sedangMemuat = this.sumber.isLoading;

  protected readonly data = computed(() => {
    const sumber = this.sumber;

    return sumber.hasValue() ? sumber.value() : undefined;
  });

  protected readonly galat = computed(() => {
    const kegagalan = this.sumber.error();

    return kegagalan === undefined ? undefined : toApiFailure(kegagalan);
  });

  protected readonly tanggalTeks = tanggalTeks;
  protected readonly nomorUrut = nomorUrut;
  protected readonly sumberSampul = sumberSampul;
  protected readonly srcsetSampul = srcsetSampul;

  private readonly meta = computed(() => this.data()?.meta);

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
      : tautanAlbum(this.halamanAktif() - 1);
  });

  protected readonly tautanMaju = computed(() => {
    const meta = this.meta();

    return meta === undefined || this.halamanAktif() >= meta.totalPages
      ? undefined
      : tautanAlbum(this.halamanAktif() + 1);
  });

  protected muatUlang(): void {
    this.sumber.reload();
  }
}
