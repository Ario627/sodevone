import { ChangeDetectionStrategy, Component, computed, input, signal } from "@angular/core";
import { sumberGambarSosial, type PostinganSosial } from "../../inti/api/sosial.api";

const LABEL: Record<PostinganSosial['platform'], string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

const RASIO_TEGAK = 1.02;

type Bentang = 'tegak' | 'kotak' | 'lebar' | 'jumbo';

function bentangDari(postingan: PostinganSosial, indeks: number): Bentang {
    if(indeks === 0) {
        return 'jumbo';
    }

    const rasio = postingan.image.width / Math.max(postingan.image.height, 1);

    if(rasio <= 1 / RASIO_TEGAK) {
        return 'tegak';
    }

    return rasio >= 1.2 ? 'lebar' : 'kotak';
}

@Component({
  selector: 'kelas-sosial-mosaik',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <ul class="mosaik">
      @for (item of postingan(); track item.id; let i = $index) {
        <li class="petak" [class]="'petak-' + bentang(i)" [class.kosong]="rusakkah(item.id)">
          <a class="ubin" [href]="item.url" target="_blank" rel="noopener noreferrer nofollow">
            <img
              [src]="sumber(item, 'kecil')"
              [attr.alt]="item.image.altText ?? item.caption ?? LABEL[item.platform]"
              [attr.width]="item.image.width"
              [attr.height]="item.image.height"
              [attr.loading]="i < 3 ? 'eager' : 'lazy'"
              decoding="async"
              (error)="gagal(item.id, $event)"
            />

            <span class="tabir" aria-hidden="true"></span>

            <span class="cap" [class]="'cap-' + item.platform">
              <span class="teks-meta platform">{{ LABEL[item.platform] }}</span>
              @if (item.caption; as isi) {
                <span class="isi">{{ isi }}</span>
              }
            </span>

            <span class="keluar" aria-hidden="true">
              <span class="teks-meta">Buka</span>
              <span class="panah">&nearr;</span>
            </span>
          </a>
        </li>
      }
    </ul>
  `,
  styles: `
    .mosaik {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-auto-rows: 8.5rem;
      grid-auto-flow: dense;
      gap: 0.75rem;
    }

    .petak {
      min-width: 0;
    }

    .petak-jumbo {
      grid-column: span 2;
      grid-row: span 2;
    }

    .petak-tegak {
      grid-row: span 2;
    }

    .petak-lebar {
      grid-column: span 2;
    }

    .ubin {
      position: relative;
      display: block;
      block-size: 100%;
      background-color: var(--color-latar-sekunder);
      border: 1px solid var(--color-garis-halus);
      overflow: hidden;
      isolation: isolate;
    }

    .petak.kosong .ubin {
      background-image: repeating-linear-gradient(
        135deg,
        var(--color-garis-halus) 0 1px,
        transparent 1px 7px
      );
    }

    .ubin img {
      display: block;
      block-size: 100%;
      inline-size: 100%;
      object-fit: cover;
      filter: saturate(0.92);
      transform: scale(1.01);
      transition:
        transform 900ms var(--ease-keluar),
        filter 500ms var(--ease-keluar);
    }

    .ubin:hover img {
      filter: saturate(1);
      transform: scale(1.06);
    }

    .tabir {
      position: absolute;
      inset: 0;
      background-image: linear-gradient(
        185deg,
        rgb(13 12 11 / 0.28) 0%,
        transparent 34%,
        rgb(13 12 11 / 0.72) 100%
      );
      opacity: 0.9;
      pointer-events: none;
    }

    .cap {
      position: absolute;
      inset-inline: 0.8rem;
      inset-block-end: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      color: #f2efe8;
      pointer-events: none;
    }

    .platform {
      font-size: 0.625rem;
      letter-spacing: 0.14em;
      opacity: 0.82;
    }

    .cap-instagram .platform {
      color: #e8b4a0;
    }

    .cap-tiktok .platform {
      color: #a8d4d0;
    }

    .isi {
      display: -webkit-box;
      overflow: hidden;
      max-inline-size: 30ch;
      font-size: 0.8125rem;
      line-height: 1.35;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .keluar {
      position: absolute;
      inset-block-start: 0.55rem;
      inset-inline-end: 0.55rem;
      display: flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.22rem 0.4rem;
      background-color: rgb(13 12 11 / 0.62);
      color: #f2efe8;
      opacity: 0;
      transform: translateY(-0.3rem);
      transition:
        opacity 220ms var(--ease-keluar),
        transform 260ms var(--ease-keluar);
      pointer-events: none;
    }

    .keluar .teks-meta {
      font-size: 0.5625rem;
    }

    .panah {
      font-size: 0.6875rem;
      line-height: 1;
    }

    .ubin:hover .keluar,
    .ubin:focus-visible .keluar {
      opacity: 1;
      transform: translateY(0);
    }

    @media (min-width: 40rem) {
      .mosaik {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        grid-auto-rows: 10.5rem;
        gap: 0.9rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .ubin img,
      .keluar {
        transition: none;
      }

      .ubin:hover img {
        transform: none;
      }
    }

    @media (hover: none) {
      .keluar {
        opacity: 1;
        transform: none;
      }
    }
  `,
})
export class SosialMosaik {
  readonly postingan = input.required<readonly PostinganSosial[]>();

  protected readonly LABEL = LABEL;

  private readonly rusak = signal<readonly string[]>([]);

  protected gagal(id: string, event: Event): void {
    const gambar = event.target;

    if (!(gambar instanceof HTMLImageElement)) {
      return;
    }

    gambar.hidden = true;
    this.rusak.update((daftar) => (daftar.includes(id) ? daftar : [...daftar, id]));
  }

  protected rusakkah(id: string): boolean {
    return this.rusak().includes(id);
  }

  private readonly daftar = computed(() => this.postingan());

  protected bentang(indeks: number): Bentang {
    const item = this.daftar()[indeks];

    return item === undefined ? 'kotak' : bentangDari(item, indeks);
  }

  protected sumber(item: PostinganSosial, ukuran: 'kecil' | 'sedang'): string {
    return sumberGambarSosial(item, ukuran);
  }
}