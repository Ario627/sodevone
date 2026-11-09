import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { AnnouncementSummary } from '@kelas/contracts';
import { bolehBergerak, pantauMedia, skemaGelap, warnaToken } from '../../inti/gerak/media';
import { labelKategori } from '../../inti/format/label';

const LEBAR_KERTAS = 1.26;
const TINGGI_KERTAS = 1.62;
const LEBAR_PAPAN = 4.72;
const TINGGI_PAPAN = 3.16;
const TEBAL_PAPAN = 0.14;
const KERTAS_MAKS = 3;
const LEBAR_KANVAS = 504;
const TINGGI_KANVAS = 648;
const SUDUT_KAMERA = 46;
const JARAK_AWAL = 6.7;
const JARAK_DUDUK = 5.25;
const REDAM_IKUT = 0.075;
const GOYANG_AMPLITUDO = 0.019;
const GOYANG_KECEPATAN = 0.62;

const SEBARAN_KERTAS = 0.26;

function posisiKertas(indeks: number, jumlah: number): number {
  const dasar = 50 + (indeks - (jumlah - 1) / 2) * (SEBARAN_KERTAS * 100);

  return ((dasar / 100 - 0.5) * LEBAR_PAPAN * 0.92);
}

const PALET_CAT = {
  terang: {
    papan: '#26221d',
    papanSisi: '#191614',
    kertas: '#f4efe2',
    tinta: '#211d18',
    tintaRedup: '#6b6154',
    garis: '#c9bfa9',
  },
  gelap: {
    papan: '#151310',
    papanSisi: '#0c0b0a',
    kertas: '#28241d',
    tinta: '#efe8d8',
    tintaRedup: '#9c927f',
    garis: '#463f34',
  },
} as const;

type Nada = Record<keyof (typeof PALET_CAT)['terang'], string>;

function potongBaris(
  ctx: CanvasRenderingContext2D,
  teks: string,
  lebar: number,
  maks: number,
): string[] {
  const kata = teks.split(/\s+/).filter((bagian) => bagian.length > 0);
  const baris: string[] = [];
  let kini = '';

  for (const bagian of kata) {
    const coba = kini.length === 0 ? bagian : `${kini} ${bagian}`;

    if (ctx.measureText(coba).width <= lebar) {
      kini = coba;
      continue;
    }

    if (kini.length > 0) {
      baris.push(kini);
    }

    if (baris.length >= maks) {
      return baris;
    }

    kini = bagian;
  }

  if (kini.length > 0 && baris.length < maks) {
    baris.push(kini);
  }

  return baris;
}

function tanggalRingkas(nilai: string, zona: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: zona,
  }).format(new Date(nilai));
}

