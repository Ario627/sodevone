import {
  AnnouncementDetailSchema,
  AnnouncementPageSchema,
  type AnnouncementDetail,
  type AnnouncementListQuery,
  type AnnouncementPage,
} from '@kelas/contracts';
import { DASAR_API, parameterDari, type Permintaan } from './dasar';

const PENGUMUMAN = `${DASAR_API}/public/announcements`;

export function bacaHalaman(nilai: unknown): AnnouncementPage {
  return AnnouncementPageSchema.parse(nilai);
}

export function bacaDetail(nilai: unknown): AnnouncementDetail {
  return AnnouncementDetailSchema.parse(nilai);
}

export function permintaanDetail(slug: string): Permintaan {
  return { url: `${PENGUMUMAN}/${encodeURIComponent(slug)}` };
}

export function permintaanDaftar(query: AnnouncementListQuery): Permintaan {
  return {
    url: PENGUMUMAN,
    params: parameterDari({
      page: query.page,
      perPage: query.perPage,
      kategori: query.kategori,
      q: query.q,
      arsip: query.arsip ? 'true' : undefined,
    }),
  };
}