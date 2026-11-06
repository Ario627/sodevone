import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LoginRequestSchema } from '@kelas/contracts';
import { toApiFailure } from '../../inti/api/dasar';
import { Sesi } from '../../inti/sesi/sesi';

const TUJUAN_AMAN = /^\/(?!\/)[A-Za-z0-9\-._~/]*$/;

function tujuanAman(nilai: string | null): string {
  return nilai !== null && TUJUAN_AMAN.test(nilai) ? nilai : '/admin';
}

@Component({
  selector: 'kelas-masuk',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto max-w-[26rem] pt-6">
      <h1 class="font-serif text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.05] tracking-[-0.03em]">
        Masuk pengurus
      </h1>
      <p class="mt-3 text-sm text-teks-sekunder">
        Halaman ini hanya untuk pengurus kelas. Tidak ada pendaftaran mandiri.
      </p>

      <form class="mt-8 grid gap-5" (submit)="kirim($event)" novalidate>
        <div>
          <label for="username" class="teks-meta text-teks-sekunder">Nama pengguna</label>
          <input
            id="username"
            name="username"
            autocomplete="username"
            autocapitalize="none"
            spellcheck="false"
            [value]="username()"
            (input)="ubahUsername($event)"
            class="mt-2 min-h-11 w-full border-b border-garis-tegas bg-transparent text-md focus:border-sinyal"
          />
        </div>

        <div>
          <label for="password" class="teks-meta text-teks-sekunder">Kata sandi</label>
          <input
            id="password"
            type="password"
            name="password"
            autocomplete="current-password"
            [value]="password()"
            (input)="ubahPassword($event)"
            class="mt-2 min-h-11 w-full border-b border-garis-tegas bg-transparent text-md focus:border-sinyal"
          />
        </div>

        @if (galat(); as pesan) {
          <p role="alert" class="border-l-2 border-galat pl-3 text-sm text-galat">{{ pesan }}</p>
        }

        <button
          type="submit"
          [disabled]="sedangKirim()"
          class="min-h-11 bg-sinyal px-5 text-sm font-medium text-teks-terbalik transition-opacity duration-100 ease-keluar disabled:opacity-50"
        >
          {{ sedangKirim() ? 'Memeriksa…' : 'Masuk' }}
        </button>
      </form>

      <a
        routerLink="/"
        class="teks-meta mt-8 inline-flex min-h-11 items-center text-teks-sekunder hover:text-teks-utama"
      >
        &larr; Kembali ke situs
      </a>
    </section>
  `,
})
export class Masuk {
  private readonly sesi = inject(Sesi);
  private readonly router = inject(Router);
  private readonly rute = inject(ActivatedRoute);

  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly sedangKirim = signal(false);
  protected readonly galat = signal<string | undefined>(undefined);

  private readonly tujuan = computed(() => tujuanAman(this.rute.snapshot.queryParamMap.get('tujuan')));

  protected ubahUsername(peristiwa: Event): void {
    this.username.set((peristiwa.target as HTMLInputElement).value);
  }

  protected ubahPassword(peristiwa: Event): void {
    this.password.set((peristiwa.target as HTMLInputElement).value);
  }

  protected kirim(peristiwa: Event): void {
    peristiwa.preventDefault();
    void this.proses();
  }

  private async proses(): Promise<void> {
    if (this.sedangKirim()) {
      return;
    }

    const terbaca = LoginRequestSchema.safeParse({
      username: this.username(),
      password: this.password(),
    });

    if (!terbaca.success) {
      this.galat.set('Nama pengguna atau kata sandi belum diisi dengan benar.');
      return;
    }

    this.sedangKirim.set(true);
    this.galat.set(undefined);

    try {
      await this.sesi.masukDengan(terbaca.data.username, terbaca.data.password);
      await this.router.navigateByUrl(this.tujuan());
    } catch (galat) {
      this.galat.set(toApiFailure(galat).message);
      this.password.set('');
    } finally {
      this.sedangKirim.set(false);
    }
  }
}