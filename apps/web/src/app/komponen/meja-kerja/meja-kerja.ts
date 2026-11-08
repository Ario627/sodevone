import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, viewChild } from "@angular/core";
import { bolehBergerak, pantauMedia, skemaGelap, warnaToken } from "../../inti/gerak/media";

const MEJA_LEBAR = 3.1;
const MEJA_DALAM = 1.5;
const MEJA_TEBAL = 0.13;
const MEJA_TINGGI = 1.0;

const MONITOR_LEBAR = 1.5;
const MONITOR_TINGGI = 0.92;
const MONITOR_TEBAL = 0.07;
const MONITOR_Y = MEJA_TINGGI + 0.52;
const MONITOR_Z = -0.36;

const KIBOR_LEBAR = 1.16;
const KIBOR_DALAM = 0.4;
const KIBOR_Y = MEJA_TINGGI + MEJA_TEBAL / 2 + 0.022;
const KIBOR_Z = 0.36;

const MUG_R = 0.115;
const MUG_TINGGI = 0.26;
const MUG_X = 1.06;
const MUG_Z = 0.42;

const BUKU_LEBAR = 0.42;
const BUKU_DALAM = 0.3;
const BUKU_TEBAL = 0.055;
const BUKU_X = -1.06;

const KURSI_LEBAR = 0.66;
const KURSI_TINGGI = 0.82;
const KURSI_Z = 1.02;

const PUTAR_AWAL = -0.46;
const DONGAK_AWAL = 0.3;
const AYUN_Y = 0.13;
const AYUN_X = 0.035;
const LERAP = 0.06;
const JARAK_KAMERA = 7.4;
const PUSAT_Y = 1.06;
const SERET_PUTAR = 0.0058;
const SERET_BATAS = 0.85;
const KEDIP_MIN = 0.55;
const KEDIP_MAKS = 1.15;

const BARIS_LAYAR = [
  [0.62, 0.72],
  [0.36, 0.86],
  [0.54, 0.48],
  [0.24, 0.64],
  [0.7, 0.34],
] as const;

@Component({
  selector: 'kelas-meja-kerja',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `<canvas #kanvas class="kanvas" aria-hidden="true"></canvas>`,
  styles: `
    :host {
      display: block;
    }

    .kanvas {
      display: block;
      inline-size: 100%;
      block-size: 100%;
      touch-action: pan-y;
    }
  `,
})
export class MejaKerja {
  private readonly kanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('kanvas');
  private readonly pegang = inject(DestroyRef);

  private rusak = false;
  private bingkai = 0;
  private bongkar?: () => void;

  private readonly pembongkaran = this.pegang.onDestroy(() => {
    this.rusak = true;
    this.bongkar?.();
  });

  constructor() {
    afterNextRender(() => {
        void this.siapkan();
    })
  }


