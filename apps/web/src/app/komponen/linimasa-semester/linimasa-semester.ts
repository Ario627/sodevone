import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { AlbumSummary, EventSummary } from '@kelas/contracts';
import { sumberSampul } from '../../inti/api/galeri.api';
import { bolehBergerak, pantauMedia, skemaGelap, warnaToken } from '../../inti/gerak/media';
import { hariBulan, jamTeks } from '../../inti/format/tanggal';

const JARAK_SIMPUL = 3.4;
const LEBAR_JALAN = 1.25;
const SEGMEN_JALAN = 260;
const TINGGI_PAPAN = 0.4;
const LEBAR_PAPAN = 0.78;
const KANVAS_LEBAR = 512;
const KANVAS_TINGGI = 244;
const SUDUT_KAMERA = 52;
const TINGGI_KAMERA = 1.72;
const MUNDUR_KAMERA = 3.25;
const MUNDUR_TETAP = 2.2;
const SAMPING_KAMERA = 0.62;
const PANDANG_AHEAD = 3.3;
const TINGGI_PANDANG = 0.34;
const REDAM_KAMERA = 0.14;
const REDAM_JALAN = 0.1;
const SIMPUL_MAKS = 14;
const DURASI_SAMBAR = 0.34;
const LANGKAH_KAKI = 3.1;

const PALET = {
  terang: {
    tanah: '#e2dbc9',
    jalan: '#9c8f75',
    lewat: '#a4441f',
    tiang: '#4a4438',
    papan: '#f7f3e8',
    tinta: '#221e19',
    redup: '#7b7161',
    garis: '#cdc3ae',
    tubuh: '#2b2620',
    lampu: '#e8ddc4',
    batu: '#b3ab99',
    cahaya: 0.14,
  },
  gelap: {
    tanah: '#443a2b',
    jalan: '#7d6f54',
    lewat: '#e08a66',
    tiang: '#b3a795',
    papan: '#6b5e47',
    tinta: '#f7f1e1',
    redup: '#bcb19c',
    garis: '#5c5344',
    tubuh: '#efe9d9',
    lampu: '#8a7f68',
    batu: '#4d4436',
    cahaya: 0.5,
  },
} as const;

interface Nada {
  tanah: string;
  jalan: string;
  lewat: string;
  tiang: string;
  papan: string;
  tinta: string;
  redup: string;
  garis: string;
  tubuh: string;
  lampu: string;
  batu: string;
  cahaya: number;
}

function posisiSimpul(indeks: number): { x: number; z: number } {
  return {
    x: Math.sin(indeks * 0.78) * 2.05,
    z: -indeks * JARAK_SIMPUL,
  };
}

function tanggalJakarta(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(iso));
}

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

function gambarSampul(
  kanvas: HTMLCanvasElement,
  gambar: CanvasImageSource,
  lebar: number,
  tinggi: number,
): void {
  const ctx = kanvas.getContext('2d');

  if (ctx === null) {
    return;
  }

  const sisi = KANVAS_TINGGI - 92;
  const rasio = lebar / Math.max(tinggi, 1);
  const kotakLebar = sisi;
  const kotakTinggi = Math.min(sisi, sisi / Math.max(rasio, 0.5));
  const x = KANVAS_LEBAR - kotakLebar - 26;
  const y = (KANVAS_TINGGI - kotakTinggi) / 2 + 8;

  ctx.fillStyle = '#000000';
  ctx.globalAlpha = 0.14;
  ctx.fillRect(x - 4, y - 4, kotakLebar + 8, kotakTinggi + 8);
  ctx.globalAlpha = 1;

  ctx.drawImage(gambar, x, y, kotakLebar, kotakTinggi);
}

function gambarPapan(kegiatan: EventSummary, indeks: number, nada: Nada): HTMLCanvasElement {
  const kanvas = document.createElement('canvas');
  kanvas.width = KANVAS_LEBAR;
  kanvas.height = KANVAS_TINGGI;

  const ctx = kanvas.getContext('2d');

  if (ctx === null) {
    return kanvas;
  }

  const bagian = hariBulan(kegiatan.startsAt);

  ctx.fillStyle = nada.papan;
  ctx.fillRect(0, 0, KANVAS_LEBAR, KANVAS_TINGGI);

  ctx.strokeStyle = nada.garis;
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, KANVAS_LEBAR - 3, KANVAS_TINGGI - 3);

  ctx.fillStyle = nada.tinta;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.font = '700 74px ui-monospace, SFMono-Regular, monospace';
  ctx.fillText(bagian.hari, 74, 22);

  ctx.fillStyle = nada.redup;
  ctx.font = '600 21px ui-monospace, SFMono-Regular, monospace';
  ctx.fillText(bagian.bulan, 74, 100);
  ctx.fillText(bagian.tahun.slice(2), 74, 126);

  ctx.fillStyle = nada.redup;
  ctx.font = '600 17px ui-monospace, SFMono-Regular, monospace';
  ctx.fillText(String(indeks + 1).padStart(2, '0'), 74, 182);

  ctx.strokeStyle = nada.garis;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(148, 26);
  ctx.lineTo(148, KANVAS_TINGGI - 26);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = nada.tinta;
  ctx.font = '700 27px ui-serif, Georgia, serif';

  let y = 34;

  for (const baris of potongBaris(ctx, kegiatan.title, KANVAS_LEBAR - 320, 3)) {
    ctx.fillText(baris, 172, y);
    y += 33;
  }

  ctx.fillStyle = nada.redup;
  ctx.font = '500 18px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(
    [jamTeks(kegiatan.startsAt), kegiatan.location ?? 'lokasi menyusul'].join('  ·  ').slice(0, 26),
    172,
    KANVAS_TINGGI - 52,
  );

  return kanvas;
}