function gambarKertas(
  butir: AnnouncementSummary,
  indeks: number,
  nada: Nada,
): HTMLCanvasElement {
  const kanvas = document.createElement('canvas');
  kanvas.width = LEBAR_KANVAS;
  kanvas.height = TINGGI_KANVAS;

  const ctx = kanvas.getContext('2d');

  if (ctx === null) {
    return kanvas;
  }

  const padat = LEBAR_KANVAS - 96;

  ctx.fillStyle = nada.kertas;
  ctx.fillRect(0, 0, LEBAR_KANVAS, TINGGI_KANVAS);

  ctx.strokeStyle = nada.garis;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, LEBAR_KANVAS - 2, TINGGI_KANVAS - 2);

  ctx.fillStyle = nada.tintaRedup;
  ctx.font = '600 26px ui-monospace, monospace';
  ctx.textBaseline = 'top';
  ctx.fillText(String(indeks + 1).padStart(2, '0'), 48, 44);

  ctx.textAlign = 'right';
  ctx.font = '500 21px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(labelKategori(butir.category).toUpperCase(), LEBAR_KANVAS - 48, 47);
  ctx.textAlign = 'left';

  ctx.beginPath();
  ctx.moveTo(48, 92);
  ctx.lineTo(LEBAR_KANVAS - 48, 92);
  ctx.stroke();

  ctx.fillStyle = nada.tinta;
  ctx.font = '700 38px ui-serif, Georgia, serif';

  const judul = potongBaris(ctx, butir.title, padat, 3);
  let y = 122;

  for (const baris of judul) {
    ctx.fillText(baris, 48, y);
    y += 46;
  }

  ctx.fillStyle = nada.tintaRedup;
  ctx.font = '400 23px ui-sans-serif, system-ui, sans-serif';

  const isi = potongBaris(ctx, butir.excerpt, padat, 4);
  y += 18;

  for (const baris of isi) {
    ctx.fillText(baris, 48, y);
    y += 34;
  }

  ctx.beginPath();
  ctx.moveTo(48, TINGGI_KANVAS - 74);
  ctx.lineTo(LEBAR_KANVAS - 48, TINGGI_KANVAS - 74);
  ctx.stroke();

  ctx.fillStyle = nada.tintaRedup;
  ctx.font = '500 21px ui-monospace, monospace';
  ctx.fillText(tanggalRingkas(butir.publishedAt, 'Asia/Jakarta'), 48, TINGGI_KANVAS - 58);

  return kanvas;
}

