import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { bingkaiDekode, progresDekode } from '../../inti/gerak/dekode';
import { muatAlatGulir, type AlatGulir } from '../../inti/gerak/gulir';
import { gerakDikurangi } from '../../inti/gerak/media';
import { TINGGI_GLYPH, lebarTeks, titikTeks } from '../../inti/piksel/glyph';

const KUNCI = 'kelas:tirai';

const DURASI_DEKODE = 1120;
const DURASI_HITUNG = 1500;
const MULAI_JALAN = 1900;
const DURASI_JALAN = 6200;
const DURASI_TUTUP = 900;
const AKHIR = MULAI_JALAN + DURASI_JALAN + 160;

const PANJANG_LORONG = 58;
const RADIUS_BOLA = 0.3;
const JARAK_BINGKAI = 3.4;
const BINGKAI_MAKS = 18;
const TINGGI_BINGKAI = 3.2;
const LEBAR_BINGKAI = 5.4;
const JARAK_KATA = 12.5;
const SKALA_VOXEL = 0.05;
const SKALA_KATA = 1.62;

const JUDUL = [
  ['01', 'PENGUMUMAN'],
  ['02', 'AGENDA'],
  ['03', 'GALERI'],
  ['04', 'KELAS'],
  ['05', 'SOSIAL'],
] as const;

const WARNA_LATAR = 0x0d0c0b;

function acakSederhana(benih: number): number {
  const x = Math.sin(benih * 12.9898) * 43758.5453;

  return x - Math.floor(x);
}

function pembangkitAcak(): () => number {
  let benih = 3;

  return () => {
    benih += 1;

    return acakSederhana(benih);
  };
}

function mudah(t: number): number {
  return t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

@Component({
  selector: 'kelas-tirai-masuk',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'fixed inset-0 z-[100] block',
    '[class.aktif]': 'tampil()',
    '[class.siap]': 'siap()',
    'aria-hidden': 'true',
  },
  template: `
    <canvas #kanvas class="kanvas"></canvas>

    <div #panel class="panel panel-atas"></div>
    <div #panelBawah class="panel panel-bawah"></div>

    <div #teks class="teks">
      <div class="bebas">
        <span class="teks-meta label">Situs kelas</span>
        <span class="teks-meta label kanan">{{ tahun() }}</span>
      </div>

      <div class="tengah">
        <p class="judul">{{ sekarang() }}</p>
        <div #garis class="garis"></div>
        <p class="teks-meta ket">Pengembangan Perangkat Lunak dan Gim</p>
      </div>

      <div class="bebas kaki">
        <span class="teks-meta label hitung">{{ hitung() }}</span>
        <button #lewati type="button" class="teks-meta label lewati" (click)="tutup()">
          Lewati
        </button>
      </div>
    </div>

    <div #jejak class="jejak">
      <span class="teks-meta">{{ jejakTeks() }}</span>
    </div>
  `,
  styles: `
    :host {
      display: none;
    }

    :host(.siap) {
      display: block;
      pointer-events: none;
    }

    :host(.aktif) {
      pointer-events: auto;
    }

    .kanvas {
      position: absolute;
      inset: 0;
      display: block;
      inline-size: 100%;
      block-size: 100%;
      opacity: 0;
      background-color: #0d0c0b;
      will-change: opacity;
    }

    .panel {
      position: absolute;
      inset-inline: 0;
      height: 50.5%;
      background-color: #0d0c0b;
      will-change: opacity;
    }

    .panel-atas {
      top: 0;
    }

    .panel-bawah {
      bottom: 0;
    }

    .teks {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: clamp(1.1rem, 3.2vw, 2.1rem);
      color: #eceae5;
      will-change: opacity;
    }

    .bebas {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
    }

    .label {
      color: #8d8a83;
      font-size: 0.6875rem;
      letter-spacing: 0.16em;
    }

    .kanan {
      text-align: right;
    }

    .tengah {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: clamp(0.9rem, 2.2vw, 1.5rem);
      text-align: center;
    }

    .judul {
      margin: 0;
      font-family: var(--font-piksel);
      font-size: clamp(1.65rem, 7.4vw, 4.4rem);
      font-weight: 400;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.02em;
      line-height: 1.05;
      white-space: pre;
      color: #f3f0e8;
    }

    .garis {
      height: 1px;
      width: 0;
      background-image: linear-gradient(90deg, transparent, #a4441f 18%, #a4441f 82%, transparent);
      will-change: width;
    }

    .ket {
      color: #7c7972;
      font-size: 0.625rem;
      letter-spacing: 0.22em;
    }

    .kaki {
      align-items: flex-end;
    }

    .hitung {
      color: #5f5c56;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.2em;
    }

    .lewati {
      padding: 0.55rem 0.1rem;
      border: 0;
      border-bottom: 1px solid #3a3733;
      background: none;
      color: #8d8a83;
      letter-spacing: 0.16em;
      cursor: pointer;
      pointer-events: auto;
      transition: color 160ms ease, border-color 160ms ease;
    }

    .lewati:hover,
    .lewati:focus-visible {
      color: #f3f0e8;
      border-color: #a4441f;
    }

    .jejak {
      position: absolute;
      inset-block-end: clamp(3.4rem, 9vw, 5rem);
      inset-inline: 0;
      text-align: center;
      color: #8d8a83;
      letter-spacing: 0.24em;
      opacity: 0;
      will-change: opacity;
    }

    @media (prefers-reduced-motion: reduce) {
      .lewati {
        transition: none;
      }
    }
  `,
})
export class TiraiMasuk {
  readonly nama = input('SODEVONE');

