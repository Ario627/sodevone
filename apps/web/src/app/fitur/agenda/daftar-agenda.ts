import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AlbumListQuery, AlbumSummary, EventSummary } from '@kelas/contracts';
import { toApiFailure } from '../../inti/api/dasar';
import { bacaKoleksi, permintaanAgenda } from '../../inti/api/agenda.api';
import { bacaHalamanAlbum, permintaanDaftarAlbum } from '../../inti/api/galeri.api';
import { rentangJam } from '../../inti/format/tanggal';
import { GalatMuat } from '../../komponen/galat-muat/galat-muat';
import { KepalaBagian } from '../../komponen/kepala-bagian/kepala-bagian';
import { Kosong } from '../../komponen/kosong/kosong';
import { LinimasaSemester } from '../../komponen/linimasa-semester/linimasa-semester';
import { Memuat } from '../../komponen/memuat/memuat';
import { StempelTanggal } from '../../komponen/stempel-tanggal/stempel-tanggal';
import { Muncul } from '../../inti/gerak/muncul';

@Component({
  selector: 'kelas-daftar-agenda',
  imports: [
    RouterLink,
    Memuat,
    Kosong,
    GalatMuat,
    KepalaBagian,
    StempelTanggal,
    Muncul,
    LinimasaSemester,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './daftar-agenda.html',
})
export class DaftarAgenda {
  private readonly sumber = httpResource(() => permintaanAgenda(), { parse: bacaKoleksi });

  private readonly sumberAlbum = httpResource(
    () => permintaanDaftarAlbum({ page: 1, perPage: 12 } as AlbumListQuery),
    { parse: bacaHalamanAlbum },
  );

  protected readonly album = computed<readonly AlbumSummary[]>(() => {
    const sumber = this.sumberAlbum;

    return sumber.hasValue() ? sumber.value().items : [];
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

  protected readonly kosong = computed(() => {
    const koleksi = this.data();

    return koleksi !== undefined && koleksi.upcoming.length === 0 && koleksi.past.length === 0;
  });

  protected readonly linimasa = computed<readonly EventSummary[]>(() => {
    const koleksi = this.data();

    if (koleksi === undefined) {
      return [];
    }

    return [...koleksi.past, ...koleksi.upcoming].sort(
      (kiri, kanan) => Date.parse(kiri.startsAt) - Date.parse(kanan.startsAt),
    );
  });

  protected readonly rentangJam = rentangJam;

  protected muatUlang(): void {
    this.sumber.reload();
  }
}