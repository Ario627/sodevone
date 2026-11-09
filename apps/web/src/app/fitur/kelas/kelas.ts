import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AlbumListQuery, AlbumSummary } from '@kelas/contracts';
import { bacaHalamanAlbum, permintaanDaftarAlbum } from '../../inti/api/galeri.api';
import { bacaKoleksiAnggota, permintaanAnggota } from '../../inti/api/anggota.api';
import { toApiFailure } from '../../inti/api/dasar';
import {
  ANGGOTA_CADANGAN,
  JUMLAH_SISWA,
  dariServer,
  type Anggota,
} from '../../inti/kelas/anggota';
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

  private readonly sumberAnggota = httpResource(permintaanAnggota, {
    parse: bacaKoleksiAnggota,
  });

  protected readonly data = computed(() => {
    const sumber = this.sumber;

    return sumber.hasValue() ? sumber.value() : undefined;
  });

  protected readonly galat = computed(() => {
    const kegagalan = this.sumber.error();

    return kegagalan === undefined ? undefined : toApiFailure(kegagalan);
  });

  protected readonly album = computed<readonly AlbumSummary[]>(() => this.data()?.items ?? []);

  protected readonly sedangMemuat = this.sumber.isLoading;

  protected readonly anggotaSiap = computed(() => {
    const sumber = this.sumberAnggota;

    return sumber.hasValue() || sumber.error() !== undefined;
  });

  protected readonly anggota = computed<readonly Anggota[]>(() => {
    const sumber = this.sumberAnggota;

    if (!sumber.hasValue()) {
      return ANGGOTA_CADANGAN;
    }

    const hasil = dariServer(sumber.value().items);

    return hasil.length > 0 ? hasil : ANGGOTA_CADANGAN;
  });

  protected readonly jumlahSiswa = computed(() =>
    String(this.anggota().filter((item) => item.urut <= JUMLAH_SISWA).length),
  );

  protected readonly jumlahWali = computed(() =>
    String(this.anggota().filter((item) => item.urut > JUMLAH_SISWA).length),
  );

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
