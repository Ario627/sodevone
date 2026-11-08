import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { bolehBergerak, pantauMedia, skemaGelap, warnaToken } from '../../inti/gerak/media';
import { AngkaPiksel } from '../angka-piksel/angka-piksel';

const GRAVITASI = 15.4;
const RADIUS_BOLA = 0.15;
const ASAL = { x: -2.05, y: 0.46, z: 0.45 };
const BIN_X = 1.86;
const BIN_Z = 0.5;
const BIN_RADIUS = 0.4;
const BIN_TINGGI = 0.74;
const BIN_MULUT = BIN_TINGGI;
const LANTAI_Y = 0;
const SKALA_LEMPAR = 0.024;
const KECEPATAN_MIN = 4;
const KECEPATAN_MAKS = 14;
const DURASI_PULIH = 780;

interface Langkah {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

@Component({
  selector: 'kelas-arena-kertas',
  imports: [AngkaPiksel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div #bingkai class="bingkai">
      <canvas #kanvas class="kanvas" aria-hidden="true"></canvas>

      <div class="papan" aria-hidden="true">
        <span class="teks-meta angka-papan">
          <kelas-angka-piksel [teks]="skorTeks()" [tinggi]="16" />
        </span>
        <span class="teks-meta pisah"></span>
        <span class="teks-meta sisa">{{ percobaan() }} lemparan</span>
      </div>

      <p class="petunjuk teks-meta">{{ petunjuk() }}</p>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .bingkai {
      position: relative;
      aspect-ratio: 16 / 11;
      overflow: hidden;
      border: 1px solid var(--color-garis-halus);
      background-color: var(--color-latar-sekunder);
    }

    .kanvas {
      display: block;
      block-size: 100%;
      inline-size: 100%;
      touch-action: none;
      cursor: grab;
    }

    .kanvas.lempar {
      cursor: crosshair;
    }

    .papan {
      position: absolute;
      inset-block-start: 0.85rem;
      inset-inline-start: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      color: var(--color-teks-kuat-sekunder);
      pointer-events: none;
    }

    .angka-papan {
      color: var(--color-sinyal);
    }

    .pisah {
      inline-size: 1px;
      block-size: 0.8rem;
      background-color: var(--color-garis-tegas);
    }

    .sisa {
      color: var(--color-teks-sekunder);
      font-size: 0.625rem;
    }

    .petunjuk {
      position: absolute;
      inset-block-end: 0.8rem;
      inset-inline-end: 0.9rem;
      max-inline-size: 22ch;
      text-align: end;
      font-size: 0.625rem;
      line-height: 1.5;
      color: var(--color-teks-sekunder);
      pointer-events: none;
    }

    @media (max-width: 40rem) {
      .bingkai {
        aspect-ratio: 4 / 3;
      }

      .petunjuk {
        display: none;
      }
    }
  `,
})
export class ArenaKertas {
  private readonly kanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('kanvas');
  private readonly pegang = inject(DestroyRef);

  protected readonly skor = signal(0);
  protected readonly percobaan = signal(0);
  protected readonly petunjuk = signal('Tarik dari bola kertas, lepas untuk melempar');

  protected readonly skorTeks = () => String(this.skor()).padStart(2, '0');

  private rusak = false;
  private bingkaiAnimasi = 0;
  private bongkar?: () => void;

  private readonly pembongkaran = this.pegang.onDestroy(() => {
    this.rusak = true;
    this.bongkar?.();
  });

  constructor() {
    afterNextRender(() => {
      void this.siapkan();
    });
  }

  private async siapkan(): Promise<void> {
    const kanvas = this.kanvas().nativeElement;

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

    const suasana = new THREE.Scene();
    const kamera = new THREE.PerspectiveCamera(38, 1.5, 0.4, 40);
    kamera.position.set(-0.35, 2.15, 5.9);
    kamera.lookAt(-0.1, 0.72, 0);

    const kunci = new THREE.DirectionalLight(0xffffff, 2.4);
    kunci.position.set(2.4, 5.6, 4.4);

    const isi = new THREE.DirectionalLight(0xffffff, 0.7);
    isi.position.set(-4, 2, 2);

    const langit = new THREE.HemisphereLight(0xffffff, 0x55504a, 1.1);

    suasana.add(kunci, isi, langit);

    const buat = (): InstanceType<typeof THREE.MeshLambertMaterial> =>
      new THREE.MeshLambertMaterial({ color: 0xffffff });

    const bahanLantai = buat();
    const bahanBin = buat();
    const bahanBibir = buat();
    const bahanKertas = buat();
    const bahanBayang = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.14 });
    const bahanPandu = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.7 });
    const bahanKilau = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5 });

    const lantai = new THREE.Mesh(new THREE.PlaneGeometry(20, 16), bahanLantai);
    lantai.rotation.x = -Math.PI / 2;
    lantai.position.y = LANTAI_Y;
    suasana.add(lantai);

    const kisi = new THREE.GridHelper(16, 16);
    kisi.position.y = 0.002;

    const bahanKisi = kisi.material as InstanceType<typeof THREE.LineBasicMaterial>;
    bahanKisi.transparent = true;
    bahanKisi.opacity = 0.26;
    suasana.add(kisi);

    const bayangBola = new THREE.Mesh(new THREE.CircleGeometry(0.2, 22), bahanBayang);
    bayangBola.rotation.x = -Math.PI / 2;
    suasana.add(bayangBola);

    const tabung = new THREE.Mesh(
      new THREE.CylinderGeometry(BIN_RADIUS, BIN_RADIUS * 0.82, BIN_TINGGI, 20, 1, true),
      bahanBin,
    );
    tabung.position.set(BIN_X, BIN_TINGGI / 2, BIN_Z);
    suasana.add(tabung);

    const bibir = new THREE.Mesh(new THREE.TorusGeometry(BIN_RADIUS, 0.032, 8, 26), bahanBibir);
    bibir.rotation.x = Math.PI / 2;
    bibir.position.set(BIN_X, BIN_TINGGI, BIN_Z);
    suasana.add(bibir);

    const mulut = new THREE.Mesh(new THREE.CircleGeometry(BIN_RADIUS * 0.94, 22), bahanBayang);
    mulut.rotation.x = -Math.PI / 2;
    mulut.position.set(BIN_X, BIN_TINGGI - 0.02, BIN_Z);
    suasana.add(mulut);

    const bola = new THREE.Mesh(new THREE.IcosahedronGeometry(RADIUS_BOLA, 1), bahanKertas);
    bola.position.set(ASAL.x, ASAL.y, ASAL.z);
    suasana.add(bola);

    const kilau = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.016, 6, 28), bahanKilau);
    kilau.rotation.x = -Math.PI / 2;
    kilau.position.set(BIN_X, BIN_TINGGI, BIN_Z);
    kilau.visible = false;
    suasana.add(kilau);

    const geometriPandu = new THREE.BufferGeometry();
    geometriPandu.setAttribute('position', new THREE.Float32BufferAttribute([], 3));

    const garisPandu = new THREE.Line(geometriPandu, bahanPandu);
    garisPandu.visible = false;
    suasana.add(garisPandu);

    const pewarnaan = (): void => {
      const gelap = skemaGelap();

      bahanLantai.color.set(
        gelap
          ? warnaToken('--color-latar-sekunder', '#24242a')
          : warnaToken('--color-batu-100', '#f2f0ea'),
      );
      bahanBin.color.set(warnaToken('--color-tinta-600', '#2c3e50'));
      bahanBibir.color.set(warnaToken('--color-batu-700', '#4a4844'));
      bahanKertas.color.set(warnaToken('--color-batu-50', '#faf9f6'));
      bahanKisi.color.set(warnaToken('--color-garis-tegas', '#c9c5ba'));
      bahanBayang.color.set(warnaToken('--color-teks-utama', '#1d1c1a'));
      bahanKilau.color.set(warnaToken('--color-sinyal', '#a4441f'));
      bahanPandu.color.set(warnaToken('--color-sinyal', '#a4441f'));
      langit.groundColor.set(warnaToken('--color-teks-utama', '#1d1c1a'));
    };

    const ubahUkuran = (): void => {
      const kotak = kanvas.getBoundingClientRect();
      const lebar = Math.max(kotak.width, 1);
      const tinggi = Math.max(kotak.height, 1);

      renderer.setSize(lebar, tinggi, false);
      kamera.aspect = lebar / tinggi;

      const sempit = lebar / tinggi < 1.25;
      kamera.position.set(-0.35, sempit ? 2.9 : 2.15, sempit ? 7.9 : 5.9);
      kamera.lookAt(-0.1, sempit ? 0.6 : 0.72, 0);
      kamera.updateProjectionMatrix();
    };

    const posisi = { x: ASAL.x, y: ASAL.y, z: ASAL.z };
    const kecepatan = { x: 0, y: 0, z: 0 };
    let terbang = false;
    let menunggu = 0;
    let putaran = 0;
    let seret = false;
    let sasaran = { x: 0, y: 0 };
    let mulaiSeret = { x: 0, y: 0 };

    const pulihkan = (): void => {
      posisi.x = ASAL.x;
      posisi.y = ASAL.y;
      posisi.z = ASAL.z;
      kecepatan.x = 0;
      kecepatan.y = 0;
      kecepatan.z = 0;
      terbang = false;
      menunggu = 0;
      bola.scale.setScalar(1);
      garisPandu.visible = false;
      kilau.visible = false;
      kanvas.classList.remove('lempar');
    };

    const simulasi = (vx: number, vy: number): Langkah[] => {
      const hasil: Langkah[] = [];
      let x = ASAL.x;
      let y = ASAL.y;
      let z = ASAL.z;
      let sx = vx;
      let sy = vy;
      const langkah = 1 / 60;

      for (let i = 0; i < 90; i += 1) {
        sy -= GRAVITASI * langkah;
        x += sx * langkah;
        y += sy * langkah;

        if (i % 2 === 0) {
          hasil.push({ x, y, z });
        }

        if (y < RADIUS_BOLA || x > 6) {
          break;
        }
      }

      return hasil;
    };

    const arah = (dx: number, dy: number): { x: number; y: number } => {
      const panjang = Math.hypot(dx, dy);

      if (panjang < 1) {
        return { x: 0, y: 0 };
      }

      const daya = Math.min(Math.max(panjang * SKALA_LEMPAR, KECEPATAN_MIN), KECEPATAN_MAKS);

      return { x: (dx / panjang) * daya, y: (-dy / panjang) * daya };
    };

    const gambarPandu = (): void => {
      const dx = sasaran.x - mulaiSeret.x;
      const dy = sasaran.y - mulaiSeret.y;

      if (Math.abs(dx) + Math.abs(dy) < 12) {
        garisPandu.visible = false;
        return;
      }

      const v = arah(dx, dy);
      const titik: number[] = [];

      for (const t of simulasi(v.x, v.y)) {
        titik.push(t.x, t.y, t.z);
      }

      geometriPandu.setAttribute('position', new THREE.Float32BufferAttribute(titik, 3));
      garisPandu.visible = titik.length > 0;
    };

    const sentuh = (e: PointerEvent): void => {
      if (terbang || menunggu > 0) {
        return;
      }

      seret = true;
      kanvas.setPointerCapture(e.pointerId);
      kanvas.classList.add('lempar');

      const kotak = kanvas.getBoundingClientRect();

      mulaiSeret = { x: e.clientX - kotak.left, y: e.clientY - kotak.top };
      sasaran = { ...mulaiSeret };
      this.petunjuk.set('Lepas untuk melempar');
    };

    const geser = (e: PointerEvent): void => {
      if (!seret) {
        return;
      }

      const kotak = kanvas.getBoundingClientRect();

      sasaran = { x: e.clientX - kotak.left, y: e.clientY - kotak.top };
      gambarPandu();
    };

    const lepas = (e: PointerEvent): void => {
      if (!seret) {
        return;
      }

      seret = false;

      if (kanvas.hasPointerCapture(e.pointerId)) {
        kanvas.releasePointerCapture(e.pointerId);
      }

      kanvas.classList.remove('lempar');
      garisPandu.visible = false;

      const dx = sasaran.x - mulaiSeret.x;
      const dy = sasaran.y - mulaiSeret.y;
      const panjang = Math.hypot(dx, dy);

      if (panjang < 14) {
        this.petunjuk.set('Tarik lebih jauh untuk melempar');
        return;
      }

      const v = arah(dx, dy);

      kecepatan.x = v.x;
      kecepatan.y = v.y;
      kecepatan.z = 0;

      terbang = true;
      this.percobaan.update((n) => n + 1);
      this.petunjuk.set('Tarik dari bola kertas, lepas untuk melempar');
    };

    kanvas.addEventListener('pointerdown', sentuh);
    kanvas.addEventListener('pointermove', geser, { passive: true });
    kanvas.addEventListener('pointerup', lepas);
    kanvas.addEventListener('pointercancel', lepas);

    let tampak = true;

    const penglihat = new IntersectionObserver((catatan) => {
      tampak = catatan.some((c) => c.isIntersecting);
    });
    penglihat.observe(kanvas);

    let kunciUkuran = '';

    const segarkan = (): void => {
      requestAnimationFrame(() => {
        const kotak = kanvas.getBoundingClientRect();
        const kunci = `${Math.round(kotak.width)}x${Math.round(kotak.height)}`;

        if (kunci === kunciUkuran) {
          return;
        }

        kunciUkuran = kunci;
        ubahUkuran();
      });
    };

    const pengamat = new ResizeObserver(segarkan);
    pengamat.observe(kanvas);

    const lepasTema = pantauMedia('(prefers-color-scheme: dark)', pewarnaan);

    let waktuLalu = 0;

    const putar = (waktu: number): void => {
      this.bingkaiAnimasi = requestAnimationFrame(putar);

      if (!tampak) {
        return;
      }

      const dt = waktuLalu === 0 ? 0.016 : Math.min((waktu - waktuLalu) / 1000, 0.05);

      waktuLalu = waktu;

      if (terbang) {
        kecepatan.y -= GRAVITASI * dt;
        posisi.x += kecepatan.x * dt;
        posisi.y += kecepatan.y * dt;
        posisi.z += kecepatan.z * dt;

        putaran += (Math.abs(kecepatan.x) + Math.abs(kecepatan.y)) * dt * 3.4;

        const masuk =
          kecepatan.y < 0 &&
          posisi.y <= BIN_MULUT + 0.06 &&
          posisi.y >= BIN_MULUT - 0.34 &&
          Math.hypot(posisi.x - BIN_X, posisi.z - BIN_Z) < BIN_RADIUS * 0.78;

        if (masuk) {
          this.skor.update((n) => n + 1);
          this.petunjuk.set('Masuk. Lempar lagi.');
          kilau.visible = true;
          terbang = false;
          menunggu = DURASI_PULIH;
          posisi.y = BIN_MULUT - 0.1;
          bola.scale.setScalar(0.55);
        } else if (posisi.y <= RADIUS_BOLA) {
          posisi.y = RADIUS_BOLA;
          this.petunjuk.set('Meleset. Coba lagi.');
          terbang = false;
          menunggu = DURASI_PULIH;
        }
      } else if (menunggu > 0) {
        menunggu -= dt * 1000;

        if (menunggu <= 0) {
          pulihkan();
        }
      }

      if (kilau.visible) {
        kilau.scale.setScalar(1 + (1 - Math.max(menunggu, 0) / DURASI_PULIH) * 1.6);
        bahanKilau.opacity = (Math.max(menunggu, 0) / DURASI_PULIH) * 0.6;
      }

      bola.position.set(posisi.x, posisi.y, posisi.z);
      bola.rotation.set(putaran, putaran * 0.7, 0);

      bayangBola.position.set(posisi.x, 0.004, posisi.z);
      bayangBola.scale.setScalar(Math.max(0.35, 1 - posisi.y * 0.28));

      if (bolehBergerak() && !terbang && menunggu <= 0) {
        bola.position.y = ASAL.y + Math.sin(waktu * 0.0021) * 0.028;
        bola.rotation.y += 0.004;
      }

      renderer.render(suasana, kamera);
    };

    ubahUkuran();
    pewarnaan();

    kunciUkuran = `${Math.round(awal.width)}x${Math.round(awal.height)}`;

    this.bongkar = () => {
      if (this.bingkaiAnimasi) {
        cancelAnimationFrame(this.bingkaiAnimasi);
        this.bingkaiAnimasi = 0;
      }

      pengamat.disconnect();
      penglihat.disconnect();
      lepasTema();
      kanvas.removeEventListener('pointerdown', sentuh);
      kanvas.removeEventListener('pointermove', geser);
      kanvas.removeEventListener('pointerup', lepas);
      kanvas.removeEventListener('pointercancel', lepas);

      for (const b of [
        bahanLantai,
        bahanBin,
        bahanBibir,
        bahanKertas,
        bahanBayang,
        bahanPandu,
        bahanKilau,
        bahanKisi,
      ]) {
        b.dispose();
      }

      for (const g of [
        lantai.geometry,
        kisi.geometry,
        bayangBola.geometry,
        tabung.geometry,
        bibir.geometry,
        mulut.geometry,
        bola.geometry,
        kilau.geometry,
        geometriPandu,
      ]) {
        g.dispose();
      }

      renderer.dispose();
    };

    this.bingkaiAnimasi = requestAnimationFrame(putar);
  }
}