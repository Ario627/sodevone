import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { AnnouncementListQuery } from '@kelas/contracts';
import { toApiFailure } from '../../inti/api/dasar';
import { bacaHalaman, permintaanDaftar } from '../../inti/api/pengumuman.api';
import { KATEGORI_URUT, labelKategori, nomorUrut } from '../../inti/format/label';
import {
  adaFilter,
  daftarQueryDari,
  kategoriDari,
  kataKunciDari,
  tautanDaftar,
} from '../../inti/query/pengumuman';
import { GalatMuat } from '../../komponen/galat-muat/galat-muat';
import { Kosong } from '../../komponen/kosong/kosong';
import { Memuat } from '../../komponen/memuat/memuat';
import { AngkaPiksel } from '../../komponen/angka-piksel/angka-piksel';
import { StempelTanggal } from '../../komponen/stempel-tanggal/stempel-tanggal';
import { Muncul } from '../../inti/gerak/muncul';

@Component({
  selector: 'kelas-daftar-pengumuman',
  imports: [RouterLink, Memuat, Kosong, GalatMuat, StempelTanggal, AngkaPiksel, Muncul],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './daftar-pengumuman.html',
})
export class DaftarPengumuman {
  private readonly router = inject(Router);

  protected readonly page = input<string>();
  protected readonly kategori = input<string>();
  protected readonly q = input<string>();
  protected readonly arsip = input<string>();

  protected readonly query = computed<AnnouncementListQuery>(() =>
    daftarQueryDari({
      page: this.page(),
      kategori: this.kategori(),
      q: this.q(),
      arsip: this.arsip(),
    }),
  );

  private readonly sumber = httpResource(() => permintaanDaftar(this.query()), {
    parse: bacaHalaman,
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

  protected readonly drafKataKunci = linkedSignal(() => this.q() ?? '');

  protected readonly kategoriTersedia = KATEGORI_URUT;
  protected readonly labelKategori = labelKategori;
  protected readonly nomorUrut = nomorUrut;

  protected readonly kepala = computed(() => this.data()?.items.slice(0, 1) ?? []);

  protected readonly sisanya = computed(() => this.data()?.items.slice(1) ?? []);

  private readonly meta = computed(() => this.data()?.meta);

  private readonly totalTersedia = computed(() => this.meta()?.total ?? 0);

  private readonly halamanAktif = computed(() => {
    const meta = this.meta();

    return meta === undefined ? 1 : Math.min(meta.page, Math.max(meta.totalPages, 1));
  });

  protected readonly adaFilterAktif = computed(() => adaFilter(this.query()));

  protected readonly ringkasanHalaman = computed(() => {
    const meta = this.meta();

    return meta === undefined ? '' : `Halaman ${this.halamanAktif()} dari ${meta.totalPages}`;
  });

  protected readonly tautanMundur = computed(() => {
    const meta = this.meta();

    return meta === undefined || this.halamanAktif() <= 1
      ? undefined
      : tautanDaftar(this.query(), this.halamanAktif() - 1);
  });

  protected readonly tautanMaju = computed(() => {
    const meta = this.meta();

    return meta === undefined || this.halamanAktif() >= meta.totalPages
      ? undefined
      : tautanDaftar(this.query(), this.halamanAktif() + 1);
  });

  protected readonly pesanKosong = computed(() => {
    if (this.adaFilterAktif()) {
      return 'Tidak ada pengumuman yang cocok dengan filter ini. Hapus filter untuk melihat semuanya.';
    }

    if (this.totalTersedia() > 0) {
      return 'Halaman ini tidak berisi pengumuman. Kembali ke halaman pertama untuk melihat yang terbaru.';
    }

    return 'Pengurus belum menerbitkan pengumuman. Agenda kegiatan tetap bisa dilihat.';
  });

  protected readonly tautanKosong = computed(() =>
    this.adaFilterAktif() || this.totalTersedia() > 0 ? '/pengumuman' : undefined,
  );

  protected readonly labelKosong = computed(() =>
    this.adaFilterAktif() ? 'Hapus filter' : 'Halaman pertama',
  );

  protected ubahKataKunci(peristiwa: Event): void {
    this.drafKataKunci.set((peristiwa.target as HTMLInputElement).value);
  }

  protected cari(peristiwa: Event): void {
    peristiwa.preventDefault();
    this.terapkan({ page: 1, q: kataKunciDari(this.drafKataKunci()) });
  }

  protected ubahKategori(peristiwa: Event): void {
    this.terapkan({ page: 1, kategori: kategoriDari((peristiwa.target as HTMLSelectElement).value) });
  }

  protected ubahArsip(peristiwa: Event): void {
    this.terapkan({ page: 1, arsip: (peristiwa.target as HTMLInputElement).checked });
  }

  protected muatUlang(): void {
    this.sumber.reload();
  }

  private terapkan(perubahan: Partial<AnnouncementListQuery>): void {
    const berikut = { ...this.query(), ...perubahan };

    void this.router.navigate(['/pengumuman'], {
      queryParams: tautanDaftar(berikut, berikut.page),
    });
  }
}