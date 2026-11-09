import {
  EventAdminDetailSchema,
  EventAdminPageSchema,
  EventAdminSchema,
  type EventAdmin,
  type EventAdminDetail,
  type EventAdminListQuery,
  type EventAdminPage,
  type EventCreate,
  type EventUpdate,
} from '@kelas/contracts';
import { DASAR_API, parameterDari, type Permintaan } from './dasar';

const AGENDA = `${DASAR_API}/admin/events`;

export function bacaHalamanAgenda(nilai: unknown): EventAdminPage {
  return EventAdminPageSchema.parse(nilai);
}

export function bacaAgenda(nilai: unknown): EventAdmin {
  return EventAdminSchema.parse(nilai);
}

export function permintaanHalamanAgenda(query: EventAdminListQuery): Permintaan {
  return {
    url: AGENDA,
    params: parameterDari({ page: query.page, perPage: query.perPage, status: query.status }),
  };
}

export function bacaAgendaDetail(nilai: unknown): EventAdminDetail {
  return EventAdminDetailSchema.parse(nilai);
}

export function alamatFotoAgenda(id: string): string {
  return `${AGENDA}/${encodeURIComponent(id)}/images`;
}

export function permintaanAgenda(id: string): Permintaan {
  return { url: `${AGENDA}/${encodeURIComponent(id)}` };
}

export function alamatBuatAgenda(): string {
  return AGENDA;
}

export function alamatAgenda(id: string): string {
  return `${AGENDA}/${encodeURIComponent(id)}`;
}

export function alamatTerbitkanAgenda(id: string): string {
  return `${AGENDA}/${encodeURIComponent(id)}/publish`;
}

export function alamatArsipAgenda(id: string): string {
  return `${AGENDA}/${encodeURIComponent(id)}`;
}

export function alamatPulihkanAgenda(id: string): string {
  return `${AGENDA}/${encodeURIComponent(id)}/restore`;
}

export type { EventAdmin, EventAdminDetail, EventAdminPage, EventCreate, EventUpdate };