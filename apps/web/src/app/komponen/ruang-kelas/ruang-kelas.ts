import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { bolehBergerak, pantauMedia, skemaGelap, warnaToken } from '../../inti/gerak/media';
import {
  BARIS_KURSI,
  JUMLAH_SISWA,
  KOLOM_KURSI,
  SEMUA_ANGGOTA,
  SISWA_LIST,
  WALI_KELAS,
  WARNA_BAHAN,
  type Anggota,
} from '../../inti/kelas/anggota';

const JARAK_MEJA = 1.16;
const MEJA_LEBAR = 0.82;
const MEJA_TINGGI = 0.12;
const MEJA_DALAM = 0.58;
const MEJA_BADAN_TINGGI = 0.44;
const MEJA_BADAN_LEBAR = 0.72;
const MEJA_BADAN_DALAM = 0.5;

const BADAN_LEBAR = 0.32;
const BADAN_TINGGI = 0.32;
const BADAN_DALAM = 0.24;
const KEPALA_SISI = 0.24;
const DUDUK_BADAN_Y = 0.48;
const DUDUK_KEPALA_Y = 0.76;
const GESER_DUDUK = 0.58;

const WALI_BADAN_Y = 0.6;
const WALI_KEPALA_Y = 0.98;
const SKALA_WALI = 1.24;

const SISI_LANTAI = 9.2;
const TEBAL_LANTAI = 0.16;
const Z_MEJA_DEPAN = -((BARIS_KURSI - 1) / 2) * JARAK_MEJA;
const Z_WALI = Z_MEJA_DEPAN - 1.15;
const Z_MEJA_WALI = Z_WALI + 0.55;
const Z_PAPAN = Z_WALI - 0.3;
const Z_DINDING = Z_PAPAN - 0.18;
const TINGGI_DINDING = 1.6;

const AZIMUT = -0.72;
const ELEVASI = 0.94;
const AZIMUT_SEMPIT = -0.24;
const ELEVASI_SEMPIT = 1.02;
const AMBANG_SEMPIT = 0.95;
const JARAK_KAMERA = 18;
const PUSAT_Y = 0.85;
const AYUN_AZIMUT = 0.05;
const AYUN_ELEVASI = 0.022;
const LERAP_TUNJUK = 0.06;
const DURASI_MASUK = 420;
const JEDA_MASUK = 17;

const SERET_AZIMUT = 0.0062;
const SERET_ELEVASI = 0.0042;
const ELEVASI_MIN = 0.12;
const ELEVASI_MAKS = 1.32;
const AZIMUT_BEBAS = 1.5;
const AMBANG_KETUK = 10;
const ZOOM_FOKUS = 1.72;
const LERAP_FOKUS = 0.075;
const LERAP_ZOOM = 0.06;
const AYUN_KEPALA = 0.13;

