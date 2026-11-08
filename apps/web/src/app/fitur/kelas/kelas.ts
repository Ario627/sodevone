import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AlbumListQuery, AlbumSummary } from '@kelas/contracts';
import { bacaHalamanAlbum, permintaanDaftarAlbum } from '../../inti/api/galeri.api';
import { toApiFailure } from '../../inti/api/dasar';
import type { Anggota } from '../../inti/kelas/anggota';
import { AngkaPiksel } from '../../komponen/angka-piksel/angka-piksel';
import { GalatMuat } from '../../komponen/galat-muat/galat-muat';
import { JejakAlbum } from '../../komponen/jejak-album/jejak-album';
import { LembarAnggota } from '../../komponen/lembar-anggota/lembar-anggota';
import { LembarFoto } from '../../komponen/lembar-foto/lembar-foto';
import { Memuat } from '../../komponen/memuat/memuat';
import { RuangKelas } from '../../komponen/ruang-kelas/ruang-kelas';

const BAB_PER_HALAMAN = 9;

@Component({
  selector: 'kelas-halaman-kelas',
  imports: [
    RouterLink,
    AngkaPiksel,
    Memuat,
    GalatMuat,
    RuangKelas,
    JejakAlbum,
    LembarAnggota,
    LembarFoto,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kelas.html',
})
export class Kelas {
  private readonly sumber = httpResource(
    () => permintaanDaftarAlbum({ page: 1, perPage: BAB_PER_HALAMAN } as AlbumListQuery),
    { parse: bacaHalamanAlbum },
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

  protected readonly album = computed<readonly AlbumSummary[]>(() => this.data()?.items ?? []);

  protected readonly anggotaTerpilih = signal<Anggota | null>(null);
  protected readonly fotoTerpilih = signal<AlbumSummary | null>(null);

  protected readonly idTerpilih = computed(() => this.anggotaTerpilih()?.id ?? null);

  protected bukaAnggota(anggota: Anggota): void {
    this.anggotaTerpilih.set(anggota);
  }

  protected bukaFoto(album: AlbumSummary): void {
    this.fotoTerpilih.set(album);
  }

  protected tutupAnggota(): void {
    this.anggotaTerpilih.set(null);
  }

  protected tutupFoto(): void {
    this.fotoTerpilih.set(null);
  }

  protected muatUlang(): void {
    this.sumber.reload();
  }
}
