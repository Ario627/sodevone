import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { bacaBeranda, permintaanBeranda } from '../../inti/api/beranda.api';
import { bacaKoleksiSosial, permintaanSosial } from '../../inti/api/sosial.api';
import { toApiFailure } from '../../inti/api/dasar';
import { srcsetSampul, sumberSampul } from '../../inti/api/galeri.api';
import { labelKategori, nomorUrut } from '../../inti/format/label';
import { rentangJam, tanggalJamTeks, tanggalTeks } from '../../inti/format/tanggal';
import { AngkaPiksel } from '../../komponen/angka-piksel/angka-piksel';
import { ArenaKertas } from '../../komponen/arena-kertas/arena-kertas';
import { SosialMosaik } from '../../komponen/sosial-mosaik/sosial-mosaik';
import { GalatMuat } from '../../komponen/galat-muat/galat-muat';
import { KepalaBagian } from '../../komponen/kepala-bagian/kepala-bagian';
import { Memuat } from '../../komponen/memuat/memuat';
import { PapanStatus } from '../../komponen/papan-status/papan-status';
import { StempelTanggal } from '../../komponen/stempel-tanggal/stempel-tanggal';
import { TeksDekode } from '../../komponen/teks-dekode/teks-dekode';
import { VoxelMonogram } from '../../komponen/voxel-monogram/voxel-monogram';
import { Muncul } from '../../inti/gerak/muncul';
import { Catatan } from '../../inti/gerak/catatan';
import { bolehBergerak } from '../../inti/gerak/media';
import { geserTerbatas, normalisasi } from '../../inti/gerak/paralaks';

const KODE_KELAS = [
  { label: 'Tingkat', nilai: 'XI' },
  { label: 'Jurusan', nilai: 'PPLG' },
  { label: 'Rombel', nilai: '1' },
] as const;

@Component({
  selector: 'kelas-beranda',
  imports: [
    RouterLink,
    AngkaPiksel,
    Memuat,
    GalatMuat,
    KepalaBagian,
    StempelTanggal,
    TeksDekode,
    VoxelMonogram,
    SosialMosaik,
    ArenaKertas,
    Muncul,
    PapanStatus,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './beranda.html',
})
export class Beranda {
  private readonly sumber = httpResource(() => permintaanBeranda(), { parse: bacaBeranda });

  private readonly sumberSosial = httpResource(() => permintaanSosial(8), {
    parse: bacaKoleksiSosial,
  });

  private readonly catatan = inject(Catatan);


  private readonly spesimen = viewChild<ElementRef<HTMLElement>>('spesimen');

  private readonly bisaBergerak = bolehBergerak();

  protected readonly judul = 'XI PPLG 1';

  protected readonly kodeKelas = KODE_KELAS;


  protected readonly berikutnya = computed(() => this.data()?.upcomingEvents[0]);

  protected readonly sosial = computed(() => {
    const sumber = this.sumberSosial;

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

  protected readonly lead = computed(() => this.data()?.announcements[0]);

  protected readonly lainnya = computed(() => this.data()?.announcements.slice(1) ?? []);

  protected readonly labelKategori = labelKategori;
  protected readonly nomorUrut = nomorUrut;

  protected readonly tanggalJamTeks = tanggalJamTeks;
  protected readonly tanggalTeks = tanggalTeks;
  protected readonly rentangJam = rentangJam;
  protected readonly sumberSampul = sumberSampul;
  protected readonly srcsetSampul = srcsetSampul;

  protected bukaCatatan(): void {
    this.catatan.buka();
  }

  protected gerakkan(peristiwa: PointerEvent): void {
    const elemen = this.spesimen()?.nativeElement;

    if (elemen === undefined || !this.bisaBergerak) {
      return;
    }

    const kotak = (peristiwa.currentTarget as HTMLElement).getBoundingClientRect();

    elemen.style.setProperty(
      '--geser-x',
      `${geserTerbatas(normalisasi(peristiwa.clientX - kotak.left, kotak.width), 5)}px`,
    );

    elemen.style.setProperty(
      '--geser-y',
      `${geserTerbatas(normalisasi(peristiwa.clientY - kotak.top, kotak.height), 4)}px`,
    );
  }

  protected kembalikan(): void {
    const elemen = this.spesimen()?.nativeElement;

    elemen?.style.setProperty('--geser-x', '0px');
    elemen?.style.setProperty('--geser-y', '0px');
  }

  protected muatUlang(): void {
    this.sumber.reload();
  }
}