  private async siapkan(): Promise<void> {
    const kanvas  = this.kanvas().nativeElement;
    if(typeof ResizeObserver === 'undefined') {
        return  
    }

    const awal = kanvas.getBoundingClientRect();
    if(awal.width < 2 || awal.height < 2) {
        const pengintai =  new ResizeObserver(() => {
            const kini = kanvas.getBoundingClientRect();
            if(kini.width >= 2 && kini.height >= 2) {
                pengintai.disconnect();
                void this.siapkan();
            }
        })

        pengintai.observe(kanvas);
        this.pegang.onDestroy(() => pengintai.disconnect());
        return
    }

    const THREE = await import('three');
    if(this.rusak) {
        return;
    }


    const renderer = new THREE.WebGLRenderer({canvas: kanvas, antialias: true, alpha: true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearAlpha(0);


    const suasana = new THREE.Scene();
    const kamera = new THREE.PerspectiveCamera(30, 1.4, 0.4, 60);

    const kunci = new THREE.DirectionalLight(0xffffff, 2.3);
    kunci.position.set(3.2, 5.2, 4.4);

    const isi = new THREE.DirectionalLight(0xffffff, 0.8);
    isi.position.set(-3.4, 1.6, 2.2);

    const langit = new THREE.HemisphereLight(0xffffff, 0x5f5a53, 1.05);

    suasana.add(kunci, isi, langit);

    const buat = (): InstanceType<typeof THREE.MeshLambertMaterial> =>  new THREE.MeshLambertMaterial({color: 0xffffff});

    const bahanMeja = buat();
    const bahanKaki = buat();
    const bahanMonitor = buat();
    const bahanLayar = new THREE.MeshBasicMaterial({ toneMapped: false });
    const bahanKibor = buat();
    const bahanMug = buat();
    const bahanBuku = buat();
    const bahanKursi = buat();
    const bahanSinar = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.16 });
    const bahanLampu = buat();
    const bahanCahaya = new THREE.MeshBasicMaterial({
      color: 0xffe0b8,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
    });
    const bahanTanaman = buat();
    const bahanPot = buat();

    const grup = new THREE.Group();
    suasana.add(grup);

    const geometri: { dispose(): void }[] = [];

    const kotak = (w: number, t: number, d: number): InstanceType<typeof THREE.BoxGeometry> => {
      const g = new THREE.BoxGeometry(w, t, d);
      geometri.push(g);

      return g;
    };


    const daftar: InstanceType<typeof THREE.Mesh>[] = [];

    const taruh = (
        g: InstanceType<typeof THREE.BufferGeometry>,
        b: InstanceType<typeof THREE.Material>,
        x: number,
        y: number,
        z: number,
    ): InstanceType<typeof THREE.Mesh> => {
        const mesh = new THREE.Mesh(
            g as InstanceType<typeof THREE.BoxGeometry>,
            b as InstanceType<typeof THREE.MeshStandardMaterial>,
        );
        mesh.position.set(x, y, z);
        grup.add(mesh);
        daftar.push(mesh);

        return mesh;
    }

    taruh(kotak(MEJA_LEBAR, MEJA_TEBAL, MEJA_DALAM), bahanMeja, 0, MEJA_TINGGI, 0);

    for(const sisi of [-1, 1] as const) {
        taruh(
          kotak(0.09, MEJA_TINGGI, 0.09),
          bahanKaki,
          sisi * (MEJA_LEBAR / 2 - 0.16),
          MEJA_TINGGI / 2,
          -0.5,
        );
        taruh(
          kotak(0.09, MEJA_TINGGI, 0.09),
          bahanKaki,
          sisi * (MEJA_LEBAR / 2 - 0.16),
          MEJA_TINGGI / 2,
          0.5,
        );
    }

    taruh(
      kotak(MONITOR_LEBAR, MONITOR_TINGGI, MONITOR_TEBAL),
      bahanMonitor,
      0,
      MONITOR_Y,
      MONITOR_Z,
    );
    taruh(kotak(0.12, 0.34, 0.12), bahanMonitor, 0, MEJA_TINGGI + 0.17, MONITOR_Z + 0.04);
    taruh(kotak(0.52, 0.035, 0.22), bahanMonitor, 0, MEJA_TINGGI + 0.02, MONITOR_Z + 0.06);

    const layar = taruh(
      kotak(MONITOR_LEBAR - 0.14, MONITOR_TINGGI - 0.16, 0.012),
      bahanLayar,
      0,
      MONITOR_Y,
      MONITOR_Z + MONITOR_TEBAL / 2 + 0.008,
    );


    const barisLayar: InstanceType<typeof THREE.Mesh>[] = [];
    for(let i = 0; i < BARIS_LAYAR.length; i += 1) {
        const [lebar, geser] = BARIS_LAYAR[i] as readonly [number, number];
        const baris = taruh(
          kotak((MONITOR_LEBAR - 0.32) * lebar, 0.045, 0.008),
          bahanSinar,
          -(MONITOR_LEBAR - 0.32) / 2 + ((MONITOR_LEBAR - 0.32) * lebar) / 2,
          MONITOR_Y + MONITOR_TINGGI / 2 - 0.16 - i * 0.13,
          MONITOR_Z + MONITOR_TEBAL / 2 + 0.018,
        );
        baris.userData['geser'] = geser;
        barisLayar.push(baris);
    }
    taruh(kotak(KIBOR_LEBAR, 0.028, KIBOR_DALAM), bahanKibor, 0, KIBOR_Y, KIBOR_Z);

    const mugGeometri = new THREE.CylinderGeometry(MUG_R, MUG_R * 0.92, MUG_TINGGI, 18);
    geometri.push(mugGeometri);
    const mug = new THREE.Mesh(mugGeometri, bahanMug);
    mug.position.set(MUG_X, MEJA_TINGGI + MUG_TINGGI / 2, MUG_Z);
    grup.add(mug);
    daftar.push(mug);

    for (let i = 0; i < 3; i += 1) {
      taruh(
        kotak(BUKU_LEBAR - i * 0.02, BUKU_TEBAL, BUKU_DALAM),
        bahanBuku,
        BUKU_X + i * 0.012,
        MEJA_TINGGI + MEJA_TEBAL / 2 + BUKU_TEBAL / 2 + i * BUKU_TEBAL,
        -0.42 + i * 0.02,
      );
    }


    const kolomLampu = new THREE.CylinderGeometry(0.028, 0.032, 1.02, 10);
    geometri.push(kolomLampu);
    taruh(kolomLampu, bahanLampu, -1.34, MEJA_TINGGI + 0.51, -0.46);

    const dasarLampu = new THREE.CylinderGeometry(0.15, 0.17, 0.05, 14);
    geometri.push(dasarLampu);
    taruh(dasarLampu, bahanLampu, -1.34, MEJA_TINGGI + 0.025, -0.46);

    const kapLampu = new THREE.ConeGeometry(0.3, 0.28, 16, 1, true);
    geometri.push(kapLampu);
    const kap = taruh(kapLampu, bahanLampu, -1.34, MEJA_TINGGI + 1.06, -0.46);
    kap.rotation.x = Math.PI;

    const kerucut = new THREE.ConeGeometry(0.66, 1.3, 18, 1, true);
    geometri.push(kerucut);
    const cahayaLampu = taruh(kerucut, bahanCahaya, -1.34, MEJA_TINGGI + 0.42, -0.46);
    cahayaLampu.rotation.x = Math.PI;

    const sinarLampu = new THREE.PointLight(0xffd9ab, 6, 6, 2);
    sinarLampu.position.set(-1.34, MEJA_TINGGI + 0.92, -0.46);
    grup.add(sinarLampu);
    daftar.push(sinarLampu as unknown as InstanceType<typeof THREE.Mesh>);

    const pot = new THREE.CylinderGeometry(0.17, 0.13, 0.24, 14);
    geometri.push(pot);
    taruh(pot, bahanPot, 1.26, MEJA_TINGGI + 0.12, -0.5);

    for (let i = 0; i < 4; i += 1) {
      const daun = taruh(
        kotak(0.075, 0.34 + i * 0.05, 0.075),
        bahanTanaman,
        1.26 + Math.cos(i * 1.7) * 0.11,
        MEJA_TINGGI + 0.4 + i * 0.055,
        -0.5 + Math.sin(i * 1.7) * 0.1,
      );
      daun.rotation.set(Math.cos(i * 2.1) * 0.3, i * 0.7, Math.sin(i * 1.3) * 0.34);
    }

    taruh(kotak(KURSI_LEBAR, 0.09, KURSI_LEBAR), bahanKursi, 0, 0.42, KURSI_Z);
    taruh(
      kotak(KURSI_LEBAR, KURSI_TINGGI, 0.09),
      bahanKursi,
      0,
      0.42 + KURSI_TINGGI / 2,
      KURSI_Z + 0.3,
    );

    for (const sisi of [-1, 1] as const) {
      taruh(kotak(0.07, 0.42, 0.07), bahanKursi, sisi * 0.26, 0.21, KURSI_Z + 0.24);
    }


    const pewarnaan = (): void => {
        const gelap = skemaGelap();

        bahanMeja.color.set(warnaToken('--color-batu-300', '#c9c5ba'));
        bahanKaki.color.set(warnaToken('--color-batu-700', '#4a4844'));
        bahanMonitor.color.set(warnaToken('--color-batu-900', '#1d1c1a'));
        bahanKibor.color.copy(bahanMonitor.color);
        bahanKursi.color.set(warnaToken('--color-tinta-600', '#2c3e50'));
        bahanBuku.color.set(warnaToken('--color-hijau-600', '#2f6b46'));

        bahanMug.color.set(warnaToken('--color-sinyal-600', '#a4441f'));
        bahanLayar.color.set(warnaToken('--color-sinyal-600', '#a4441f'));
        bahanSinar.color.set(warnaToken('--color-sinyal-100', '#f7e7e0'));

        langit.groundColor.set(
          gelap
            ? warnaToken('--color-teks-utama', '#1d1c1a')
            : warnaToken('--color-batu-100', '#f2f0ea'),
        );
    }


    const ubahUkuran = (): void => {
        const r = kanvas.getBoundingClientRect();
        const lebar = Math.max(r.width, 1);
        const tinggi = Math.max(r.height, 1);

        renderer.setSize(lebar, tinggi, false);
        kamera.aspect = lebar / tinggi;

        const rasio = lebar / tinggi;
        const jarak = JARAK_KAMERA * (rasio < 1 ? 1.5 :  rasio < 1.4 ? 1.16 : 1);

        kamera.position.setFromCylindricalCoords(jarak, DONGAK_AWAL + 0.62, PUTAR_AWAL);
        kamera.position.y += PUSAT_Y;
        kamera.lookAt(0, PUSAT_Y - 0.22, 0);
        kamera.updateProjectionMatrix();

    }

    let putarY = PUTAR_AWAL
    let dongakX = DONGAK_AWAL;
    let geserPutar = 0;
    let geserDongak = 0;
    let tampak = true;

    const gambar = (waktu: number): void => {
        const gerak = bolehBergerak();

        if(gerak) {
            const sasaranY = PUTAR_AWAL + geserPutar + Math.sin(waktu * 0.00017) * AYUN_Y;
            const sasaranX = DONGAK_AWAL + geserDongak + Math.cos(waktu * 0.00014) * AYUN_X;

            putarY += (sasaranY - putarY) * LERAP;
            dongakX += (sasaranX - dongakX) * LERAP;

            grup.rotation.set(0, putarY, 0);

            const kedip = KEDIP_MIN + (Math.sin(waktu * 0.0021) * 0.5 + 0.5) * (KEDIP_MAKS - KEDIP_MIN);
            bahanSinar.opacity = 0.1 + kedip * 0.14;

            for (let i = 0; i < barisLayar.length; i += 1) {
                const baris = barisLayar[i] as InstanceType<typeof THREE.Mesh>;
                const geser = baris.userData['geser'] as number;

                baris.position.x = Math.sin(waktu * 0.0009 + i * 1.7) * 0.045 * geser;
                baris.scale.x = 0.82 + Math.sin(waktu * 0.0013 + i) * 0.16;
            }

            kamera.position.setFromSphericalCoords(
                JARAK_KAMERA * (kamera.aspect < 1 ? 1.5 : kamera.aspect < 1.4 ? 1.16 : 1),
                DONGAK_AWAL + 0.62 + (dongakX - DONGAK_AWAL) * 0.4,
                putarY,
            );
            kamera.position.y += PUSAT_Y;
            kamera.lookAt(0, PUSAT_Y - 0.22, 0);
        }

        layar.visible = true;
        renderer.render(suasana, kamera);
    }


    let seret = false;
    let seretX = 0;
    let seretY = 0;

    const turun = (e: PointerEvent): void => {
      seret = true;
      seretX = e.clientX;
      seretY = e.clientY;
      kanvas.setPointerCapture(e.pointerId);
    };

    const geser = (e: PointerEvent): void => {
        if(!seret) {
            return;
        }


        const dx = e.clientX - seretX;
        const dy = e.clientY - seretY;

        seretX = e.clientX;
        seretY = e.clientY;

        geserPutar = Math.max(-SERET_BATAS, Math.min(SERET_BATAS, geserPutar + dx * SERET_PUTAR));
        geserDongak = Math.max(-SERET_BATAS, Math.min(SERET_BATAS, geserDongak - dy * SERET_PUTAR));
    }

    const lepas = (e: PointerEvent): void => {
        seret = false;

        if(kanvas.hasPointerCapture(e.pointerId)) {
            kanvas.releasePointerCapture(e.pointerId);
        }
    }

    kanvas.addEventListener('pointerdown', turun);
    kanvas.addEventListener('pointermove', geser, { passive: true });
    kanvas.addEventListener('pointerup', lepas);
    kanvas.addEventListener('pointercancel', lepas);

    let kunciUkuran = '';

    const segarkan = (): void => {
        requestAnimationFrame(() => {
            const r = kanvas.getBoundingClientRect();
            const kunci = `${Math.round(r.width)}x${Math.round(r.height)}`;

            if(kunci === kunciUkuran) {
                return;
            }

            kunciUkuran = kunci;
            ubahUkuran();
            gambar(performance.now());
        })
    }

    const pengamat = new ResizeObserver(segarkan);
    pengamat.observe(kanvas);

    const penglihat = new IntersectionObserver((catatan) => {
        tampak = catatan.some((c) => c.isIntersecting);
    })

    penglihat.observe(kanvas);

    const lepasTema = pantauMedia('(prefers-color-scheme: dark)', () => {
        pewarnaan();
        gambar(performance.now());
    })

    this.bongkar = () => {
        if(this.bingkai) {
            cancelAnimationFrame(this.bingkai);
            this.bingkai = 0;
        }

        pengamat.disconnect();
        penglihat.disconnect();
        lepasTema();
        kanvas.removeEventListener('pointerdown', turun);
        kanvas.removeEventListener('pointermove', geser);
        kanvas.removeEventListener('pointerup', lepas);
        kanvas.removeEventListener('pointercancel', lepas);

        for(const b of [
            bahanMeja,
            bahanKaki,
            bahanMonitor,
            bahanLayar,
            bahanKibor,
            bahanMug,
            bahanBuku,
            bahanKursi,
            bahanSinar,
        ]) {
            b.dispose();
        }

        for(const g of geometri) {
            g.dispose();
        }

        renderer.dispose();
    }

    ubahUkuran();
    pewarnaan();

    const putar = (waktu: number): void => {
        this.bingkai = requestAnimationFrame(putar);

        if(!tampak) {
            return;
        }

        gambar(waktu);
    }

    kunciUkuran = `${Math.round(awal.width)}x${Math.round(awal.height)}`;

    if(bolehBergerak()) {
        this.bingkai = requestAnimationFrame(putar);
    } else {
        gambar(0);
    }


  }

}