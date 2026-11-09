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
import type { AlbumListQuery } from '@kelas/contracts';
import { bacaBeranda, permintaanBeranda } from '../../inti/api/beranda.api';
import {
  TOKEN_WARNA,
  bacaPengaturan,
  papanDari,
  permintaanPengaturan,
} from '../../inti/api/pengaturan.api';
import { bacaKoleksiSosial, permintaanSosial } from '../../inti/api/sosial.api';
import { toApiFailure } from '../../inti/api/dasar';
import { bacaHalamanAlbum, permintaanDaftarAlbum, srcsetSampul, sumberSampul } from '../../inti/api/galeri.api';
import { labelKategori } from '../../inti/format/label';
import { rentangJam, tanggalJamTeks, tanggalTeks } from '../../inti/format/tanggal';
import { ArenaKertas } from '../../komponen/arena-kertas/arena-kertas';
import { SosialMosaik } from '../../komponen/sosial-mosaik/sosial-mosaik';
import { GalatMuat } from '../../komponen/galat-muat/galat-muat';
import { KepalaBagian } from '../../komponen/kepala-bagian/kepala-bagian';
import { Memuat } from '../../komponen/memuat/memuat';
import { PapanStatus } from '../../komponen/papan-status/papan-status';
import { RolFilm } from '../../komponen/rol-film/rol-film';
import { StempelTanggal } from '../../komponen/stempel-tanggal/stempel-tanggal';
import { TeksDekode } from '../../komponen/teks-dekode/teks-dekode';
import { VoxelMonogram } from '../../komponen/voxel-monogram/voxel-monogram';
import { Muncul } from '../../inti/gerak/muncul';
import { Catatan } from '../../inti/gerak/catatan';
import { bolehBergerak } from '../../inti/gerak/media';
import { TINGGI_GLYPH, lebarTeks } from '../../inti/piksel/glyph';
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
    RolFilm,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './beranda.html',
})
export class Beranda {
  private readonly sumber = httpResource(() => permintaanBeranda(), { parse: bacaBeranda });

  private readonly sumberSosial = httpResource(() => permintaanSosial(8), {
    parse: bacaKoleksiSosial,
  });

  private readonly sumberPengaturan = httpResource(permintaanPengaturan, {
    parse: bacaPengaturan,
  });

  private readonly sumberAlbum = httpResource(
    () => permintaanDaftarAlbum({ page: 1, perPage: 6 } as AlbumListQuery),
    { parse: bacaHalamanAlbum },
  );

  private readonly catatan = inject(Catatan);


  private readonly spesimen = viewChild<ElementRef<HTMLElement>>('spesimen');

  private readonly bisaBergerak = bolehBergerak();

  protected readonly judul = 'XI PPLG 1';

  private readonly papan = computed(() => {
    const sumber = this.sumberPengaturan;

    return papanDari(sumber.hasValue() ? sumber.value() : undefined);
  });

  protected readonly teksPapan = computed(() => {
    const papan = this.papan();

    return papan.kind === 'teks' ? papan.teks : '';
  });

  protected readonly matriksPapan = computed<readonly string[]>(() => {
    const papan = this.papan();

    return papan.kind === 'matriks' ? papan.baris : [];
  });

  protected readonly warnaPapan = computed(() => TOKEN_WARNA[this.papan().warna]);

  protected readonly ukuranPapan = computed(() => {
    const baris = this.matriksPapan();

    if (baris.length > 0) {
      return `${baris[0]?.length ?? 0} × ${baris.length}`;
    }

    return `${lebarTeks(this.teksPapan())} × ${TINGGI_GLYPH}`;
  });

  protected readonly kodeKelas = KODE_KELAS;


  protected readonly berikutnya = computed(() => this.data()?.upcomingEvents[0]);

  protected readonly sosial = computed(() => {
    const sumber = this.sumberSosial;

    return sumber.hasValue() ? sumber.value().items : [];
  });

  protected readonly albumRol = computed(() => {
    const dariHalaman = this.sumberAlbum;
    const dariBeranda = this.data()?.albums ?? [];

    if (dariHalaman.hasValue() && dariHalaman.value().items.length > 0) {
      return dariHalaman.value().items;
    }

    return dariBeranda;
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
