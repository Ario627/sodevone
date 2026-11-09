import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { bolehBergerak, pantauMedia, warnaToken } from '../../inti/gerak/media';
import { TINGGI_GLYPH, lebarTeks, titikTeks } from '../../inti/piksel/glyph';

const LAPIS = 3;
const SISI = 0.92;
const JARAK_LAPIS = 0.88;
const SUDUT_Y = -0.62;
const SUDUT_X = 0.3;
const AYUN_Y = 0.11;
const AYUN_X = 0.05;
const LERAP_TUNJUK = 0.085;
const GESER_TUNJUK = 0.26;
const DURASI_SEL = 380;
const JEDA_PIKSEL = 26;
const BATAS_MASUK = 1400;
const AMBANG_DIAM = 0.0006;

interface Sel {
  readonly x: number;
  readonly y: number;
  readonly tunda: number;
}

@Component({
  selector: 'kelas-voxel-monogram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `<canvas #kanvas class="block h-full w-full" aria-hidden="true"></canvas>`,
})
export class VoxelMonogram {
  private readonly kanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('kanvas');
  readonly teks = input('XI');

  readonly matriks = input<readonly string[]>([]);

  readonly warna = input<string | undefined>(undefined);
  private readonly pegang = inject(DestroyRef);

  private rusak = false;
  private bingkai = 0;
  private bongkar?: () => void;
  private lepasUkuran?: () => void;
  private lepasTema?: () => void;
  private lepasTunjuk?: () => void;
  private lepasLihat?: () => void;

  private readonly pembongkaran = this.pegang.onDestroy(() => {
    this.rusak = true;
    this.bongkar?.();
  });

  constructor() {
    afterNextRender(() => {
      void this.siapkan();
    });
  }

  private susunSel(teks: string): readonly Sel[] {
    const baris = this.matriks();

    if (baris.length > 0) {
      return this.susunMatriks(baris);
    }

    const tengahX = (lebarTeks(teks) - 1) / 2;
    const tengahY = (TINGGI_GLYPH - 1) / 2;
    return titikTeks(teks).map((t) => ({
      x: t.kolom - tengahX,
      y: tengahY - t.baris,
      tunda: (t.kolom + t.baris) * JEDA_PIKSEL,
    }));
  }

  private susunMatriks(baris: readonly string[]): readonly Sel[] {
    const kolom = baris[0]?.length ?? 1;
    const tengahX = (kolom - 1) / 2;
    const tengahY = (baris.length - 1) / 2;
    const sel: Sel[] = [];

    baris.forEach((isi, r) => {
      [...isi].forEach((nilai, c) => {
        if (nilai !== '1') {
          return;
        }

        sel.push({
          x: c - tengahX,
          y: tengahY - r,
          tunda: (c + r) * JEDA_PIKSEL,
        });
      });
    });

    return sel;
  }

  private ukuranDunia(): { lebar: number; tinggi: number } {
    const baris = this.matriks();

    if (baris.length > 0) {
      return { lebar: baris[0]?.length ?? 1, tinggi: baris.length };
    }

    return { lebar: lebarTeks(this.teks()), tinggi: TINGGI_GLYPH };
  }