  readonly tahun = input('2026 / 2027');

  private readonly dokumen = inject(DOCUMENT);
  private readonly pegang = inject(DestroyRef);

  private readonly kanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('kanvas');
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly panelBawah = viewChild.required<ElementRef<HTMLElement>>('panelBawah');
  private readonly teks = viewChild.required<ElementRef<HTMLElement>>('teks');
  private readonly garis = viewChild.required<ElementRef<HTMLElement>>('garis');
  private readonly jejak = viewChild.required<ElementRef<HTMLElement>>('jejak');

  protected readonly tampil = signal(false);
  protected readonly siap = signal(false);
  protected readonly sekarang = signal('');
  protected readonly hitung = signal('000');
  protected readonly jejakTeks = signal('');

  private selesai = false;
  private lepasPendengar: (() => void) | undefined;

  constructor() {
    afterNextRender(() => {
      const jendela = this.dokumen.defaultView;

      if (jendela === null || gerakDikurangi() || this.pernahTampil()) {
        return;
      }

      this.sekarang.set(this.nama().replace(/\S/g, '\u00a0'));
      this.siap.set(true);
      this.tampil.set(true);
      this.kunciGulir(true);
      void this.mainkan(jendela);
    });

    this.pegang.onDestroy(() => {
      this.kunciGulir(false);
      this.bukaPendengar();
    });
  }

  protected tutup(): void {
    if (this.selesai) {
      return;
    }

    this.selesai = true;
    this.lewatiSekarang();
  }

  private pernahTampil(): boolean {
    try {
      return this.dokumen.defaultView?.sessionStorage.getItem(KUNCI) === '1';
    } catch {
      return false;
    }
  }

  private tandai(): void {
    try {
      this.dokumen.defaultView?.sessionStorage.setItem(KUNCI, '1');
    } catch {
      return;
    }
  }

  private kunciGulir(nilai: boolean): void {
    const html = this.dokumen.documentElement;

    if (nilai) {
      html.style.overflow = 'hidden';
      return;
    }

    html.style.removeProperty('overflow');
  }

  private bukaPendengar(): void {
    this.lepasPendengar?.();
    this.lepasPendengar = undefined;
  }

  private pasangPendengar(): void {
    const jendela = this.dokumen.defaultView;

    if (jendela === null) {
      return;
    }

    const lepas = (): void => this.tutup();
    const opsi = { passive: true } as const;

    jendela.addEventListener('wheel', lepas, opsi);
    jendela.addEventListener('touchmove', lepas, opsi);
    jendela.addEventListener('keydown', lepas);

    this.lepasPendengar = () => {
      jendela.removeEventListener('wheel', lepas);
      jendela.removeEventListener('touchmove', lepas);
      jendela.removeEventListener('keydown', lepas);
    };
  }

