import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { bacaBeranda, permintaanBeranda } from '../../inti/api/beranda.api';
import { toApiFailure } from '../../inti/api/dasar';
import { srcsetSampul, sumberSampul } from '../../inti/api/galeri.api';
import { labelKategori, nomorUrut } from '../../inti/format/label';
import { rentangJam, tanggalJamTeks, tanggalTeks } from '../../inti/format/tanggal';
import { GalatMuat } from '../../komponen/galat-muat/galat-muat';
import { KepalaBagian } from '../../komponen/kepala-bagian/kepala-bagian';
import { Memuat } from '../../komponen/memuat/memuat';
import { StempelTanggal } from '../../komponen/stempel-tanggal/stempel-tanggal';

const KODE_KELAS = [
  { label: 'Tingkat', nilai: 'XI' },
  { label: 'Jurusan', nilai: 'PPLG' },
  { label: 'Rombel', nilai: '1' },
] as const;

@Component({
  selector: 'kelas-beranda',
  imports: [RouterLink, Memuat, GalatMuat, KepalaBagian, StempelTanggal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './beranda.html',
})
export class Beranda {
  private readonly sumber = httpResource(() => permintaanBeranda(), { parse: bacaBeranda });

  protected readonly kodeKelas = KODE_KELAS;

  protected readonly sedangMemuat = this.sumber.isLoading;

  protected readonly data = computed(() => {
    const sumber = this.sumber;

    return sumber.hasValue() ? sumber.value() : undefined;
  });

  protected readonly galat = computed(() => {
    const kegagalan = this.sumber.error();

    return kegagalan === undefined ? undefined : toApiFailure(kegagalan);
  });

  protected readonly lead = computed(() => this.data()?.announcements[0]);

  protected readonly lainnya = computed(() => this.data()?.announcements.slice(1) ?? []);

  protected readonly labelKategori = labelKategori;
  protected readonly nomorUrut = nomorUrut;
  protected readonly tanggalJamTeks = tanggalJamTeks;
  protected readonly tanggalTeks = tanggalTeks;
  protected readonly rentangJam = rentangJam;
  protected readonly sumberSampul = sumberSampul;
  protected readonly srcsetSampul = srcsetSampul;

  protected muatUlang(): void {
    this.sumber.reload();
  }
}
