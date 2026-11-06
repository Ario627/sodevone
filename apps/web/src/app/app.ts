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

const TAUTAN_NAVIGASI = [
  { label: 'Beranda', jalur: '/', tepat: true },
  { label: 'Pengumuman', jalur: '/pengumuman', tepat: false },
  { label: 'Agenda', jalur: '/agenda', tepat: false },
  { label: 'Galeri', jalur: '/galeri', tepat: false },
  { label: 'Tentang', jalur: '/tentang', tepat: false },
] as const;

const JALUR_PANEL = ['/admin', '/masuk'];

@Component({
  selector: 'kelas-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, PitaEdisi],
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

  protected readonly namaKelas = signal('Kelas XI PPLG 1');
  protected readonly tautanNavigasi = TAUTAN_NAVIGASI;
  protected readonly tahun = tahunAjaran();

  protected readonly pitaTampil = computed(
    () => !JALUR_PANEL.some((awalan) => this.jalur().startsWith(awalan)),
  );

  constructor() {
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
