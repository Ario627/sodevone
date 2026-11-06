import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AnnouncementAdminListQuery, AnnouncementStatus } from '@kelas/contracts';
import {
  bacaHalamanAdmin,
  permintaanHalamanAdmin,
} from '../../../inti/api/admin-pengumuman.api';
import { toApiFailure } from '../../../inti/api/dasar';
import { labelKategori } from '../../../inti/format/label';
import { tanggalJamTeks } from '../../../inti/format/tanggal';
import { halamanDari, halamanTautan } from '../../../inti/query/halaman';
import { GalatMuat } from '../../../komponen/galat-muat/galat-muat';
import { Kosong } from '../../../komponen/kosong/kosong';
import { Memuat } from '../../../komponen/memuat/memuat';

const PER_HALAMAN = 20;

const STATUS: readonly { nilai: AnnouncementStatus | ''; label: string }[] = [
  { nilai: '', label: 'Semua status' },
  { nilai: 'draft', label: 'Draf' },
  { nilai: 'published', label: 'Terbit' },
  { nilai: 'archived', label: 'Arsip' },
];

const LABEL_STATUS: Record<AnnouncementStatus, string> = {
  draft: 'Draf',
  published: 'Terbit',
  archived: 'Arsip',
};

@Component({
  selector: 'kelas-daftar-admin',
  imports: [RouterLink, Memuat, Kosong, GalatMuat],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './daftar-admin.html',
})
export class DaftarAdmin {
  readonly page = input<string>();
  readonly status = input<string>();

  protected readonly pilihanStatus = STATUS;

  private readonly statusAktif = computed<AnnouncementStatus | undefined>(() => {
    const nilai = this.status();

    return nilai === 'draft' || nilai === 'published' || nilai === 'archived' ? nilai : undefined;
  });

  protected readonly query = computed<AnnouncementAdminListQuery>(() => ({
    page: halamanDari(this.page()),
    perPage: PER_HALAMAN,
    status: this.statusAktif(),
  }));

  private readonly sumber = httpResource(() => permintaanHalamanAdmin(this.query()), {
    parse: bacaHalamanAdmin,
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

  protected readonly labelKategori = labelKategori;
  protected readonly tanggalJamTeks = tanggalJamTeks;

  protected readonly adaFilter = computed(() => this.statusAktif() !== undefined);

  protected labelStatus(status: AnnouncementStatus): string {
    return LABEL_STATUS[status];
  }

  private readonly meta = computed(() => this.data()?.meta);

  private readonly halamanAktif = computed(() => {
    const meta = this.meta();

    return meta === undefined ? 1 : Math.min(meta.page, Math.max(meta.totalPages, 1));
  });

  protected readonly ringkasanHalaman = computed(() => {
    const meta = this.meta();

    return meta === undefined ? '' : `Halaman ${this.halamanAktif()} dari ${meta.totalPages}`;
  });

  protected readonly tautanStatus = computed(() => {
    const status = this.statusAktif();

    return status === undefined ? {} : { status };
  });

  protected readonly tautanMundur = computed(() => {
    const meta = this.meta();

    return meta === undefined || this.halamanAktif() <= 1
      ? undefined
      : { ...this.tautanStatus(), ...halamanTautan(this.halamanAktif() - 1) };
  });

  protected readonly tautanMaju = computed(() => {
    const meta = this.meta();

    return meta === undefined || this.halamanAktif() >= meta.totalPages
      ? undefined
      : { ...this.tautanStatus(), ...halamanTautan(this.halamanAktif() + 1) };
  });

  protected readonly jumlahDraf = computed(
    () => this.data()?.items.filter((butir) => butir.status === 'draft').length ?? 0,
  );

  protected muatUlang(): void {
    this.sumber.reload();
  }
}