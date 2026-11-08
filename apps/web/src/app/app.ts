import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { tahunAjaran } from './inti/format/tanggal';
import { PitaEdisi } from './komponen/pita-edisi/pita-edisi';
import { GarisGulir } from './komponen/garis-gulir/garis-gulir';
import { PapanPiksel } from './komponen/papan-piksel/papan-piksel';
import { KursorPiksel } from './komponen/kursor-piksel/kursor-piksel';
import { CatatanSitus } from './komponen/catatan-situs/catatan-situs';
import { TiraiMasuk } from './komponen/tirai-masuk/tirai-masuk';

const TAUTAN_NAVIGASI = [
  { label: 'Beranda', jalur: '/', tepat: true },
  { label: 'Kelas', jalur: '/kelas', tepat: false },
  { label: 'Pengumuman', jalur: '/pengumuman', tepat: false },
  { label: 'Agenda', jalur: '/agenda', tepat: false },
  { label: 'Galeri', jalur: '/galeri', tepat: false },
  { label: 'Tentang', jalur: '/tentang', tepat: false },
] as const;

const JALUR_PANEL = ['/admin', '/masuk'];

const JALUR_PENUH = ['/kelas'];

@Component({
  selector: 'kelas-root',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    PitaEdisi,
    PapanPiksel,
    KursorPiksel,
    CatatanSitus,
    GarisGulir,
    TiraiMasuk,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef) as ElementRef<HTMLElement>;
  private readonly destroyRef = inject(DestroyRef);
  private readonly dokumen = inject(DOCUMENT);

  private navigasiPertama = true;

  private readonly jalur = signal(this.dokumen.location.pathname);

  protected readonly menempel = signal(false);

  protected readonly namaKelas = signal('SODEVONE');
  protected readonly tautanNavigasi = TAUTAN_NAVIGASI;
  protected readonly tahun = tahunAjaran();

  protected readonly isiPenuh = computed(() =>
    JALUR_PENUH.some((awalan) => this.jalur().startsWith(awalan)),
  );

  protected readonly pitaTampil = computed(
    () =>
      !this.isiPenuh() && !JALUR_PANEL.some((awalan) => this.jalur().startsWith(awalan)),
  );

  protected readonly kepalaKelas = () =>
    this.menempel()
      ? 'border-b border-garis-halus bg-latar-halaman/92 backdrop-blur-md'
      : 'border-b border-garis-halus bg-latar-halaman';

  constructor() {
    const jendela = this.dokumen.defaultView;

    if (jendela !== null) {
      let bingkai = 0;

      const hitung = (): void => {
        bingkai = 0;
        this.menempel.set(jendela.scrollY > 24);
      };

      const minta = (): void => {
        if (bingkai) {
          return;
        }

        bingkai = jendela.requestAnimationFrame(hitung);
      };

      jendela.addEventListener('scroll', minta, { passive: true });

      this.destroyRef.onDestroy(() => {
        jendela.removeEventListener('scroll', minta);

        if (bingkai) {
          jendela.cancelAnimationFrame(bingkai);
        }
      });
    }

    this.router.events
      .pipe(
        filter((peristiwa) => peristiwa instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((peristiwa) => {
        this.jalur.set(peristiwa.urlAfterRedirects);

        if (this.navigasiPertama) {
          this.navigasiPertama = false;
          return;
        }

        this.host.nativeElement.querySelector<HTMLElement>('main')?.focus({ preventScroll: true });
      });
  }
}