function bahanPita(
  THREE: typeof import('three'),
  jalur: InstanceType<typeof THREE.CatmullRomCurve3>,
  lebar: number,
  segmen: number,
): import('three').BufferGeometry<import('three').NormalBufferAttributes> {
  const posisi: number[] = [];
  const uv: number[] = [];
  const indeks: number[] = [];
  const titik = new THREE.Vector3();
  const depan = new THREE.Vector3();
  const samping = new THREE.Vector3();
  const atas = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < segmen; i += 1) {
    const t = i / (segmen - 1);

    jalur.getPointAt(t, titik);
    jalur.getTangentAt(t, depan);
    samping.crossVectors(depan, atas).normalize().multiplyScalar(lebar / 2);

    posisi.push(titik.x - samping.x, 0.014, titik.z - samping.z);
    posisi.push(titik.x + samping.x, 0.014, titik.z + samping.z);
    uv.push(0, t * 18, 1, t * 18);

    if (i < segmen - 1) {
      const a = i * 2;

      indeks.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geometri = new THREE.BufferGeometry();

  geometri.setAttribute('position', new THREE.Float32BufferAttribute(posisi, 3));
  geometri.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometri.setIndex(indeks);
  geometri.computeVertexNormals();

  return geometri;
}

function bahanGarisTepi(
  THREE: typeof import('three'),
  jalur: InstanceType<typeof THREE.CatmullRomCurve3>,
  lebar: number,
  segmen: number,
  sisi: number,
): import('three').BufferGeometry<import('three').NormalBufferAttributes> {
  const titik: number[] = [];
  const posisi = new THREE.Vector3();
  const depan = new THREE.Vector3();
  const samping = new THREE.Vector3();
  const atas = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < segmen; i += 1) {
    jalur.getPointAt(i / (segmen - 1), posisi);
    jalur.getTangentAt(i / (segmen - 1), depan);
    samping.crossVectors(depan, atas).normalize().multiplyScalar(lebar * sisi);

    titik.push(posisi.x + samping.x, 0.02, posisi.z + samping.z);
  }

  return new THREE.BufferGeometry().setAttribute(
    'position',
    new THREE.Float32BufferAttribute(titik, 3),
  );
}

