import { DASAR_API, parameterDari, type Permintaan } from './dasar';
import {
  AnnouncementAdminDetailSchema,
  AnnouncementAdminPageSchema,
  type AnnouncementAdminDetail,
  type AnnouncementAdminListQuery,
  type AnnouncementAdminPage,
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