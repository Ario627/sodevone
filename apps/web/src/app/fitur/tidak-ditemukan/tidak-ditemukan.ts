import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'kelas-tidak-ditemukan',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="max-w-[34rem]">
      <p class="teks-meta text-sinyal">Galat 404</p>
      <h1 class="mt-4 font-serif text-3xl tracking-[-0.02em] sm:text-[2.75rem] sm:leading-[1.05]">
        Halaman tidak ditemukan
      </h1>
      <p class="mt-4 text-md text-teks-kuat-sekunder">
        Alamat yang dibuka tidak tersedia atau kontennya sudah dipindahkan.
      </p>
      <a
        routerLink="/"
        class="group mt-8 inline-flex items-baseline gap-2 border-b border-garis-tegas pb-1 text-sm font-medium transition-colors duration-100 ease-keluar hover:border-sinyal hover:text-sinyal"
      >
        <span
          aria-hidden="true"
          class="transition-transform duration-150 ease-keluar group-hover:-translate-x-1 motion-reduce:transform-none"
          >&larr;</span
        >
        Kembali ke beranda
      </a>
    </section>
  `,
})
export class TidakDitemukan {}
