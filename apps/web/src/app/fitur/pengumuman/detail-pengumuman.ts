import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { SlugSchema } from '@kelas/contracts';
import { toApiFailure } from '../../inti/api/dasar';
import { bacaDetail, permintaanDetail } from '../../inti/api/pengumuman.api';
import { labelKategori } from '../../inti/format/label';
import { tanggalJamTeks, tanggalTeks } from '../../inti/format/tanggal';
import { GalatMuat } from '../../komponen/galat-muat/galat-muat';
import { Memuat } from '../../komponen/memuat/memuat';

@Component({
  selector: 'kelas-detail-pengumuman',
  imports: [RouterLink, Memuat, GalatMuat],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail-pengumuman.html',
})
export class DetailPengumuman {
  private readonly judulHalaman = inject(Title);

  readonly slug = input.required<string>();

  protected readonly slugValid = computed(() => SlugSchema.safeParse(this.slug()).success);

  private readonly sumber = httpResource(
    () => (this.slugValid() ? permintaanDetail(this.slug()) : undefined),
    { parse: bacaDetail },
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

  protected readonly labelKategori = labelKategori;
  protected readonly tanggalTeks = tanggalTeks;
  protected readonly tanggalJamTeks = tanggalJamTeks;

  constructor() {
    effect(() => {
      const pengumuman = this.data();

      if (pengumuman !== undefined) {
        this.judulHalaman.setTitle(`${pengumuman.title} — Kelas XI PPLG 1`);
      }
    });
  }

  protected muatUlang(): void {
    this.sumber.reload();
  }
}