import {
  AlbumAdminDetailSchema,
  AlbumAdminPageSchema,
  ImageUploadResultSchema,
  type AlbumAdminDetail,
  type AlbumAdminListQuery,
  type AlbumAdminPage,
  type AlbumCreate,
  type AlbumUpdate,
  type ImageUploadResult,
} from '@kelas/contracts';
import { DASAR_API, parameterDari, type Permintaan } from './dasar';

const GALERI = `${DASAR_API}/admin/albums`;

const FIELD_UNGGAH = 'files';

export function bacaHalamanGaleri(nilai: unknown): AlbumAdminPage {
  return AlbumAdminPageSchema.parse(nilai);
}

export function bacaAlbumAdmin(nilai: unknown): AlbumAdminDetail {
  return AlbumAdminDetailSchema.parse(nilai);
}

export function bacaUnggahan(nilai: unknown): ImageUploadResult {
  return ImageUploadResultSchema.parse(nilai);
}

export function permintaanHalamanGaleri(query: AlbumAdminListQuery): Permintaan {
  return {
    url: GALERI,
    params: parameterDari({ page: query.page, perPage: query.perPage, status: query.status }),
  };
}

export function permintaanAlbumAdmin(id: string): Permintaan {
  return { url: `${GALERI}/${encodeURIComponent(id)}` };
}

export function alamatBuatAlbum(): string {
  return GALERI;
}

export function alamatAlbum(id: string): string {
  return `${GALERI}/${encodeURIComponent(id)}`;
}

export function alamatTerbitkanAlbum(id: string): string {
  return `${GALERI}/${encodeURIComponent(id)}/publish`;
}

export function alamatArsipAlbum(id: string): string {
  return `${GALERI}/${encodeURIComponent(id)}/archive`;
}

export function alamatPulihkanAlbum(id: string): string {
  return `${GALERI}/${encodeURIComponent(id)}/restore`;
}

export function alamatUnggahFoto(id: string): string {
  return `${GALERI}/${encodeURIComponent(id)}/images`;
}

export function alamatUrutFoto(id: string): string {
  return `${GALERI}/${encodeURIComponent(id)}/image-order`;
}

export function alamatFoto(id: string, imageId: string): string {
  return `${GALERI}/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}`;
}

export function alamatPratinjauFoto(id: string, imageId: string, ukuran: string): string {
  return `${GALERI}/${encodeURIComponent(id)}/images/${encodeURIComponent(imageId)}/media?ukuran=${ukuran}`;
}

export function berkasUnggahan(berkas: readonly File[]): FormData {
  const isi = new FormData();

  for (const satu of berkas) {
    isi.append(FIELD_UNGGAH, satu, satu.name);
  }

  return isi;
}

export type {
  AlbumAdminDetail,
  AlbumAdminPage,
  AlbumCreate,
  AlbumUpdate,
  ImageUploadResult,
};