import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Sesi } from '../../inti/sesi/sesi';

const MENU = [
  { label: 'Ringkasan', jalur: '/admin/ringkasan', tepat: true },
  { label: 'Pengumuman', jalur: '/admin/pengumuman', tepat: false },
  { label: 'Agenda', jalur: '/admin/agenda', tepat: false },
  { label: 'Galeri', jalur: '/admin/galeri', tepat: false },
  { label: 'Anggota', jalur: '/admin/anggota', tepat: false },
  { label: 'Papan', jalur: '/admin/papan', tepat: false },
] as const;

@Component({
  selector: 'kelas-kerangka-admin',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="border-b border-garis-halus pb-4">
      <div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p class="teks-meta text-sinyal">Panel pengurus</p>
        <div class="flex items-baseline gap-4">
          @if (sesi.pengguna(); as pengguna) {
            <span class="teks-meta text-teks-sekunder">
              {{ pengguna.displayName }} · {{ pengguna.role }}
            </span>
          }
          <button
            type="button"
            (click)="keluar()"
            class="teks-meta min-h-11 text-teks-sekunder transition-colors duration-100 ease-keluar hover:text-sinyal"
          >
            Keluar
          </button>
        </div>
      </div>

      <nav aria-label="Navigasi panel" class="scrollbar-none mt-3 -mb-4 overflow-x-auto">
        <ul class="flex items-center gap-6 whitespace-nowrap">
          @for (tautan of menu; track tautan.jalur) {
            <li>
              <a
                [routerLink]="tautan.jalur"
                routerLinkActive="text-teks-utama underline decoration-sinyal"
                [routerLinkActiveOptions]="{ exact: tautan.tepat }"
                ariaCurrentWhenActive="page"
                class="teks-meta inline-flex min-h-11 items-center pb-3 text-teks-sekunder decoration-2 underline-offset-[7px] hover:text-teks-utama"
                >{{ tautan.label }}</a
              >
            </li>
          }
        </ul>
      </nav>
    </div>

    <router-outlet />
  `,
})
export class KerangkaAdmin {
  protected readonly sesi = inject(Sesi);
  private readonly router = inject(Router);

  protected readonly menu = MENU;

  protected keluar(): void {
    void this.prosesKeluar();
  }

  private async prosesKeluar(): Promise<void> {
    await this.sesi.keluar();
    await this.router.navigate(['/masuk']);
  }
}