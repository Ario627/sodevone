import { DASAR_API, parameterDari, type Permintaan } from './dasar';
import {
  AnnouncementAdminDetailSchema,
  AnnouncementAdminPageSchema,
  AnnouncementAttachmentSchema,
  type AnnouncementAdminDetail,
  type AnnouncementAdminListQuery,
  type AnnouncementAdminPage,
  type AnnouncementAttachment,
  type ImageVariant,
} from '@kelas/contracts';

const ADMIN = `${DASAR_API}/admin/announcements`;

export function bacaHalamanAdmin(nilai: unknown): AnnouncementAdminPage {
  return AnnouncementAdminPageSchema.parse(nilai);
}

export function bacaDetailAdmin(nilai: unknown): AnnouncementAdminDetail {
  return AnnouncementAdminDetailSchema.parse(nilai);
}

export function permintaanHalamanAdmin(query: AnnouncementAdminListQuery): Permintaan {
  return {
    url: ADMIN,
    params: parameterDari({
      page: query.page,
      perPage: query.perPage,
      status: query.status,
      kategori: query.kategori,
      q: query.q,
    }),
  };
}

export function permintaanDetailAdmin(id: string): Permintaan {
  return { url: `${ADMIN}/${encodeURIComponent(id)}` };
}

export function alamatPengumuman(id: string): string {
  return `${ADMIN}/${encodeURIComponent(id)}`;
}

export function alamatTerbit(id: string): string {
  return `${ADMIN}/${encodeURIComponent(id)}/publish`;
}

export function alamatArsip(id: string): string {
  return `${ADMIN}/${encodeURIComponent(id)}/archive`;
}

export function alamatBuat(): string {
  return ADMIN;
}

export function alamatSemat(id: string): string {
  return `${ADMIN}/${encodeURIComponent(id)}/pin`;
}

export function alamatLampiran(id: string): string {
  return `${ADMIN}/${encodeURIComponent(id)}/attachments`;
}

export function alamatLampiranSatu(id: string, lampiranId: string): string {
  return `${alamatLampiran(id)}/${encodeURIComponent(lampiranId)}`;
}

export function alamatUrutLampiran(id: string): string {
  return `${alamatLampiran(id)}/order`;
}

export function alamatPratinjauLampiran(id: string, lampiranId: string, ukuran: ImageVariant): string {
  return `${alamatLampiranSatu(id, lampiranId)}/media?ukuran=${ukuran}`;
}

export function bacaLampiran(nilai: unknown): AnnouncementAttachment[] {
  return AnnouncementAttachmentSchema.array().parse(nilai);
}

export function berkasLampiran(berkas: readonly File[]): FormData {
  const isi = new FormData();

  for (const satu of berkas) {
    isi.append('files', satu, satu.name);
  }

  return isi;
}

export function ukuranBerkas(byteSize: number): string {
  if (byteSize < 1024) {
    return `${byteSize} B`;
  }

  if (byteSize < 1024 * 1024) {
    return `${Math.round(byteSize / 1024)} KB`;
  }

  return `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
}