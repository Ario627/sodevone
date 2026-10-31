import {
  EventCollectionSchema,
  EventDetailSchema,
  type EventCollection,
  type EventDetail,
} from '@kelas/contracts';
import { DASAR_API, type Permintaan } from './dasar';

const AGENDA = `${DASAR_API}/public/events`;

export function bacaKoleksi(nilai: unknown): EventCollection {
  return EventCollectionSchema.parse(nilai);
}

export function bacaKegiatan(nilai: unknown): EventDetail {
  return EventDetailSchema.parse(nilai);
}

export function permintaanAgenda(): Permintaan {
  return { url: AGENDA };
}

export function permintaanKegiatan(slug: string): Permintaan {
  return { url: `${AGENDA}/${encodeURIComponent(slug)}` };
}