  private async siapkan(): Promise<void> {
    const kanvas = this.kanvas().nativeElement;
    const teks = this.teks();
    const sel = this.susunSel(teks);
    if (sel.length === 0) {
      return;
    }

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const awal = kanvas.getBoundingClientRect();
    if (awal.width < 2 || awal.height < 2) {
      const pengintai = new ResizeObserver(() => {
        const kini = kanvas.getBoundingClientRect();
        if (kini.width >= 2 && kini.height >= 2) {
          pengintai.disconnect();
          void this.siapkan();
        }
      });
      pengintai.observe(kanvas);
      this.pegang.onDestroy(() => pengintai.disconnect());
      return;
    }

    const THREE = await import('three');
    if (this.rusak) {
      return;
    }

    const renderer = new THREE.WebGLRenderer({ canvas: kanvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearAlpha(0);

    const geometri = new THREE.BoxGeometry(SISI, SISI, SISI);
    const bahan = new THREE.MeshStandardMaterial({
      roughness: 0.52,
      metalness: 0.06,
      flatShading: true,
    });
    const mesh = new THREE.InstancedMesh(geometri, bahan, sel.length * LAPIS);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;

    const semuaCahaya = new THREE.Scene();

    const cahayaDepan = new THREE.DirectionalLight(0xffffff, 2.15);
    cahayaDepan.position.set(2.4, 4.2, 6.5);

    const cahayaSisi = new THREE.DirectionalLight(0xffffff, 0.65);
    cahayaSisi.position.set(-5, -2, 3);

    const cahayaLangit = new THREE.HemisphereLight(0xffffff, 0x6a655d, 1.05);

    const sinarSorot = new THREE.PointLight(0xffa581, 0, 26, 2);
    sinarSorot.position.set(0, 0, 4);

    semuaCahaya.add(cahayaDepan, cahayaSisi, cahayaLangit, sinarSorot);

    const grup = new THREE.Group();
    grup.add(mesh);
    semuaCahaya.add(grup);

    const kisiLantai = new THREE.GridHelper(16, 16);
    kisiLantai.position.set(0, -((this.ukuranDunia().tinggi - 1) / 2) - 0.85, -0.4);

    const bahanKisi = kisiLantai.material as InstanceType<typeof THREE.LineBasicMaterial>;
    bahanKisi.transparent = true;
    bahanKisi.opacity = 0.22;

    semuaCahaya.add(kisiLantai);

    const kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    kamera.position.set(0, 0, 20);
    kamera.lookAt(0, 0, 0);

    const boneka = new THREE.Object3D();
    const warna = new THREE.Color();

    const pewarnaan = (): void => {
      const utama = this.warna();

      const dasar =
        utama === undefined
          ? [
              warnaToken('--color-teks-utama', '#1d1c1a'),
              warnaToken('--color-teks-kuat-sekunder', '#4a4844'),
              warnaToken('--color-garis-tegas', '#c9c5ba'),
            ]
          : [
              warnaToken(utama, '#1d1c1a'),
              warnaToken(utama, '#1d1c1a'),
              warnaToken('--color-garis-tegas', '#c9c5ba'),
            ];
      let i = 0;
      for (let s = 0; s < sel.length; s += 1) {
        for (let l = 0; l < LAPIS; l += 1) {
          warna.set(dasar[l] ?? '#c9c5ba');
          mesh.setColorAt(i, warna);
          i += 1;
        }
      }
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    };

    const ubahUkuran = (): void => {
      const kotak = kanvas.getBoundingClientRect();
      const lebar = Math.max(kotak.width, 1);
      const tinggi = Math.max(kotak.height, 1);
      renderer.setSize(lebar, tinggi, false);
      const rasio = lebar / tinggi;
      const tinggiDunia = Math.max(TINGGI_GLYPH + 3.4, (lebarTeks(teks) + 2.6) / rasio);
      const setengahTinggi = tinggiDunia / 2;
      const setengahLebar = setengahTinggi * rasio;
      kamera.left = -setengahLebar;
      kamera.right = setengahLebar;
      kamera.top = setengahTinggi;
      kamera.bottom = -setengahTinggi;
      kamera.updateProjectionMatrix();
    };

    const gambar = (berlalu: number, waktu: number): void => {
      let i = 0;

      for (let s = 0; s < sel.length; s += 1) {
        const titik = sel[s] as Sel;
        const t = Math.min(Math.max((berlalu - titik.tunda) / DURASI_SEL, 0), 1);
        const skala = t <= 0 ? 0.0001 : 1 - (1 - t) ** 3;
        const napas = Math.sin(waktu * 0.0012 + titik.x * 0.9 + titik.y * 0.7) * 0.055;

        for (let l = 0; l < LAPIS; l += 1) {
          boneka.position.set(
            titik.x + napas * 0.16,
            titik.y + napas * 0.1,
            -l * JARAK_LAPIS + napas * (0.6 - l * 0.15),
          );
          boneka.rotation.set(0, 0, 0);
          boneka.scale.setScalar(skala * (1 + napas * 0.05));
          boneka.updateMatrix();
          mesh.setMatrixAt(i, boneka.matrix);
          i += 1;
        }
      }

      mesh.instanceMatrix.needsUpdate = true;

      const sorot = (Math.sin(waktu * 0.0007) * 0.5 + 0.5) ** 2;
      sinarSorot.intensity = sorot * 26;
      sinarSorot.position.set(Math.sin(waktu * 0.0009) * 5, 2.4, 4.4);

      renderer.render(semuaCahaya, kamera);
    };

    this.bongkar = () => {
      if (this.bingkai) {
        cancelAnimationFrame(this.bingkai);
        this.bingkai = 0;
      }
      this.lepasUkuran?.();
      this.lepasTema?.();
      this.lepasTunjuk?.();
      this.lepasLihat?.();
      kisiLantai.geometry.dispose();
      bahanKisi.dispose();
      geometri.dispose();
      bahan.dispose();
      mesh.dispose();
      renderer.dispose();
    };

    ubahUkuran();
    pewarnaan();

    const pengamat = new ResizeObserver(() => {
      ubahUkuran();
      if (!this.bingkai) {
        gambar(BATAS_MASUK, 0);
      }
    });
    pengamat.observe(kanvas);
    this.lepasUkuran = () => pengamat.disconnect();

    this.lepasTema = pantauMedia('(prefers-color-scheme: dark)', () => {
      pewarnaan();
      if (!this.bingkai) {
        gambar(BATAS_MASUK, 0);
      }
    });

    if (!bolehBergerak()) {
      grup.rotation.set(SUDUT_X, SUDUT_Y, 0);
      gambar(BATAS_MASUK, 0);
      return;
    }

    let tunjukX = 0;
    let tunjukY = 0;
    const catatTunjuk = (e: PointerEvent): void => {
      tunjukX = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
      tunjukY = (e.clientY / Math.max(window.innerHeight, 1)) * 2 - 1;
    };
    window.addEventListener('pointermove', catatTunjuk, { passive: true });
    this.lepasTunjuk = () => window.removeEventListener('pointermove', catatTunjuk);

    let sudutY = SUDUT_Y;
    let sudutX = SUDUT_X;
    let tampak = true;
    let mulai = 0;
    let sudahMasuk = false;

    const putar = (waktu: number): void => {
      this.bingkai = requestAnimationFrame(putar);
      if (mulai === 0) {
        mulai = waktu;
      }
      if (!tampak) {
        return;
      }

      const berlalu = Math.min(waktu - mulai, BATAS_MASUK);
      const sasaranY = SUDUT_Y + tunjukX * GESER_TUNJUK + Math.sin(waktu * 0.00042) * AYUN_Y;
      const sasaranX = SUDUT_X - tunjukY * GESER_TUNJUK * 0.6 + Math.cos(waktu * 0.00035) * AYUN_X;
      const deltaY = sasaranY - sudutY;
      const deltaX = sasaranX - sudutX;
      const diam = Math.abs(deltaY) < AMBANG_DIAM && Math.abs(deltaX) < AMBANG_DIAM;

      if (diam && sudahMasuk) {
        return;
      }

      sudutY += deltaY * LERAP_TUNJUK;
      sudutX += deltaX * LERAP_TUNJUK;
      grup.rotation.set(sudutX, sudutY, 0);

      gambar(berlalu, waktu);

      if (berlalu >= BATAS_MASUK && diam) {
        sudahMasuk = true;
      }
    };

    const penglihat = new IntersectionObserver((catatan) => {
      tampak = catatan.some((c) => c.isIntersecting);
    });
    penglihat.observe(kanvas);
    this.lepasLihat = () => penglihat.disconnect();

    this.bingkai = requestAnimationFrame(putar);
  }
}