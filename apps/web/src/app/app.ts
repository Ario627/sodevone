import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { tahunAjaran } from './inti/format/tanggal';

const TAUTAN_NAVIGASI = [
  { label: 'Beranda', jalur: '/', tepat: true },
  { label: 'Pengumuman', jalur: '/pengumuman', tepat: false },
  { label: 'Agenda', jalur: '/agenda', tepat: false },
  { label: 'Galeri', jalur: '/galeri', tepat: false },
  { label: 'Tentang', jalur: '/tentang', tepat: false },
] as const;

@Component({
  selector: 'kelas-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef) as ElementRef<HTMLElement>;
  private readonly destroyRef = inject(DestroyRef);

  private navigasiPertama = true;

  protected readonly namaKelas = signal('Kelas XI PPLG 1');
  protected readonly tautanNavigasi = TAUTAN_NAVIGASI;
  protected readonly tahun = tahunAjaran();

  constructor() {
    this.router.events
      .pipe(
        filter((peristiwa) => peristiwa instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        if (this.navigasiPertama) {
          this.navigasiPertama = false;
          return;
        }

        this.host.nativeElement.querySelector<HTMLElement>('main')?.focus({ preventScroll: true });
      });
  }
}
