import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'kelas-tidak-ditemukan',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="tidak-ditemukan">
      <h1>Halaman tidak ditemukan</h1>
      <p>Alamat yang dibuka tidak tersedia atau kontennya sudah dipindahkan.</p>
      <a routerLink="/">Kembali ke beranda</a>
    </section>
  `,
  styles: `
    .tidak-ditemukan {
      max-width: 32rem;
    }

    h1 {
      margin: 0 0 var(--spasi-3);
      font-size: clamp(1.5rem, 4vw, 2rem);
    }

    p {
      margin: 0 0 var(--spasi-6);
      color: var(--warna-teks-redup);
    }

    a {
      color: var(--warna-aksen);
    }
  `,
})
export class TidakDitemukan {}