@Component({
  selector: 'kelas-ruang-kelas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <canvas #kanvas class="block h-full w-full touch-manipulation" aria-hidden="true"></canvas>
    <span #label class="label" aria-hidden="true"></span>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
    }

    .label {
      position: absolute;
      inset-block-start: 0;
      inset-inline-start: 0;
      padding: 0.2rem 0.45rem;
      border: 1px solid var(--color-garis-tegas);
      background-color: var(--color-latar-halaman);
      font-family: var(--font-mono);
      font-size: 0.6875rem;
      letter-spacing: 0.08em;
      line-height: 1.4;
      text-transform: uppercase;
      white-space: nowrap;
      color: var(--color-teks-utama);
      opacity: 0;
      transform: translate3d(-999px, -999px, 0);
      transition: opacity 140ms var(--ease-keluar);
      pointer-events: none;
    }

    .label.tampil {
      opacity: 1;
    }
  `,
})
export class RuangKelas {
  readonly terpilih = input<string | null>(null);

  readonly pilih = output<Anggota>();

  private readonly kanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('kanvas');
  private readonly label = viewChild.required<ElementRef<HTMLElement>>('label');
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
    const kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 120);
    kamera.position.set(0, 0, JARAK_KAMERA);

    const buatBahan = (): InstanceType<typeof THREE.MeshLambertMaterial> =>
      new THREE.MeshLambertMaterial({ color: 0xffffff });

    const bahanMeja = buatBahan();
    const bahanAtas = buatBahan();
    const bahanLantai = buatBahan();
    const bahanDinding = buatBahan();
    const bahanPapan = buatBahan();
    const bahanTanda = buatBahan();
    const bahanTubuh = buatBahan();
    const bahanAksen = buatBahan();
    const bahanSorot = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });

    const garisLantai = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.85 });

    const cahayaAtas = new THREE.HemisphereLight(0xffffff, 0x5a5650, 1.9);
    const cahayaMiring = new THREE.DirectionalLight(0xffffff, 1.15);
    cahayaMiring.position.set(6, 10, 8);

    suasana.add(cahayaAtas, cahayaMiring);

    const separuh = (SISI_LANTAI - JARAK_MEJA) / 2;

    const lantai = new THREE.Mesh(
      new THREE.BoxGeometry(SISI_LANTAI, TEBAL_LANTAI, SISI_LANTAI),
      bahanLantai,
    );
    lantai.position.y = -TEBAL_LANTAI / 2;

    const titikGaris: number[] = [];
    for (let i = 0; i <= KOLOM_KURSI; i += 1) {
      const geser = -separuh + i * JARAK_MEJA;
      titikGaris.push(geser, 0.004, -separuh, geser, 0.004, separuh);
      titikGaris.push(-separuh, 0.004, geser, separuh, 0.004, geser);
    }
    const geometriGaris = new THREE.BufferGeometry();
    geometriGaris.setAttribute('position', new THREE.Float32BufferAttribute(titikGaris, 3));
    const kisi = new THREE.LineSegments(geometriGaris, garisLantai);

    const dinding = new THREE.Mesh(
      new THREE.BoxGeometry(SISI_LANTAI, TINGGI_DINDING, 0.14),
      bahanDinding,
    );
    dinding.position.set(0, TINGGI_DINDING / 2, Z_DINDING);

    const papan = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 0.06), bahanPapan);
    papan.position.set(-0.35, 1.0, Z_PAPAN);

    const goresan: InstanceType<typeof THREE.Mesh>[] = [];
    const barisPapan = [
      [-1.15, 1.24, 1.3],
      [-0.9, 1.04, 1.85],
      [-1.05, 0.84, 0.95],
    ] as const;

    for (let i = 0; i < barisPapan.length; i += 1) {
      const [x, y, lebar] = barisPapan[i] as readonly [number, number, number];
      const gores = new THREE.Mesh(
        new THREE.BoxGeometry(lebar, 0.06, 0.03),
        i === barisPapan.length - 1 ? bahanAksen : bahanTanda,
      );
      gores.position.set(x, y, Z_PAPAN + 0.05);
      goresan.push(gores);
    }

    const geometriMejaBadan = new THREE.BoxGeometry(
      MEJA_BADAN_LEBAR,
      MEJA_BADAN_TINGGI,
      MEJA_BADAN_DALAM,
    );
    const geometriMejaAtas = new THREE.BoxGeometry(MEJA_LEBAR, MEJA_TINGGI, MEJA_DALAM);

    const mejaBadan = new THREE.InstancedMesh(geometriMejaBadan, bahanMeja, JUMLAH_SISWA);
    const mejaAtas = new THREE.InstancedMesh(geometriMejaAtas, bahanAtas, JUMLAH_SISWA);
    mejaBadan.frustumCulled = false;
    mejaAtas.frustumCulled = false;

    const mejaWali = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.5, 0.55), bahanMeja);
    mejaWali.position.set(0.8, 0.25, Z_MEJA_WALI);

    const mesin = new THREE.Object3D();

    const posisi: { x: number; z: number }[] = SISWA_LIST.map((siswa) => ({
      x: (siswa.kursi.kolom - (KOLOM_KURSI - 1) / 2) * JARAK_MEJA,
      z: (siswa.kursi.baris - (BARIS_KURSI - 1) / 2) * JARAK_MEJA,
    }));

    posisi.push({ x: 0, z: Z_WALI });

    for (let i = 0; i < JUMLAH_SISWA; i += 1) {
      const { x, z } = posisi[i] as { x: number; z: number };
      mesin.position.set(x, MEJA_BADAN_TINGGI / 2, z);
      mesin.rotation.set(0, 0, 0);
      mesin.scale.setScalar(1);
      mesin.updateMatrix();
      mejaBadan.setMatrixAt(i, mesin.matrix);

      mesin.position.set(x, MEJA_BADAN_TINGGI + MEJA_TINGGI / 2, z);
      mesin.updateMatrix();
      mejaAtas.setMatrixAt(i, mesin.matrix);
    }
    mejaBadan.instanceMatrix.needsUpdate = true;
    mejaAtas.instanceMatrix.needsUpdate = true;

    const total = SEMUA_ANGGOTA.length;
    const geometriBadan = new THREE.BoxGeometry(BADAN_LEBAR, BADAN_TINGGI, BADAN_DALAM);
    const geometriKepala = new THREE.BoxGeometry(KEPALA_SISI, KEPALA_SISI, KEPALA_SISI);
    const badan = new THREE.InstancedMesh(geometriBadan, bahanTubuh, total);
    const kepala = new THREE.InstancedMesh(geometriKepala, bahanTubuh, total);
    badan.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    kepala.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    badan.frustumCulled = false;
    kepala.frustumCulled = false;

    const sorot = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.35, 4), bahanSorot);
    sorot.rotation.set(-Math.PI / 2, 0, Math.PI / 4);
    sorot.visible = false;

    const panggung = new THREE.Group();
    panggung.add(
      lantai,
      kisi,
      dinding,
      papan,
      mejaBadan,
      mejaAtas,
      mejaWali,
      badan,
      kepala,
      sorot,
      ...goresan,
    );
    suasana.add(panggung);

    const warna = new THREE.Color();
    const putih = new THREE.Color(0xffffff);

    let dasarAzimut = AZIMUT;
    let dasarElevasi = ELEVASI;

    const pewarnaan = (): void => {
      const gelap = skemaGelap();

      warna.set(warnaToken('--color-batu-700', '#4a4844'));
      bahanMeja.color.copy(warna);
      bahanAtas.color.copy(warna).lerp(putih, 0.52);
      bahanTanda.color.copy(warna).lerp(putih, 0.34);

      warna.set(warnaToken('--color-latar-sekunder', '#f2f0ea'));
      bahanLantai.color.copy(warna);
      bahanPapan.color.copy(warna).lerp(putih, gelap ? 0.52 : 0.9);

      if (gelap) {
        bahanDinding.color.set(warnaToken('--color-latar-sekunder', '#24242a')).lerp(putih, 0.16);
      } else {
        bahanDinding.color.set(warnaToken('--color-batu-300', '#c9c5ba'));
      }

      bahanAksen.color.set(warnaToken('--color-sinyal', '#a4441f')).lerp(putih, 0.15);
      bahanSorot.color.set(warnaToken('--color-sinyal', '#a4441f'));
      garisLantai.color
        .set(warnaToken('--color-garis-tegas', '#c9c5ba'))
        .lerp(putih, gelap ? 0.06 : 0.24);

      cahayaAtas.groundColor.set(warnaToken('--color-teks-utama', '#1d1c1a'));

      for (let i = 0; i < total; i += 1) {
        const anggota = SEMUA_ANGGOTA[i] as Anggota;
        const nama = WARNA_BAHAN[anggota.warna] ?? WARNA_BAHAN[0];
        warna.set(warnaToken(nama, '#4a4844'));
        badan.setColorAt(i, warna);
        warna.lerp(putih, 0.34);
        kepala.setColorAt(i, warna);
      }

      if (badan.instanceColor) {
        badan.instanceColor.needsUpdate = true;
      }
      if (kepala.instanceColor) {
        kepala.instanceColor.needsUpdate = true;
      }
    };

    const ubahUkuran = (): void => {
      const kotak = kanvas.getBoundingClientRect();
      const lebar = Math.max(kotak.width, 1);
      const tinggi = Math.max(kotak.height, 1);
      renderer.setSize(lebar, tinggi, false);

      const rasio = lebar / tinggi;
      const sempit = rasio < AMBANG_SEMPIT;

      dasarAzimut = sempit ? AZIMUT_SEMPIT : AZIMUT;
      dasarElevasi = sempit ? ELEVASI_SEMPIT : ELEVASI;

      kamera.position.setFromSphericalCoords(JARAK_KAMERA, dasarElevasi, dasarAzimut);
      kamera.position.y += PUSAT_Y;
      kamera.lookAt(0, PUSAT_Y, 0);
      kamera.updateMatrixWorld(true);

      let kiri = Infinity;
      let kanan = -Infinity;
      let bawah = Infinity;
      let atas = -Infinity;

      for (const x of [-SISI_LANTAI / 2, SISI_LANTAI / 2]) {
        for (const y of [0, TINGGI_DINDING]) {
          for (const z of [-SISI_LANTAI / 2, SISI_LANTAI / 2]) {
            const sudut = new THREE.Vector3(x, y, z).applyMatrix4(kamera.matrixWorldInverse);
            kiri = Math.min(kiri, sudut.x);
            kanan = Math.max(kanan, sudut.x);
            bawah = Math.min(bawah, sudut.y);
            atas = Math.max(atas, sudut.y);
          }
        }
      }

      let lebarDunia = (kanan - kiri) * 1.06;
      let tinggiDunia = (atas - bawah) * 1.06;

      if (lebarDunia / tinggiDunia < rasio) {
        lebarDunia = tinggiDunia * rasio;
      } else {
        tinggiDunia = lebarDunia / rasio;
      }

      const tengahX = (kiri + kanan) / 2;
      const tengahY = (atas + bawah) / 2 - tinggiDunia * (sempit ? 0.16 : 0.11);

      kamera.left = tengahX - lebarDunia / 2;
      kamera.right = tengahX + lebarDunia / 2;
      kamera.top = tengahY + tinggiDunia / 2;
      kamera.bottom = tengahY - tinggiDunia / 2;
      kamera.updateProjectionMatrix();
    };

    let sorotIndeks = -1;
    let kepalaY: number[] = Array.from({ length: total }, () => 0);

    const gambar = (berlalu: number, waktu: number): void => {
      kepalaY = Array.from({ length: total }, () => 0);

      for (let i = 0; i < total; i += 1) {
        const anggota = SEMUA_ANGGOTA[i] as Anggota;
        const { x, z } = posisi[i] as { x: number; z: number };
        const wali = anggota.id === WALI_KELAS.id;

        const tunda = i * JEDA_MASUK;
        const t = Math.min(Math.max((berlalu - tunda) / DURASI_MASUK, 0), 1);
        const masuk = t <= 0 ? 0.0001 : 1 - (1 - t) ** 3;

        const naik = i === sorotIndeks ? 0.1 : 0;
        const ayun = Math.sin(waktu * 0.0011 + i * 0.83) * 0.012;
        const angguk = Math.sin(waktu * 0.0013 + i * 0.61) * 0.02;

        const yBadan = (wali ? WALI_BADAN_Y : DUDUK_BADAN_Y) + ayun + naik;
        const yKepala = (wali ? WALI_KEPALA_Y : DUDUK_KEPALA_Y) + ayun + naik + angguk;
        const skala = masuk * (wali ? SKALA_WALI : 1);

        kepalaY[i] = yKepala + 0.18;

        mesin.position.set(x, yBadan, z + GESER_DUDUK);
        mesin.rotation.set(0, 0, 0);
        mesin.scale.setScalar(skala);
        mesin.updateMatrix();
        badan.setMatrixAt(i, mesin.matrix);

        mesin.position.set(x, yKepala, z + GESER_DUDUK);
        mesin.rotation.set(0, Math.sin(waktu * 0.0007 + i * 0.57) * AYUN_KEPALA, 0);
        mesin.scale.setScalar(skala);
        mesin.updateMatrix();
        kepala.setMatrixAt(i, mesin.matrix);
      }

      badan.instanceMatrix.needsUpdate = true;
      kepala.instanceMatrix.needsUpdate = true;
      renderer.render(suasana, kamera);
    };

    this.bongkar = () => {
      if (this.bingkai) {
        cancelAnimationFrame(this.bingkai);
        this.bingkai = 0;
      }
      pengamat.disconnect();
      penglihat.disconnect();
      this.lepasTema?.();
      this.lepasTunjuk?.();
      for (const bahan of [
        bahanMeja,
        bahanAtas,
        bahanLantai,
        bahanDinding,
        bahanPapan,
        bahanTanda,
        bahanAksen,
        bahanTubuh,
        bahanSorot,
        garisLantai,
      ]) {
        bahan.dispose();
      }
      for (const geometri of [
        lantai.geometry,
        geometriGaris,
        dinding.geometry,
        papan.geometry,
        geometriMejaBadan,
        geometriMejaAtas,
        mejaWali.geometry,
        geometriBadan,
        geometriKepala,
        sorot.geometry,
      ]) {
        geometri.dispose();
      }
      for (const gores of goresan) {
        gores.geometry.dispose();
      }
      mejaBadan.dispose();
      mejaAtas.dispose();
      badan.dispose();
      kepala.dispose();
      renderer.dispose();
    };

    ubahUkuran();
    pewarnaan();

    const pengamat = new ResizeObserver(() => {
      ubahUkuran();
      if (!this.bingkai) {
        gambar(DURASI_MASUK + JUMLAH_SISWA * JEDA_MASUK, 0);
      }
    });
    pengamat.observe(kanvas);

    this.lepasTema = pantauMedia('(prefers-color-scheme: dark)', () => {
      pewarnaan();
      if (!this.bingkai) {
        gambar(DURASI_MASUK + JUMLAH_SISWA * JEDA_MASUK, 0);
      }
    });

    const sinar = new THREE.Raycaster();
    const tikar = new THREE.Vector2();
    const label = this.label().nativeElement;

    const urai = (x: number, y: number): number => {
      const kotak = kanvas.getBoundingClientRect();
      tikar.set(
        ((x - kotak.left) / Math.max(kotak.width, 1)) * 2 - 1,
        -(((y - kotak.top) / Math.max(kotak.height, 1)) * 2 - 1),
      );
      sinar.setFromCamera(tikar, kamera);

      const kena = sinar.intersectObjects([badan, kepala], false);
      const pertama = kena[0];

      return pertama === undefined || pertama.instanceId === undefined
        ? -1
        : pertama.instanceId;
    };

    let tampak = true;
    let mulai = 0;
    let azimut = AZIMUT;
    let elevasi = ELEVASI;
    let azimutGeser = 0;
    let elevasiGeser = 0;
    let lihatX = 0;
    let lihatY = PUSAT_Y;
    let lihatZ = 0;
    let zoom = 1;
    let tunjuk = -1;
    let terpilihIndeks = -1;

    const bergerak = bolehBergerak();

    const sorotkan = (indeks: number): void => {
      sorotIndeks = indeks;

      if (indeks < 0) {
        sorot.visible = false;
        kanvas.style.cursor = '';
        return;
      }

      const { x, z } = posisi[indeks] as { x: number; z: number };
      sorot.position.set(x, 0.02, z + GESER_DUDUK);
      sorot.visible = true;
      kanvas.style.cursor = 'pointer';
    };

    const posisiLabel = (x: number, y: number, z: number): void => {
      const kotak = kanvas.getBoundingClientRect();
      const titik = new THREE.Vector3(x, y, z + GESER_DUDUK).project(kamera);

      if (titik.z > 1) {
        label.classList.remove('tampil');
        return;
      }

      const px = (titik.x * 0.5 + 0.5) * kotak.width;
      const py = (-titik.y * 0.5 + 0.5) * kotak.height;

      label.style.transform = `translate3d(${px.toFixed(1)}px, ${(py - 8).toFixed(1)}px, 0) translate(-50%, -100%)`;
      label.classList.add('tampil');
    };

    const sembunyiLabel = (): void => {
      label.classList.remove('tampil');
    };

    let seret = false;
    let seretX = 0;
    let seretY = 0;
    let jarakSeret = 0;
    let waktuSeret = 0;

    const turun = (e: PointerEvent): void => {
      seret = true;
      seretX = e.clientX;
      seretY = e.clientY;
      jarakSeret = 0;
      waktuSeret = performance.now();
      kanvas.setPointerCapture(e.pointerId);
      kanvas.style.cursor = 'grabbing';
    };

    const geser = (e: PointerEvent): void => {
      if (seret) {
        const dx = e.clientX - seretX;
        const dy = e.clientY - seretY;

        seretX = e.clientX;
        seretY = e.clientY;
        jarakSeret += Math.abs(dx) + Math.abs(dy);

        azimutGeser = Math.max(-AZIMUT_BEBAS, Math.min(AZIMUT_BEBAS, azimutGeser - dx * SERET_AZIMUT));
        elevasiGeser = Math.max(
          ELEVASI_MIN - dasarElevasi,
          Math.min(ELEVASI_MAKS - dasarElevasi, elevasiGeser + dy * SERET_ELEVASI),
        );

        if (jarakSeret > AMBANG_KETUK) {
          sembunyiLabel();
        }

        return;
      }

      if (!bergerak) {
        return;
      }

      const indeks = urai(e.clientX, e.clientY);
      tunjuk = indeks;
      sorotkan(indeks >= 0 ? indeks : terpilihIndeks);

      const anggota = indeks >= 0 ? SEMUA_ANGGOTA[indeks] : undefined;

      if (anggota !== undefined) {
        label.textContent = anggota.nama;
      }
    };

    const lepas = (e: PointerEvent): void => {
      if (!seret) {
        return;
      }

      seret = false;
      kanvas.style.cursor = '';

      if (kanvas.hasPointerCapture(e.pointerId)) {
        kanvas.releasePointerCapture(e.pointerId);
      }

      const ketukan = jarakSeret <= AMBANG_KETUK && performance.now() - waktuSeret < 700;

      if (!ketukan) {
        return;
      }

      const indeks = urai(e.clientX, e.clientY);
      const anggota = SEMUA_ANGGOTA[indeks];

      if (anggota !== undefined) {
        this.pilih.emit(anggota);
      }
    };

    const keluar = (): void => {
      tunjuk = -1;
      sorotkan(terpilihIndeks);

      if (terpilihIndeks < 0) {
        sembunyiLabel();
      }
    };

    kanvas.addEventListener('pointerdown', turun);
    kanvas.addEventListener('pointermove', geser, { passive: true });
    kanvas.addEventListener('pointerup', lepas);
    kanvas.addEventListener('pointercancel', lepas);
    kanvas.addEventListener('pointerleave', keluar, { passive: true });

    this.lepasTunjuk = () => {
      kanvas.removeEventListener('pointerdown', turun);
      kanvas.removeEventListener('pointermove', geser);
      kanvas.removeEventListener('pointerup', lepas);
      kanvas.removeEventListener('pointercancel', lepas);
      kanvas.removeEventListener('pointerleave', keluar);
      kanvas.style.cursor = '';
    };

    const putar = (waktu: number): void => {
      this.bingkai = requestAnimationFrame(putar);
      if (mulai === 0) {
        mulai = waktu;
      }
      if (!tampak) {
        return;
      }

      const berlalu = Math.min(waktu - mulai, DURASI_MASUK + total * JEDA_MASUK);

      const id = this.terpilih();
      const baru = id === null ? -1 : SEMUA_ANGGOTA.findIndex((a) => a.id === id);

      if (baru !== terpilihIndeks) {
        terpilihIndeks = baru;

        if (terpilihIndeks >= 0) {
          const anggota = SEMUA_ANGGOTA[terpilihIndeks] as Anggota;
          label.textContent = anggota.nama;
        } else if (tunjuk < 0) {
          sembunyiLabel();
        }
      }

      const fokus = terpilihIndeks >= 0 ? (posisi[terpilihIndeks] as { x: number; z: number }) : null;
      const kepalaFokus =
        terpilihIndeks >= 0
          ? SEMUA_ANGGOTA[terpilihIndeks]?.id === WALI_KELAS.id
            ? WALI_KEPALA_Y
            : DUDUK_KEPALA_Y
          : PUSAT_Y;

      const sasaranX = fokus === null ? 0 : fokus.x;
      const sasaranY = fokus === null ? PUSAT_Y : kepalaFokus + 0.1;
      const sasaranZ = fokus === null ? 0 : fokus.z + GESER_DUDUK;
      const sasaranZoom = fokus === null ? 1 : ZOOM_FOKUS;

      lihatX += (sasaranX - lihatX) * LERAP_FOKUS;
      lihatY += (sasaranY - lihatY) * LERAP_FOKUS;
      lihatZ += (sasaranZ - lihatZ) * LERAP_FOKUS;
      zoom += (sasaranZoom - zoom) * LERAP_ZOOM;

      if (bergerak && !seret) {
        const sasaranAzimut = dasarAzimut + azimutGeser + Math.sin(waktu * 0.00021) * AYUN_AZIMUT;
        const sasaranElevasi =
          dasarElevasi + elevasiGeser + Math.cos(waktu * 0.00017) * AYUN_ELEVASI;
        azimut += (sasaranAzimut - azimut) * LERAP_TUNJUK;
        elevasi += (sasaranElevasi - elevasi) * LERAP_TUNJUK;
      } else if (seret) {
        azimut += (dasarAzimut + azimutGeser - azimut) * 0.35;
        elevasi += (dasarElevasi + elevasiGeser - elevasi) * 0.35;
      }

      kamera.position.setFromSphericalCoords(JARAK_KAMERA, elevasi, azimut);
      kamera.position.y += lihatY;
      kamera.lookAt(lihatX, lihatY, lihatZ);

      if (Math.abs(kamera.zoom - zoom) > 0.0005) {
        kamera.zoom = zoom;
        kamera.updateProjectionMatrix();
      }

      gambar(berlalu, waktu);

      if (terpilihIndeks >= 0) {
        const simpul = posisi[terpilihIndeks] as { x: number; z: number };
        posisiLabel(simpul.x, kepalaY[terpilihIndeks] ?? DUDUK_KEPALA_Y, simpul.z);
      } else if (tunjuk >= 0) {
        const simpul = posisi[tunjuk] as { x: number; z: number };
        posisiLabel(simpul.x, kepalaY[tunjuk] ?? DUDUK_KEPALA_Y, simpul.z);
      } else {
        sembunyiLabel();
      }
    };

    const penglihat = new IntersectionObserver((catatan) => {
      tampak = catatan.some((c) => c.isIntersecting);
    });
    penglihat.observe(kanvas);

    kamera.position.setFromSphericalCoords(JARAK_KAMERA, elevasi, azimut);
    kamera.position.y += PUSAT_Y;
    kamera.lookAt(0, PUSAT_Y, 0);

    if (bergerak) {
      this.bingkai = requestAnimationFrame(putar);
    } else {
      gambar(DURASI_MASUK + total * JEDA_MASUK, 0);
      sorotkan(-1);
    }

    let tunjukX = 0;
    let tunjukY = 0;
    const catatTunjuk = (e: PointerEvent): void => {
      tunjukX = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
      tunjukY = (e.clientY / Math.max(window.innerHeight, 1)) * 2 - 1;
    };
    window.addEventListener('pointermove', catatTunjuk, { passive: true });

    this.pegang.onDestroy(() => {
      window.removeEventListener('pointermove', catatTunjuk);
    });

    void tunjukX;
    void tunjukY;
  }

  private bongkarAwal?: () => void;

  private lepasTema?: () => void;

  private lepasTunjuk?: () => void;
}