  private async mainkan(jendela: Window): Promise<void> {
    this.bukaPendengar();
    this.pasangPendengar();

    const alat = await muatAlatGulir();

    if (alat === null) {
      this.lewatiSekarang();
      return;
    }

    if (this.selesai) {
      return;
    }

    const teks = this.nama();
    const kotakTeks = this.teks().nativeElement;
    const garis = this.garis().nativeElement;
    const panel = this.panel().nativeElement;
    const bawah = this.panelBawah().nativeElement;
    const jejak = this.jejak().nativeElement;

    const acak = pembangkitAcak();
    const mulai = jendela.performance.now();

    let angka = 0;
    let bingkai = 0;
    let sudahJalan = false;

    const detak = jendela.setInterval(() => {
      angka = Math.min(100, angka + 3 + Math.round(acakSederhana(angka + 1) * 5));
      this.hitung.set(String(angka).padStart(3, '0'));

      if (angka >= 100) {
        jendela.clearInterval(detak);
      }
    }, DURASI_HITUNG / 24);

    alat.gsap.to(garis, {
      width: 'min(28rem, 62vw)',
      duration: DURASI_DEKODE / 1000,
      ease: 'power2.out',
    });

    const dekodekan = (): void => {
      const berlalu = jendela.performance.now() - mulai;
      const progres = progresDekode(berlalu, DURASI_DEKODE);

      this.sekarang.set(bingkaiDekode(teks, progres, acak));

      if (progres < 1 && !this.selesai) {
        bingkai = jendela.requestAnimationFrame(dekodekan);
        return;
      }

      this.sekarang.set(teks);
    };

    bingkai = jendela.requestAnimationFrame(dekodekan);

    const mulaiJalan = (): void => {
      if (sudahJalan || this.selesai) {
        return;
      }

      sudahJalan = true;
      jendela.clearInterval(detak);
      this.hitung.set('100');

      alat.gsap
        .timeline()
        .to(kotakTeks, { opacity: 0, duration: 0.55, ease: 'power2.in' }, 0)
        .to(panel, { opacity: 0, duration: 0.8, ease: 'power2.out' }, 0.15)
        .to(bawah, { opacity: 0, duration: 0.8, ease: 'power2.out' }, 0.15)
        .to(jejak, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 1);

      void this.jalankan(jendela, alat, mulai);
    };

    jendela.setTimeout(mulaiJalan, MULAI_JALAN);

    const akhiri = (): void => {
      if (this.selesai) {
        return;
      }

      this.selesai = true;
      jendela.cancelAnimationFrame(bingkai);
      jendela.clearInterval(detak);
      this.bukaPendengar();

      alat.gsap
        .timeline({
          onComplete: () => {
            this.tampil.set(false);
            this.kunciGulir(false);
            this.tandai();
          },
        })
        .to(jejak, { opacity: 0, duration: 0.35, ease: 'power2.in' }, 0)
        .to(
          this.kanvas().nativeElement,
          { opacity: 0, duration: DURASI_TUTUP / 1000, ease: 'power2.inOut' },
          0.2,
        );
    };

    jendela.setTimeout(akhiri, AKHIR);

    this.pegang.onDestroy(() => {
      jendela.cancelAnimationFrame(bingkai);
      jendela.clearInterval(detak);
    });
  }

