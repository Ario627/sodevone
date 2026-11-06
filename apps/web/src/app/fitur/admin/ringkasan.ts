import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Sesi } from '../../inti/sesi/sesi';

@Component({
  selector: 'kelas-ringkasan-admin',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="pt-8">
      <h1 class="font-serif text-[clamp(1.5rem,3.5vw,2rem)] leading-[1.1] tracking-[-0.03em]">
        Selamat bekerja{{ nama() }}
      </h1>
      <p class="mt-3 max-w-[46ch] text-sm text-teks-sekunder">
        Dari sini kamu mengelola isi situs kelas. Setiap perubahan tercatat di audit.
      </p>
    </section>

    <section aria-labelledby="pekerjaan-judul" class="mt-10">
      <h2 id="pekerjaan-judul" class="teks-meta flex items-baseline gap-3">
        <span aria-hidden="true" class="text-sinyal">01</span>
        <span class="text-teks-kuat-sekunder">Yang bisa dikerjakan</span>
      </h2>

      <ul class="mt-4 divide-y divide-garis-halus border-y border-garis-halus">
        @for (butir of pekerjaan; track butir.jalur) {
          <li>
            <a
              [routerLink]="butir.jalur"
              class="group grid grid-cols-[2rem_1fr_auto] items-baseline gap-4 py-5"
            >
              <span class="teks-meta text-teks-sekunder group-hover:text-sinyal">
                {{ butir.nomor }}
              </span>
              <span>
                <span class="block text-base underline-offset-4 group-hover:underline">{{
                  butir.judul
                }}</span>
                <span class="mt-1 block text-sm text-teks-sekunder">{{ butir.ringkas }}</span>
              </span>
              <span aria-hidden="true" class="text-teks-sekunder">&rarr;</span>
            </a>
          </li>
        }
      </ul>
    </section>
  `,
})
export class RingkasanAdmin {
  private readonly sesi = inject(Sesi);

  protected readonly nama = () => {
    const pengguna = this.sesi.pengguna();

    return pengguna === null ? '' : `, ${pengguna.displayName}`;
  };

  protected readonly pekerjaan = [
    {
      nomor: '01',
      judul: 'Pengumuman',
      jalur: '/admin/pengumuman',
      ringkas: 'Buat draf, sunting, terbitkan, atau arsipkan pengumuman.',
    },
    {
      nomor: '02',
      judul: 'Situs publik',
      jalur: '/',
      ringkas: 'Lihat hasilnya seperti yang dilihat pengunjung.',
    },
  ];
}