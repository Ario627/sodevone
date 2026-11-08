import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiFailure } from '../../inti/api/dasar';
import { bacaKoleksi, permintaanAgenda } from '../../inti/api/agenda.api';
import { rentangJam } from '../../inti/format/tanggal';
import { GalatMuat } from '../../komponen/galat-muat/galat-muat';
import { KepalaBagian } from '../../komponen/kepala-bagian/kepala-bagian';
import { Kosong } from '../../komponen/kosong/kosong';
import { Memuat } from '../../komponen/memuat/memuat';
import { StempelTanggal } from '../../komponen/stempel-tanggal/stempel-tanggal';
import { Muncul } from '../../inti/gerak/muncul';

@Component({
  selector: 'kelas-daftar-agenda',
  imports: [RouterLink, Memuat, Kosong, GalatMuat, KepalaBagian, StempelTanggal, Muncul],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './daftar-agenda.html',
})
export class DaftarAgenda {
  private readonly sumber = httpResource(() => permintaanAgenda(), { parse: bacaKoleksi });

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

  protected readonly rentangJam = rentangJam;

  protected muatUlang(): void {
    this.sumber.reload();
  }
}