  private async jalankan(jendela: Window, alat: AlatGulir, mulai: number): Promise<void> {
    const kanvas = this.kanvas().nativeElement;
    const kotak = kanvas.getBoundingClientRect();

    if (kotak.width < 4 || kotak.height < 4) {
      return;
    }

    const THREE = await import('three');

    if (this.selesai) {
      return;
    }

    const renderer = new THREE.WebGLRenderer({ canvas: kanvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(kotak.width, kotak.height, false);
    renderer.setClearColor(WARNA_LATAR, 1);

    const suasana = new THREE.Scene();
    suasana.fog = new THREE.Fog(WARNA_LATAR, 10, 36);

    const kamera = new THREE.PerspectiveCamera(58, kotak.width / kotak.height, 0.1, 90);
    kamera.position.set(0, 2.1, 4.9);

    const sinarBola = new THREE.PointLight(0xffb08a, 26, 18, 2);
    const sinarDepan = new THREE.DirectionalLight(0xffffff, 0.5);
    sinarDepan.position.set(2, 6, 6);
    const sinarLangit = new THREE.HemisphereLight(0xffffff, 0x1a1815, 0.42);

    suasana.add(sinarBola, sinarDepan, sinarLangit);

    const geometriVoxel = new THREE.BoxGeometry(1, 1, 1);
    const bahanVoxel = new THREE.MeshBasicMaterial({ color: 0xeceae5, toneMapped: false });
    const bahanAksen = new THREE.MeshBasicMaterial({ color: 0xa4441f, toneMapped: false });
    const bahanGaris = new THREE.LineBasicMaterial({
      color: 0x54504a,
      transparent: true,
      opacity: 0.95,
    });
    const bahanTitik = new THREE.LineBasicMaterial({
      color: 0x3a3632,
      transparent: true,
      opacity: 0.5,
    });

    const geometriBingkai = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(LEBAR_BINGKAI, TINGGI_BINGKAI, 0.05),
    );

    const bingkai: InstanceType<typeof THREE.LineSegments>[] = [];

    for (let i = 0; i < BINGKAI_MAKS; i += 1) {
      const garisBingkai = new THREE.LineSegments(geometriBingkai, bahanGaris);
      garisBingkai.position.set(0, 0.55, 2 - i * JARAK_BINGKAI);
      suasana.add(garisBingkai);
      bingkai.push(garisBingkai);
    }

    const titikLantai: number[] = [];

    for (const x of [-LEBAR_BINGKAI / 2, LEBAR_BINGKAI / 2]) {
      titikLantai.push(x, -1.05, 3, x, -1.05, -PANJANG_LORONG);
    }

    for (const y of [-1.05, 2.15]) {
      titikLantai.push(-LEBAR_BINGKAI / 2, y, 3, LEBAR_BINGKAI / 2, y, 3);
      titikLantai.push(
        -LEBAR_BINGKAI / 2,
        y,
        -PANJANG_LORONG,
        LEBAR_BINGKAI / 2,
        y,
        -PANJANG_LORONG,
      );
    }

    const geometriLantai = new THREE.BufferGeometry();
    geometriLantai.setAttribute('position', new THREE.Float32BufferAttribute(titikLantai, 3));

    const lantai = new THREE.LineSegments(geometriLantai, bahanTitik);
    suasana.add(lantai);

    type Voxel = InstanceType<typeof THREE.InstancedMesh>;
    const kata: { mesh: Voxel; z: number }[] = [];
    const boneka = new THREE.Object3D();

    for (let i = 0; i < JUDUL.length; i += 1) {
      const [nomor, label] = JUDUL[i] as readonly [string, string];
      const isi = `${nomor} ${label}`;
      const titik = titikTeks(isi);
      const lebar = lebarTeks(isi);

      const mesh = new THREE.InstancedMesh(geometriVoxel, bahanVoxel, titik.length);
      mesh.frustumCulled = false;

      for (let k = 0; k < titik.length; k += 1) {
        const t = titik[k] as { kolom: number; baris: number };

        boneka.position.set(
          (t.kolom - (lebar - 1) / 2) * SKALA_VOXEL * SKALA_KATA,
          ((TINGGI_GLYPH - 1) / 2 - t.baris) * SKALA_VOXEL * SKALA_KATA,
          0,
        );
        boneka.scale.setScalar(SKALA_VOXEL * SKALA_KATA * 0.84);
        boneka.updateMatrix();
        mesh.setMatrixAt(k, boneka.matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
      mesh.position.set(i % 2 === 0 ? -0.62 : 0.62, 1.5, 1 - JARAK_KATA * 0.6 - i * JARAK_KATA);

      suasana.add(mesh);
      kata.push({ mesh, z: mesh.position.z });
    }

    const geometriBola = new THREE.IcosahedronGeometry(RADIUS_BOLA, 1);
    const bahanBola = new THREE.MeshStandardMaterial({
      color: 0xa4441f,
      emissive: 0x4d1a0a,
      roughness: 0.4,
      metalness: 0.1,
      flatShading: true,
    });

    const bola = new THREE.Mesh(geometriBola, bahanBola);
    const geometriCincin = new THREE.TorusGeometry(RADIUS_BOLA * 1.5, 0.014, 6, 44);
    const cincin = new THREE.Mesh(geometriCincin, bahanAksen);
    cincin.rotation.x = Math.PI / 2;
    bola.add(cincin);

    bola.position.set(0, 0.9, 1);
    bola.visible = false;
    suasana.add(bola);

    const riwayat: number[] = [];
    const geometriJejak = new THREE.BufferGeometry();
    geometriJejak.setAttribute('position', new THREE.Float32BufferAttribute(riwayat, 3));

    const sapuan = new THREE.Line(geometriJejak, bahanAksen);
    sapuan.visible = false;
    suasana.add(sapuan);

    let tampak = true;
    let hentikan = false;

    const penglihat = new IntersectionObserver((catatan) => {
      tampak = catatan.some((c) => c.isIntersecting);
    });
    penglihat.observe(kanvas);

    let posisiZ = 1;
    let putaran = 0;
    let jejakAkhir = '';

    const gambar = (): void => {
      const berlalu = jendela.performance.now() - mulai;
      const t = Math.min(Math.max((berlalu - MULAI_JALAN + 240) / DURASI_JALAN, 0), 1);
      const maju = mudah(t);
      const sebelumnya = posisiZ;

      posisiZ = 1 - maju * PANJANG_LORONG;
      putaran += (sebelumnya - posisiZ) / RADIUS_BOLA;

      const lompat = t < 0.1 ? (1 - mudah(t / 0.1)) * 2.4 : 0;

      bola.visible = t > 0.004;
      sapuan.visible = t > 0.02;
      bola.position.set(
        Math.sin(maju * 8.4) * 0.22,
        0.62 + Math.abs(Math.sin(maju * 24)) * 0.05 + lompat,
        posisiZ,
      );
      bola.rotation.set(putaran, putaran * 0.14, 0);

      sinarBola.position.copy(bola.position);
      sinarBola.position.y += 0.6;
      sinarBola.intensity = 20 + Math.sin(maju * 24) * 6;

      kamera.position.set(
        Math.sin(maju * 8.4) * 0.5,
        2.05 + Math.min(t, 0.35) * 0.9 + Math.sin(maju * 6.2) * 0.05,
        posisiZ + 4.1 - t * 0.7,
      );
      kamera.lookAt(0, 1.02, posisiZ - 6.2);

      for (const { mesh, z } of kata) {
        const jarak = z - posisiZ;

        mesh.visible = jarak < 4 && jarak > -28;
        mesh.rotation.y = Math.sin(maju * 2.6 + z) * 0.045;
      }

      for (const b of bingkai) {
        if (b.position.z > posisiZ + 4) {
          b.position.z -= BINGKAI_MAKS * JARAK_BINGKAI;
        }

        b.visible = Math.abs(b.position.z - posisiZ) < BINGKAI_MAKS * JARAK_BINGKAI;
      }

      riwayat.push(bola.position.x, bola.position.y, posisiZ);

      if (riwayat.length > 3 * 120) {
        riwayat.splice(0, 3 * 40);
      }

      geometriJejak.setAttribute('position', new THREE.Float32BufferAttribute(riwayat, 3));

      const dekat = Math.max(
        0,
        ...kata.map(({ z }) => 1 - Math.abs(z - posisiZ + 4) / JARAK_KATA),
      );
      const aktif = Math.min(Math.floor((1 - posisiZ + 4) / JARAK_KATA), JUDUL.length - 1);
      const judul = JUDUL[Math.max(aktif, 0)] as readonly [string, string];
      const label = dekat > 0.05 ? `${judul[0]} · ${judul[1]}` : 'SODEVONE';

      if (label !== jejakAkhir) {
        jejakAkhir = label;
        this.jejakTeks.set(label);
      }

      kamera.fov = kotak.width / kotak.height < 1 ? 70 : 58;
      kamera.updateProjectionMatrix();

      renderer.render(suasana, kamera);
    };

    const putar = (): void => {
      if (hentikan) {
        return;
      }

      if (tampak) {
        gambar();
      }

      jendela.requestAnimationFrame(putar);
    };

    const ubahUkuran = (): void => {
      const kini = kanvas.getBoundingClientRect();

      if (kini.width < 4 || kini.height < 4) {
        return;
      }

      renderer.setSize(kini.width, kini.height, false);
      kamera.aspect = kini.width / kini.height;
      kamera.updateProjectionMatrix();
    };

    const pengamat = new ResizeObserver(ubahUkuran);
    pengamat.observe(kanvas);

    alat.gsap.to(kanvas, { opacity: 1, duration: 0.7, ease: 'power2.out' });

    this.pegang.onDestroy(() => {
      hentikan = true;
      penglihat.disconnect();
      pengamat.disconnect();

      for (const { mesh } of kata) {
        mesh.dispose();
      }

      geometriVoxel.dispose();
      geometriBingkai.dispose();
      geometriLantai.dispose();
      geometriJejak.dispose();
      geometriBola.dispose();
      geometriCincin.dispose();
      bahanVoxel.dispose();
      bahanAksen.dispose();
      bahanGaris.dispose();
      bahanTitik.dispose();
      bahanBola.dispose();
      renderer.dispose();
    });

    jendela.requestAnimationFrame(putar);
  }

  private lewatiSekarang(): void {
    const jendela = this.dokumen.defaultView;

    this.bukaPendengar();

    if (jendela === null) {
      return;
    }

    this.tampil.set(false);
    this.kunciGulir(false);
    this.tandai();
  }
}