@Component({
  selector: 'kelas-linimasa-semester',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="linimasa" #wadah [style.height.vh]="tinggiRail()">
      <div class="panggung" #panggung>
        <canvas #kanvas class="kanvas" role="presentation" aria-hidden="true"></canvas>

        <div class="hud">
          <p class="teks-piksel text-sinyal">{{ labelFase() }}</p>

          @if (aktif(); as simpul) {
            <a
              [routerLink]="['/agenda', simpul.slug]"
              class="judul"
              [attr.aria-label]="'Buka agenda ' + simpul.title"
            >
              {{ simpul.title }}
            </a>

            <p class="teks-meta text-teks-sekunder">
              {{ tanggalSimpul(simpul) }}
            </p>
          }
        </div>

        @for (kotak of kotakPapan(); track kotak.slug; let i = $index) {
          <a
            class="papan-tombol"
            [href]="'/agenda/' + kotak.slug"
            [style.left.%]="kotak.x"
            [style.top.%]="kotak.y"
            [style.width.%]="kotak.w"
            [style.height.%]="kotak.h"
            [attr.aria-label]="'Buka agenda ' + kotak.judul"
            (pointerenter)="sorot.set(i)"
            (pointerleave)="sorot.set(-1)"
            (click)="pilih(i, $event)"
          >
            <span class="sr-only">{{ kotak.judul }}</span>
          </a>
        }

        <ol class="titik" aria-hidden="true">
          @for (simpul of daftar(); track simpul.slug; let i = $index) {
            <li class="butir" [class.lewats]="i < indeks()" [class.kini]="i === indeks()"></li>
          }
        </ol>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .linimasa {
      position: relative;
    }

    .panggung {
      position: sticky;
      top: 0;
      display: flex;
      height: 100svh;
      flex-direction: column;
      justify-content: flex-end;
      overflow: hidden;
    }

    .kanvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .hud {
      position: relative;
      pointer-events: none;
      width: 100%;
      max-width: 76rem;
      margin-inline: auto;
      padding: 3.5rem clamp(1.25rem, 5vw, 2.5rem) clamp(2rem, 6vh, 3.25rem);
      background-image: linear-gradient(
        to top,
        var(--color-latar-halaman) 34%,
        color-mix(in oklab, var(--color-latar-halaman) 74%, transparent) 70%,
        transparent
      );
    }

    .judul {
      display: block;
      margin-top: 0.6rem;
      max-width: 24ch;
      font-family: var(--font-serif);
      font-size: clamp(1.5rem, 4.2vw, 2.5rem);
      line-height: 1.02;
      letter-spacing: -0.03em;
      text-decoration-thickness: 1px;
      text-underline-offset: 6px;
    }

    .judul {
      pointer-events: auto;
    }

    .judul:hover {
      text-decoration-line: underline;
      text-decoration-color: var(--color-sinyal);
    }

    .papan-tombol {
      position: absolute;
      border-radius: 3px;
      outline-offset: 2px;
      clip-path: inset(0 round 3px);
    }

    .papan-tombol:hover {
      background-color: color-mix(in oklab, var(--color-sinyal) 8%, transparent);
    }

    .papan-tombol:focus-visible {
      outline: 2px solid var(--color-sinyal);
    }

    .titik {
      display: flex;
      gap: 0.4rem;
      margin-top: 1.4rem;
    }

    .butir {
      width: 1.5rem;
      height: 2px;
      background-color: var(--color-garis-tegas);
      transition:
        background-color 200ms var(--ease-keluar),
        transform 200ms var(--ease-keluar);
    }

    .butir.kini {
      background-color: var(--color-sinyal);
      transform: scaleY(2.5);
    }

    @media (prefers-reduced-motion: reduce) {
      .butir {
        transition: none;
      }
    }
  `,
})
export class LinimasaSemester {
  readonly kegiatan = input.required<readonly EventSummary[]>();

  readonly album = input<readonly AlbumSummary[]>([]);

  private readonly router = inject(Router);

  protected readonly daftar = computed(() => this.kegiatan().slice(0, SIMPUL_MAKS));

  protected readonly tinggiRail = computed(() => {
    const jumlah = this.daftar().length;

    return Math.min(340, Math.max(170, 108 + jumlah * 40));
  });

  protected readonly indeks = signal(0);

  protected readonly sorot = signal(-1);

  protected readonly kotakPapan = signal<
    readonly { slug: string; judul: string; x: number; y: number; w: number; h: number }[]
  >([]);

  protected readonly aktif = computed(() => this.daftar()[this.indeks()]);

  protected readonly labelFase = computed(() => {
    const jumlah = this.daftar().length;

    if (jumlah === 0) {
      return 'Tanpa kegiatan';
    }

    return `Tahap ${this.indeks() + 1} dari ${jumlah}`;
  });

  private albumUntuk(kegiatan: EventSummary): AlbumSummary | undefined {
    const daftar = this.album();
    const langsung = daftar.find((item) => item.slug === kegiatan.slug);

    if (langsung !== undefined) {
      return langsung;
    }

    const tanggal = tanggalJakarta(kegiatan.startsAt);

    return daftar.find((item) => item.eventDate === tanggal);
  }

  protected pilih(indeks: number, peristiwa: Event): void {
    peristiwa.preventDefault();
    this.pilihPapan?.(indeks);
  }

  protected tanggalSimpul(kegiatan: EventSummary): string {
    const bagian = hariBulan(kegiatan.startsAt);

    return `${bagian.hari} ${bagian.bulan} ${bagian.tahun} · ${jamTeks(kegiatan.startsAt)}`;
  }

  private readonly kanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('kanvas');
  private readonly wadah = viewChild.required<ElementRef<HTMLElement>>('wadah');
  private readonly panggung = viewChild.required<ElementRef<HTMLElement>>('panggung');
  private readonly pegang = inject(DestroyRef);

  private rusak = false;

  private pilihPapan: ((indeks: number) => void) | null = null;

  private nada: Nada = skemaGelap() ? PALET.gelap : PALET.terang;

  constructor() {
    afterNextRender(() => {
      this.pegang.onDestroy(() => {
        this.rusak = true;
      });

      void this.siapkan();
    });
  }

  private async siapkan(): Promise<void> {
    const daftar = this.daftar();

    if (daftar.length < 2) {
      return;
    }

    const kanvas = this.kanvas().nativeElement;
    const wadah = this.wadah().nativeElement;
    const panggung = this.panggung().nativeElement;
    const kotak = panggung.getBoundingClientRect();

    if (kotak.width < 2 || kotak.height < 2) {
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;

    const suasana = new THREE.Scene();
    const kabut = new THREE.Fog(warnaToken('--color-latar-halaman', '#faf9f6'), 9, 30);

    suasana.fog = kabut;

    const kamera = new THREE.PerspectiveCamera(SUDUT_KAMERA, kotak.width / kotak.height, 0.05, 90);

    const jalur = new THREE.CatmullRomCurve3(
      [
        posisiSimpul(-1.4),
        ...daftar.map((_, indeks) => posisiSimpul(indeks)),
        posisiSimpul(daftar.length + 1.2),
      ].map((titik) => new THREE.Vector3(titik.x, 0, titik.z)),
      false,
      'catmullrom',
      0.3,
    );

    const panjangJalur = jalur.getLength();

    const bahanTanah = new THREE.MeshStandardMaterial({
      color: this.nada.tanah,
      roughness: 1,
      metalness: 0,
    });

    const tanah = new THREE.Mesh(new THREE.PlaneGeometry(70, panjangJalur + 60), bahanTanah);

    tanah.rotation.x = -Math.PI / 2;
    tanah.position.z = -panjangJalur / 2;
    tanah.position.y = -0.02;

    suasana.add(tanah);

    const geometriJalan = bahanPita(THREE, jalur, LEBAR_JALAN, SEGMEN_JALAN);
    const warnaJalan = new Float32Array(SEGMEN_JALAN * 2 * 3).fill(1);

    geometriJalan.setAttribute('color', new THREE.BufferAttribute(warnaJalan, 3));

    const bahanJalan = new THREE.MeshStandardMaterial({
      color: this.nada.jalan,
      roughness: 0.94,
      metalness: 0.02,
      vertexColors: true,
    });

    const jalan = new THREE.Mesh(geometriJalan, bahanJalan);

    jalan.frustumCulled = false;
    suasana.add(jalan);

    const bahanTepi = new THREE.LineBasicMaterial({
      color: warnaToken('--color-garis-tegas', '#c9c5ba'),
      transparent: true,
      opacity: 0.45,
    });

    const garisKiri = new THREE.Line(
      bahanGarisTepi(THREE, jalur, LEBAR_JALAN * 0.62, SEGMEN_JALAN, 1),
      bahanTepi,
    );

    const garisKanan = new THREE.Line(
      bahanGarisTepi(THREE, jalur, LEBAR_JALAN * 0.62, SEGMEN_JALAN, -1),
      bahanTepi,
    );

    garisKiri.frustumCulled = false;
    garisKanan.frustumCulled = false;
    suasana.add(garisKiri, garisKanan);

    const bahanBatu = new THREE.MeshStandardMaterial({
      color: this.nada.batu,
      roughness: 0.95,
      metalness: 0.02,
    });

    const jumlahBatu = 120;
    const geometriBatu = new THREE.BoxGeometry(1, 1, 1);
    const batu = new THREE.InstancedMesh(geometriBatu, bahanBatu, jumlahBatu);

    let benihBatu = 987654321;

    const acakBatu = (): number => {
      benihBatu = (Math.imul(benihBatu, 1103515245) + 12345) >>> 0;

      return benihBatu / 4294967296;
    };

    const mesinBatu = new THREE.Object3D();
    const titikBatu = new THREE.Vector3();
    const depanBatu = new THREE.Vector3();
    const sampingBatu = new THREE.Vector3();
    const atasBatu = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < jumlahBatu; i += 1) {
      const t = acakBatu();
      const sisi = acakBatu() > 0.5 ? 1 : -1;
      const jarakSisi = LEBAR_JALAN * 1.15 + acakBatu() * 3.6;
      const ukur = 0.018 + acakBatu() * 0.055;

      jalur.getPointAt(t, titikBatu);
      jalur.getTangentAt(t, depanBatu);
      sampingBatu.crossVectors(depanBatu, atasBatu).normalize().multiplyScalar(jarakSisi * sisi);

      mesinBatu.position.set(
        titikBatu.x + sampingBatu.x,
        ukur * 0.36,
        titikBatu.z + sampingBatu.z,
      );
      mesinBatu.rotation.set(0, acakBatu() * Math.PI, 0);
      mesinBatu.scale.set(ukur * 1.9, ukur * 0.7, ukur * 1.9);
      mesinBatu.updateMatrix();
      batu.setMatrixAt(i, mesinBatu.matrix);
    }

    batu.instanceMatrix.needsUpdate = true;
    batu.frustumCulled = false;
    suasana.add(batu);

    const bahanTiang = new THREE.MeshStandardMaterial({
      color: this.nada.tiang,
      roughness: 0.72,
      metalness: 0.24,
    });

    const geometriTiang = new THREE.CylinderGeometry(0.034, 0.042, 1.2, 7);
    const geometriPapan = new THREE.PlaneGeometry(LEBAR_PAPAN, TINGGI_PAPAN);
    const geometriBelakang = new THREE.BoxGeometry(LEBAR_PAPAN + 0.06, TINGGI_PAPAN + 0.06, 0.045);
    const geometriLengan = new THREE.BoxGeometry(0.34, 0.03, 0.03);
    const geometriLampu = new THREE.SphereGeometry(0.052, 12, 10);

    const papan: {
      akar: InstanceType<typeof THREE.Group>;
      bahan: InstanceType<typeof THREE.MeshStandardMaterial>;
      kanvas: HTMLCanvasElement;
      tekstur: InstanceType<typeof THREE.CanvasTexture>;
      lampu: InstanceType<typeof THREE.MeshStandardMaterial>;
      dasar: InstanceType<typeof THREE.Vector3>;
      slug: string;
    }[] = [];

    const kanvasCahaya = document.createElement('canvas');

    kanvasCahaya.width = 128;
    kanvasCahaya.height = 128;

    const ctxCahaya = kanvasCahaya.getContext('2d');

    if (ctxCahaya !== null) {
      const gradien = ctxCahaya.createRadialGradient(64, 64, 4, 64, 64, 62);

      gradien.addColorStop(0, 'rgba(255, 214, 160, 0.9)');
      gradien.addColorStop(0.55, 'rgba(255, 180, 110, 0.28)');
      gradien.addColorStop(1, 'rgba(255, 170, 100, 0)');

      ctxCahaya.fillStyle = gradien;
      ctxCahaya.fillRect(0, 0, 128, 128);
    }

    const teksturCahaya = new THREE.CanvasTexture(kanvasCahaya);

    teksturCahaya.colorSpace = THREE.SRGBColorSpace;

    const geometriCahaya = new THREE.PlaneGeometry(1.9, 1.9);

    const bahanCahaya = new THREE.MeshBasicMaterial({
      map: teksturCahaya,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: this.nada.cahaya,
    });

    daftar.forEach((kegiatan, indeks) => {
      const titik = posisiSimpul(indeks);
      const albumTerkait = this.albumUntuk(kegiatan);
      const arah = jalur.getTangentAt(
        Math.min(Math.max((indeks + 0.5) / (daftar.length + 1.4), 0), 1),
        new THREE.Vector3(),
      );
      const melintang = new THREE.Vector3(-arah.z, 0, arah.x).normalize();
      const sisi = indeks % 2 === 0 ? 1 : -1;
      const dasar = new THREE.Vector3(titik.x, 0, titik.z).addScaledVector(
        melintang,
        LEBAR_JALAN * 0.92 * sisi,
      );

      const kanvasPapan = gambarPapan(kegiatan, indeks, this.nada);
      const tekstur = new THREE.CanvasTexture(kanvasPapan);

      tekstur.colorSpace = THREE.SRGBColorSpace;
      tekstur.anisotropy = 4;

      if (albumTerkait?.cover != null) {
        const pemuat = new THREE.TextureLoader();

        pemuat.load(sumberSampul(albumTerkait.cover.id), (isi) => {
          if (this.rusak) {
            isi.dispose();

            return;
          }

          gambarSampul(kanvasPapan, isi.image as CanvasImageSource, isi.image.width, isi.image.height);
          tekstur.needsUpdate = true;
          isi.dispose();
        });
      }

      const bahan = new THREE.MeshStandardMaterial({
        map: tekstur,
        roughness: 0.9,
        metalness: 0,
        emissive: new THREE.Color(this.nada.papan),
        emissiveIntensity: 0,
      });

      const bahanBelakang = new THREE.MeshStandardMaterial({
        color: this.nada.tiang,
        roughness: 0.8,
        metalness: 0.1,
      });

      const tiang = new THREE.Mesh(geometriTiang, bahanTiang);

      tiang.position.copy(dasar).setY(0.58);

      const bilah = new THREE.Group();

      const belakang = new THREE.Mesh(geometriBelakang, bahanBelakang);
      const muka = new THREE.Mesh(geometriPapan, bahan);

      muka.position.z = 0.032;

      const lengan = new THREE.Mesh(geometriLengan, bahanTiang);

      lengan.position.set(-0.21 * sisi, -0.15, 0);

      bilah.add(belakang, muka, lengan);
      bilah.position.copy(dasar).setY(1.0);
      bilah.rotation.y = Math.atan2(-arah.x, -arah.z);
      bilah.position.addScaledVector(melintang, 0.33 * sisi);

      const lampuBahan = new THREE.MeshStandardMaterial({
        color: this.nada.lampu,
        emissive: new THREE.Color(this.nada.lewat),
        emissiveIntensity: 0.5,
        roughness: 0.35,
        metalness: 0.1,
      });

      const lampu = new THREE.Mesh(geometriLampu, lampuBahan);

      lampu.position.copy(dasar).setY(1.42);

      const kolam = new THREE.Mesh(geometriCahaya, bahanCahaya);

      kolam.rotation.x = -Math.PI / 2;
      kolam.position.copy(dasar).setY(0.024);

      const akar = new THREE.Group();

      akar.add(tiang, bilah, lampu, kolam);
      suasana.add(akar);

      papan.push({
        akar,
        bahan,
        kanvas: kanvasPapan,
        tekstur,
        lampu: lampuBahan,
        dasar: dasar.clone(),
        slug: kegiatan.slug,
      });
    });

    const tubuhBahan = new THREE.MeshStandardMaterial({
      color: this.nada.tubuh,
      roughness: 0.62,
      metalness: 0.08,
    });

    const pejalan = new THREE.Group();
    const badan = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.27, 0.14), tubuhBahan);
    const kepala = new THREE.Mesh(new THREE.SphereGeometry(0.082, 14, 12), tubuhBahan);
    const kakiKiri = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.21, 0.058), tubuhBahan);
    const kakiKanan = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.21, 0.058), tubuhBahan);
    const tas = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.16, 0.07), tubuhBahan);

    badan.position.y = 0.34;
    kepala.position.y = 0.55;
    kakiKiri.position.set(-0.052, 0.105, 0);
    kakiKanan.position.set(0.052, 0.105, 0);
    tas.position.set(0, 0.36, -0.1);

    pejalan.add(badan, kepala, kakiKiri, kakiKanan, tas);
    pejalan.scale.setScalar(0.92);

    const sorot = new THREE.PointLight(0xffcf9a, 2.4, 6.4, 2);

    sorot.position.set(0, 1.05, 0.3);
    pejalan.add(sorot);

    const lentera = new THREE.Mesh(
      new THREE.SphereGeometry(0.036, 10, 8),
      new THREE.MeshStandardMaterial({
        color: 0xfff1d4,
        emissive: new THREE.Color(0xffb066),
        emissiveIntensity: 2.6,
        roughness: 0.3,
      }),
    );

    lentera.position.set(0.13, 0.44, 0.06);
    pejalan.add(lentera);

    const kolamPejalan = new THREE.Mesh(geometriCahaya, bahanCahaya);

    kolamPejalan.rotation.x = -Math.PI / 2;
    kolamPejalan.position.set(0, 0.026, 0.05);
    kolamPejalan.scale.setScalar(1.15);
    pejalan.add(kolamPejalan);
    suasana.add(pejalan);

    const kanvasLangit = document.createElement('canvas');

    kanvasLangit.width = 8;
    kanvasLangit.height = 256;

    const ctxLangit = kanvasLangit.getContext('2d');

    const warnaLangitAtas = warnaToken('--color-latar-halaman', '#faf9f6');
    const warnaLangitBawah = this.nada.tanah;

    if (ctxLangit !== null) {
      const gradienLangit = ctxLangit.createLinearGradient(0, 0, 0, 256);

      gradienLangit.addColorStop(0, warnaLangitAtas);
      gradienLangit.addColorStop(0.62, warnaLangitAtas);
      gradienLangit.addColorStop(1, warnaLangitBawah);

      ctxLangit.fillStyle = gradienLangit;
      ctxLangit.fillRect(0, 0, 8, 256);
    }

    const teksturLangit = new THREE.CanvasTexture(kanvasLangit);

    teksturLangit.colorSpace = THREE.SRGBColorSpace;

    const bahanLangit = new THREE.MeshBasicMaterial({
      map: teksturLangit,
      fog: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.92,
    });

    const langit = new THREE.Mesh(new THREE.PlaneGeometry(220, 70), bahanLangit);

    langit.position.set(0, 26, -(panjangJalur + 34));
    langit.visible = false;
    suasana.add(langit);

    const kunci = new THREE.DirectionalLight(0xfff2dc, 1.75);

    kunci.position.set(-4.2, 7.4, 3.4);

    const dingin = new THREE.DirectionalLight(0xcfe0ff, 0.42);

    dingin.position.set(5.2, 2.4, -5.4);

    const angkasa = new THREE.HemisphereLight(0xfff4e2, 0x120f0b, 1.9);

    const isiKamera = new THREE.PointLight(0xffe8cd, 0.35, 10, 2);

    suasana.add(kunci, dingin, angkasa, isiKamera);

    const posisiJalan = new THREE.Vector3();
    const arahJalan = new THREE.Vector3();
    const melintangJalan = new THREE.Vector3();
    const posisiSebelum = new THREE.Vector3();
    const tujuanKamera = new THREE.Vector3();
    const lihat = new THREE.Vector3();
    const warnaLewat = new THREE.Color(1.95, 1.42, 1.02);
    const warnaLembap = new THREE.Color(0.56, 0.57, 0.62);

    let progresHalus = 0;
    let progresSebelum = 0;
    let ayun = 0;
    let ayunKaki = 0;
    let guling = 0;
    let mundur = MUNDUR_KAMERA;
    let butirNyala = -1;
    let indeksKini = -1;
    let hidup = true;
    let bingkai = 0;
    let siapPertama = true;
    let fokusIndeks = -1;
    let fokusWaktu = 0;
    let detik = 0;
    let detikKotak = -1;

    this.pilihPapan = (indeks: number): void => {
      if (fokusIndeks >= 0) {
        return;
      }

      fokusIndeks = indeks;
      fokusWaktu = 0;
    };

    const gerak = bolehBergerak();

    const ukurProgres = (): number => {
      const kotakKini = wadah.getBoundingClientRect();
      const rel = Math.max(kotakKini.height - globalThis.innerHeight, 1);
      const lewat = -kotakKini.top;

      return Math.min(Math.max(lewat / rel, 0), 1);
    };

    const warnaiJalan = (sampai: number): void => {
      if (sampai === butirNyala) {
        return;
      }

      butirNyala = sampai;

      const atribut = geometriJalan.getAttribute('color') as InstanceType<
        typeof THREE.BufferAttribute
      >;

      for (let i = 0; i < SEGMEN_JALAN; i += 1) {
        const warna = i <= sampai ? warnaLewat : warnaLembap;

        atribut.setXYZ(i * 2, warna.r, warna.g, warna.b);
        atribut.setXYZ(i * 2 + 1, warna.r, warna.g, warna.b);
      }

      atribut.needsUpdate = true;
    };

    const sorotPapan = (target: number): void => {
      if (target === indeksKini) {
        return;
      }

      indeksKini = target;

      papan.forEach((item, indeks) => {
        const aktif = indeks === target;
        const lewat = indeks < target;

        item.bahan.emissiveIntensity = aktif ? 0.32 : 0;
        item.lampu.emissiveIntensity = aktif ? 3 : lewat ? 0.55 : 0.1;

        const skala = aktif ? 1.07 : 1;

        item.akar.scale.setScalar(item.akar.scale.x + (skala - item.akar.scale.x) * 0.5);
      });

      this.indeks.set(Math.min(Math.max(target, 0), daftar.length - 1));
    };

    let tandaKotak = '';
    const sudutProyeksi = new THREE.Vector3();
    const posisiSambar = new THREE.Vector3();
    const lihatSambar = new THREE.Vector3();

    const hitungKotakPapan = (): void => {
      const hasil: { slug: string; judul: string; x: number; y: number; w: number; h: number }[] = [];

      papan.forEach((item, indeks) => {
        const kegiatan = daftar[indeks];

        if (kegiatan === undefined || !item.akar.visible) {
          return;
        }

        const titikDunia = item.dasar;
        const lebar = LEBAR_PAPAN;
        const tinggi = TINGGI_PAPAN;

        const a = sudutProyeksi.set(titikDunia.x - lebar / 2, titikDunia.y + 1, titikDunia.z).project(kamera);
        const ax = (a.x * 0.5 + 0.5) * 100;
        const ay = (-a.y * 0.5 + 0.5) * 100;

        const b = sudutProyeksi
          .set(titikDunia.x + lebar / 2, titikDunia.y + 1 - tinggi * 1.4, titikDunia.z)
          .project(kamera);
        const bx = (b.x * 0.5 + 0.5) * 100;
        const by = (-b.y * 0.5 + 0.5) * 100;

        const kiri = Math.min(ax, bx);
        const kanan = Math.max(ax, bx);
        const atas = Math.min(ay, by);
        const bawah = Math.max(ay, by);

        const tengahX = (kiri + kanan) / 2;
        const tengahY = (atas + bawah) / 2;

        if (tengahX < 6 || tengahX > 94 || tengahY < 4 || tengahY > 96) {
          return;
        }

        if (kanan - kiri < 4 || bawah - atas < 3) {
          return;
        }

        const bulat = (nilai: number): number => Math.round(nilai * 10) / 10;

        hasil.push({
          slug: kegiatan.slug,
          judul: kegiatan.title,
          x: bulat(kiri),
          y: bulat(atas),
          w: bulat(kanan - kiri),
          h: bulat(bawah - atas),
        });
      });

      const tanda = hasil.map((item) => `${item.slug}:${item.x}:${item.y}`).join('|');

      if (tanda === tandaKotak) {
        return;
      }

      tandaKotak = tanda;
      this.kotakPapan.set(hasil);
    };

    const gambar = (): void => {
      if (!hidup) {
        return;
      }

      detik += 0.016;

      const mentah = ukurProgres();
      const delta = mentah - progresSebelum;

      progresSebelum = mentah;
      progresHalus += (mentah - progresHalus) * (gerak ? REDAM_JALAN : 1);

      const jepit = Math.min(Math.max(progresHalus, 0), 1);

      if (siapPertama) {
        siapPertama = false;
        mundur = MUNDUR_TETAP;
      }

      jalur.getPointAt(jepit, posisiJalan);
      jalur.getTangentAt(jepit, arahJalan);
      posisiSebelum.copy(posisiJalan);

      pejalan.position.copy(posisiJalan);

      const hadap = Math.atan2(arahJalan.x, arahJalan.z);

      pejalan.rotation.y +=
        Math.atan2(Math.sin(hadap - pejalan.rotation.y), Math.cos(hadap - pejalan.rotation.y)) * 0.2;

      const laju = Math.min(Math.abs(delta) * 3200, 1);

      ayunKaki += (laju - ayunKaki) * 0.14;
      ayun += Math.abs(delta) * panjangJalur * LANGKAH_KAKI * 6;

      kakiKiri.rotation.x = Math.sin(ayun) * 0.66 * ayunKaki;
      kakiKanan.rotation.x = -Math.sin(ayun) * 0.66 * ayunKaki;
      badan.position.y = 0.34 + Math.abs(Math.sin(ayun)) * 0.02 * ayunKaki;
      badan.rotation.z = Math.sin(ayun) * 0.05 * ayunKaki;
      kepala.position.y = 0.55 + Math.abs(Math.sin(ayun)) * 0.012 * ayunKaki;

      const lengkung = arahJalan.x * 0.34 + Math.sin(jepit * 8.2) * 0.05;

      guling += (lengkung - guling) * 0.06;

      const napas = Math.sin(ayun * 0.22) * 0.012;

      mundur += (MUNDUR_KAMERA - mundur) * 0.02;

      melintangJalan.set(-arahJalan.z, 0, arahJalan.x).normalize();

      tujuanKamera
        .copy(posisiJalan)
        .addScaledVector(arahJalan, -mundur)
        .addScaledVector(melintangJalan, SAMPING_KAMERA)
        .setY(TINGGI_KAMERA + napas);

      if (gerak) {
        kamera.position.lerp(tujuanKamera, REDAM_KAMERA);
      } else {
        kamera.position.copy(tujuanKamera);
      }

      lihat
        .copy(posisiJalan)
        .addScaledVector(arahJalan, PANDANG_AHEAD)
        .addScaledVector(melintangJalan, SAMPING_KAMERA * 0.35)
        .setY(TINGGI_PANDANG);

      if (fokusIndeks >= 0) {
        const board = papan[fokusIndeks];

        fokusWaktu += 0.016;

        if (board !== undefined) {
          const arahKeKamera = new THREE.Vector3(1, 0, 1.35).normalize();

          posisiSambar
            .copy(board.akar.position)
            .addScaledVector(arahKeKamera, 1.15)
            .setY(1.12);

          lihatSambar.copy(board.akar.position).setY(0.98);

          const bagian = Math.min(fokusWaktu / DURASI_SAMBAR, 1);
          const halus = bagian * bagian * (3 - 2 * bagian);

          kamera.position.lerp(posisiSambar, 0.09 + halus * 0.16);
          kamera.up.set(0, 1, 0);
          kamera.lookAt(lihatSambar);

          board.bahan.emissiveIntensity = 0.3 + halus * 0.5;

          if (fokusWaktu >= DURASI_SAMBAR) {
            const tujuan = daftar[fokusIndeks];

            fokusIndeks = -1;

            if (tujuan !== undefined) {
              void this.router.navigate(['/agenda', tujuan.slug]);
            }
          }
        }

        renderer.render(suasana, kamera);

        if (gerak) {
          bingkai = requestAnimationFrame(gambar);
        }

        return;
      }

      kamera.up.set(Math.sin(guling) * 0.22, 1, 0).normalize();
      kamera.lookAt(lihat);

      isiKamera.position.copy(kamera.position).setY(kamera.position.y - 0.2);

      warnaiJalan(Math.round(jepit * (SEGMEN_JALAN - 1)));
      sorotPapan(Math.round(jepit * (daftar.length - 1)));

      if (detik - detikKotak > 0.18) {
        detikKotak = detik;
        hitungKotakPapan();
      }

      renderer.render(suasana, kamera);

      if (gerak) {
        bingkai = requestAnimationFrame(gambar);
      }
    };

    const ukur = (): void => {
      const kini = panggung.getBoundingClientRect();

      if (kini.width < 2 || kini.height < 2) {
        return;
      }

      renderer.setSize(kini.width, kini.height, false);
      kamera.aspect = kini.width / kini.height;
      kamera.updateProjectionMatrix();

      if (!gerak) {
        gambar();
      }
    };

    const pengintai = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(ukur);

    pengintai?.observe(panggung);

    const mulai = (): void => {
      if (gerak) {
        bingkai = requestAnimationFrame(gambar);
      } else {
        gambar();
      }
    };

    const pemantau =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            (catatan) => {
              const tampak = catatan[0]?.isIntersecting ?? false;

              if (tampak && bingkai === 0) {
                mulai();
              }

              if (!tampak && bingkai !== 0) {
                cancelAnimationFrame(bingkai);
                bingkai = 0;
              }
            },
            { threshold: 0.04 },
          );

    hitungKotakPapan();

    if (pemantau === null) {
      mulai();
    } else {
      pemantau.observe(wadah);
    }

    const bukuCatatanWarna = (gelap: boolean): void => {
      warnaLewat.setRGB(gelap ? 1.95 : 1.34, gelap ? 1.42 : 1.04, gelap ? 1.02 : 0.86);
      warnaLembap.setRGB(gelap ? 0.62 : 0.56, gelap ? 0.6 : 0.57, gelap ? 0.56 : 0.62);
    };

    const gantiNada = (gelap: boolean): void => {
      this.nada = gelap ? PALET.gelap : PALET.terang;

      bahanTanah.color.set(this.nada.tanah);
      bahanJalan.color.set(this.nada.jalan);
      bahanTiang.color.set(this.nada.tiang);
      bahanBatu.color.set(this.nada.batu);
      bahanCahaya.opacity = this.nada.cahaya;
      tubuhBahan.color.set(this.nada.tubuh);
      bahanTepi.color.set(warnaToken('--color-garis-tegas', '#c9c5ba'));

      bukuCatatanWarna(gelap);
      kabut.color.set(warnaToken('--color-latar-halaman', '#faf9f6'));
      butirNyala = -1;

      papan.forEach((item, indeks) => {
        const kegiatan = daftar[indeks];

        if (kegiatan === undefined) {
          return;
        }

        const gambarBaru = gambarPapan(kegiatan, indeks, this.nada);
        const konteks = item.kanvas.getContext('2d');

        if (konteks !== null) {
          konteks.clearRect(0, 0, item.kanvas.width, item.kanvas.height);
          konteks.drawImage(gambarBaru, 0, 0);
          item.tekstur.needsUpdate = true;
        }

        item.bahan.emissive.set(this.nada.papan);
        item.lampu.emissive.set(this.nada.lewat);
        item.lampu.color.set(this.nada.lampu);
      });

      indeksKini = -1;

      if (!gerak) {
        gambar();
      }
    };

    const lepasMedia = pantauMedia('(prefers-color-scheme: dark)', gantiNada);

    this.pegang.onDestroy(() => {
      hidup = false;

      if (bingkai !== 0) {
        cancelAnimationFrame(bingkai);
      }

      pemantau?.disconnect();
      pengintai?.disconnect();
      lepasMedia();
      this.pilihPapan = null;
      this.kotakPapan.set([]);

      papan.forEach((item) => {
        item.tekstur.dispose();
        item.bahan.dispose();
        item.lampu.dispose();
      });

      tanah.geometry.dispose();
      geometriJalan.dispose();
      garisKiri.geometry.dispose();
      garisKanan.geometry.dispose();
      langit.geometry.dispose();
      bahanLangit.dispose();
      teksturLangit.dispose();
      geometriCahaya.dispose();
      bahanCahaya.dispose();
      teksturCahaya.dispose();
      geometriBatu.dispose();
      bahanBatu.dispose();
      geometriTiang.dispose();
      geometriPapan.dispose();
      geometriBelakang.dispose();
      geometriLengan.dispose();
      geometriLampu.dispose();
      badan.geometry.dispose();
      kepala.geometry.dispose();
      kakiKiri.geometry.dispose();
      kakiKanan.geometry.dispose();
      tas.geometry.dispose();
      lentera.geometry.dispose();
      (lentera.material as InstanceType<typeof THREE.MeshStandardMaterial>).dispose();
      bahanTanah.dispose();
      bahanJalan.dispose();
      bahanTiang.dispose();
      bahanTepi.dispose();
      tubuhBahan.dispose();
      renderer.dispose();
    });
  }
}