@Component({
  selector: 'kelas-papan-layang',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="papan" #wadah>
      <canvas
        #kanvas
        class="kanvas"
        role="img"
        [attr.aria-label]="'Papan pengumuman tiga dimensi berisi ' + butir().length + ' pengumuman teratas'"
      ></canvas>

      <div class="tombol" role="group" aria-label="Buka pengumuman dari papan">
        @for (item of terlihat(); track item.slug; let i = $index) {
          <button
            type="button"
            (click)="lompat(item.slug)"
            (focus)="sorot.set(i)"
            (blur)="sorot.set(-1)"
          >
            Buka pengumuman {{ i + 1 }}: {{ item.title }}
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .papan {
      position: relative;
      width: 100%;
      height: clamp(19rem, 46vw, 26rem);
    }

    .kanvas {
      display: block;
      width: 100%;
      height: 100%;
      touch-action: pan-y;
    }

    .tombol {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `,
})
export class PapanLayang {
  readonly butir = input.required<readonly AnnouncementSummary[]>();

  readonly buka = output<string>();

  protected readonly sorot = signal(-1);

  private readonly kanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('kanvas');
  private readonly wadah = viewChild.required<ElementRef<HTMLElement>>('wadah');
  private readonly pegang = inject(DestroyRef);
  private rusak = false;

  private segarkan: ((daftar: readonly AnnouncementSummary[]) => void) | null = null;

  private nada: Nada = skemaGelap() ? PALET_CAT.gelap : PALET_CAT.terang;

  protected readonly terlihat = signal<readonly AnnouncementSummary[]>([]);

  protected lompat(slug: string): void {
    this.buka.emit(slug);
  }

  constructor() {
    effect(() => {
      const daftar = this.butir().slice(0, KERTAS_MAKS);

      this.terlihat.set(daftar);
      this.segarkan?.(daftar);
    });

    afterNextRender(() => {
      this.pegang.onDestroy(() => {
        this.rusak = true;
      });

      void this.siapkan();
    });
  }

  private async siapkan(): Promise<void> {
    const kanvas = this.kanvas().nativeElement;
    const wadah = this.wadah().nativeElement;
    const kotak = wadah.getBoundingClientRect();

    if (kotak.width < 2 || kotak.height < 2) {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }

      const pengintai = new ResizeObserver(() => {
        const kini = wadah.getBoundingClientRect();

        if (kini.width >= 2 && kini.height >= 2) {
          pengintai.disconnect();
          void this.siapkan();
        }
      });

      pengintai.observe(wadah);
      this.pegang.onDestroy(() => pengintai.disconnect());

      return;
    }

    const THREE = await import('three');

    if (this.rusak) {
      return;
    }

    let renderer: InstanceType<typeof THREE.WebGLRenderer>;

    try {
      renderer = new THREE.WebGLRenderer({ canvas: kanvas, antialias: true, alpha: true });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(kotak.width, kotak.height, false);
    renderer.setClearAlpha(0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const suasana = new THREE.Scene();
    const kamera = new THREE.PerspectiveCamera(SUDUT_KAMERA, kotak.width / kotak.height, 0.1, 60);
    kamera.position.set(0, 0, JARAK_AWAL);
    kamera.lookAt(0, 0, 0);

    const bahanPapan = new THREE.MeshStandardMaterial({
      color: this.nada.papan,
      roughness: 0.9,
      metalness: 0.02,
    });

    const bahanSisi = new THREE.MeshStandardMaterial({
      color: this.nada.papanSisi,
      roughness: 0.7,
      metalness: 0.12,
    });

    const papan = new THREE.Mesh(
      new THREE.BoxGeometry(LEBAR_PAPAN, TINGGI_PAPAN, TEBAL_PAPAN),
      [bahanSisi, bahanSisi, bahanSisi, bahanSisi, bahanPapan, bahanSisi],
    );

    const tepi = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(LEBAR_PAPAN, TINGGI_PAPAN, TEBAL_PAPAN)),
      new THREE.LineBasicMaterial({
        color: warnaToken('--color-garis-tegas', '#3f3a33'),
        transparent: true,
        opacity: 0.5,
      }),
    );

    const gantung = new THREE.Group();
    gantung.add(papan, tepi);

    const isi = this.terlihat().slice(0, KERTAS_MAKS);
    const kertas: {
      simpul: InstanceType<typeof THREE.Mesh>;
      bahan: InstanceType<typeof THREE.MeshStandardMaterial>;
      pin: InstanceType<typeof THREE.Mesh>;
      kanvas: HTMLCanvasElement;
      tekstur: InstanceType<typeof THREE.CanvasTexture>;
      fase: number;
      dasar: number;
      slug: string;
    }[] = [];

    const geometriKertas = new THREE.PlaneGeometry(LEBAR_KERTAS, TINGGI_KERTAS);
    const geometriPin = new THREE.SphereGeometry(0.034, 10, 8);
    const bahanPin = new THREE.MeshStandardMaterial({
      color: warnaToken('--color-sinyal-600', '#c2410c'),
      roughness: 0.34,
      metalness: 0.42,
    });

    const kanvasKosong = document.createElement('canvas');
    kanvasKosong.width = LEBAR_KANVAS;
    kanvasKosong.height = TINGGI_KANVAS;

    for (let indeks = 0; indeks < KERTAS_MAKS; indeks += 1) {
      const tekstur = new THREE.CanvasTexture(kanvasKosong);
      tekstur.colorSpace = THREE.SRGBColorSpace;
      tekstur.anisotropy = 4;

      const bahan = new THREE.MeshStandardMaterial({
        map: tekstur,
        roughness: 0.94,
        metalness: 0,
      });

      const simpul = new THREE.Mesh(geometriKertas, bahan);
      const pin = new THREE.Mesh(geometriPin, bahanPin);

      simpul.visible = false;
      pin.visible = false;

      gantung.add(simpul, pin);

      kertas.push({
        simpul,
        bahan,
        pin,
        kanvas: kanvasKosong,
        tekstur,
        fase: indeks * 1.17,
        dasar: 0,
        slug: '',
      });
    }

    const gambarUlang = (daftar: readonly AnnouncementSummary[]): void => {
      kertas.forEach((item, indeks) => {
        const butir = daftar[indeks];

        item.bahan.emissive.setHex(0x000000);
        item.bahan.emissiveIntensity = 0;

        if (butir === undefined) {
          item.simpul.visible = false;
          item.pin.visible = false;
          item.slug = '';

          return;
        }

        const gambarBaru = gambarKertas(butir, indeks, this.nada);
        const konteks = item.kanvas.getContext('2d');

        if (konteks !== null) {
          konteks.clearRect(0, 0, item.kanvas.width, item.kanvas.height);
          konteks.drawImage(gambarBaru, 0, 0);
          item.tekstur.needsUpdate = true;
        }

        const porsi = posisiKertas(indeks, daftar.length);

        item.dasar = porsi;
        item.slug = butir.slug;
        item.simpul.visible = true;
        item.pin.visible = true;
        item.simpul.position.x = porsi;
        item.simpul.position.y = 0.02;
        item.simpul.position.z = TEBAL_PAPAN / 2 + 0.006;
        item.pin.position.set(porsi, TINGGI_KERTAS / 2 - 0.09, TEBAL_PAPAN / 2 + 0.05);
      });
    };

    this.segarkan = gambarUlang;
    gambarUlang(isi);

    suasana.add(gantung);

    const kunci = new THREE.DirectionalLight(0xfff4e2, 2.1);
    kunci.position.set(-3.4, 4.2, 4.6);

    const isi2 = new THREE.DirectionalLight(0xdfe8ff, 0.85);
    isi2.position.set(3.6, -1.6, 2.4);

    const angkasa = new THREE.HemisphereLight(0xffffff, 0x1a1713, 0.9);

    const hangat = new THREE.PointLight(0xffc98a, 0.9, 14, 2);
    hangat.position.set(2.6, 2.2, 3.2);

    suasana.add(kunci, isi2, angkasa, hangat);

    let kursorX = 0;
    let kursorY = 0;
    let putarX = 0;
    let putarY = 0;
    let sorotSekarang = -1;
    let jarak = JARAK_AWAL;

    const gerak = bolehBergerak();

    const keKursor = (event: PointerEvent): void => {
      const kotakKini = wadah.getBoundingClientRect();

      kursorX = (event.clientX - kotakKini.left) / Math.max(kotakKini.width, 1) - 0.5;
      kursorY = (event.clientY - kotakKini.top) / Math.max(kotakKini.height, 1) - 0.5;
    };

    const keluar = (): void => {
      kursorX = 0;
      kursorY = 0;
    };

    if (gerak) {
      wadah.addEventListener('pointermove', keKursor);
      wadah.addEventListener('pointerleave', keluar);
    }

    const ray = new THREE.Raycaster();
    const titik = new THREE.Vector2();

    const ketuk = (event: PointerEvent): void => {
      const kotakKini = kanvas.getBoundingClientRect();

      titik.x = ((event.clientX - kotakKini.left) / Math.max(kotakKini.width, 1)) * 2 - 1;
      titik.y = -((event.clientY - kotakKini.top) / Math.max(kotakKini.height, 1)) * 2 + 1;

      ray.setFromCamera(titik, kamera);

      const kena = ray.intersectObjects(kertas.map((item) => item.simpul), false)[0];

      if (kena === undefined) {
        return;
      }

      const cocok = kertas.find((item) => item.simpul === kena.object);

      if (cocok !== undefined) {
        this.buka.emit(cocok.slug);
      }
    };

    kanvas.addEventListener('click', ketuk);

    const ukur = (): void => {
      const kini = wadah.getBoundingClientRect();

      if (kini.width < 2 || kini.height < 2) {
        return;
      }

      renderer.setSize(kini.width, kini.height, false);
      kamera.aspect = kini.width / kini.height;
      kamera.updateProjectionMatrix();
    };

    const pengintai = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(ukur);

    pengintai?.observe(wadah);

    const jam = new THREE.Clock();
    let hidup = true;
    let bingkai = 0;

    const gambar = (): void => {
      if (!hidup) {
        return;
      }

      const waktu = jam.getElapsedTime();
      const indeksSorot = this.sorot();

      if (indeksSorot !== sorotSekarang) {
        sorotSekarang = indeksSorot;

        kertas.forEach((item, posisi) => {
          const aktif = posisi === sorotSekarang;

          item.bahan.emissive.setHex(aktif ? 0x2a241c : 0x000000);
          item.bahan.emissiveIntensity = aktif ? 1 : 0;
        });
      }

      putarX += (kursorY * 0.16 - putarX) * REDAM_IKUT;
      putarY += (kursorX * 0.3 - putarY) * REDAM_IKUT;

      gantung.rotation.x = putarX;
      gantung.rotation.y = putarY;

      jarak += (JARAK_DUDUK - jarak) * 0.035;
      kamera.position.z = jarak;

      kertas.forEach((item, indeks) => {
        const aktif = indeks === sorotSekarang;
        const ayun = Math.sin(waktu * GOYANG_KECEPATAN + item.fase);

        item.simpul.rotation.z = (indeks % 2 === 0 ? -1 : 1) * 0.012 + ayun * GOYANG_AMPLITUDO;
        item.simpul.position.y = 0.02 + ayun * 0.006;
        item.simpul.position.z =
          TEBAL_PAPAN / 2 + 0.006 + (aktif ? 0.06 : 0) + Math.sin(waktu * 0.9 + item.fase) * 0.004;
        item.simpul.scale.setScalar(aktif ? 1.035 : 1);
        item.simpul.position.x =
          item.dasar + (aktif ? 0 : Math.sin(waktu * 0.4 + item.fase) * 0.004);
        item.pin.position.set(
          item.simpul.position.x,
          TINGGI_KERTAS / 2 - 0.09,
          TEBAL_PAPAN / 2 + 0.05,
        );
        item.pin.position.z = item.simpul.position.z + 0.04;
      });

      renderer.render(suasana, kamera);
      bingkai = requestAnimationFrame(gambar);
    };

    const hentikan = (): void => {
      if (bingkai !== 0) {
        cancelAnimationFrame(bingkai);
      }
    };

    const mulai = (): void => {
      if (!gerak) {
        renderer.render(suasana, kamera);

        return;
      }

      jarak = JARAK_AWAL;
      hentikan();
      bingkai = requestAnimationFrame(gambar);
    };

    const pemantau =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            (catatan) => {
              const tampak = catatan[0]?.isIntersecting ?? false;

              if (tampak) {
                mulai();
              } else {
                hentikan();
              }
            },
            { threshold: 0.15 },
          );

    if (pemantau === null) {
      mulai();
    } else {
      pemantau.observe(wadah);
    }

    const lepasMedia = pantauMedia('(prefers-color-scheme: dark)', (gelap) => {
      this.nada = gelap ? PALET_CAT.gelap : PALET_CAT.terang;

      bahanPapan.color.set(this.nada.papan);
      bahanSisi.color.set(this.nada.papanSisi);

      gambarUlang(this.terlihat());

      if (!gerak) {
        renderer.render(suasana, kamera);
      }
    });

    this.pegang.onDestroy(() => {
      hidup = false;
      hentikan();
      pemantau?.disconnect();
      pengintai?.disconnect();
      lepasMedia();
      kanvas.removeEventListener('click', ketuk);
      this.segarkan = null;
      wadah.removeEventListener('pointermove', keKursor);
      wadah.removeEventListener('pointerleave', keluar);

      kertas.forEach((item) => {
        item.tekstur.dispose();
        item.bahan.dispose();
      });

      geometriKertas.dispose();
      geometriPin.dispose();
      bahanPin.dispose();
      bahanPapan.dispose();
      bahanSisi.dispose();
      papan.geometry.dispose();
      tepi.geometry.dispose();
      (tepi.material as InstanceType<typeof THREE.LineBasicMaterial>).dispose();
      renderer.dispose();
    });
  }
}