import { Injectable } from '@nestjs/common';
import type {
  EventCollection,
  EventDetail,
  EventSummary,
  PublishedState,
} from '@kelas/contracts';
import { toIsoInstant, toIsoInstantOrNull } from '../common/text/instant.js';
import { EventRepository } from './event.repository.js';
import type { EventPublicRow } from './event.repository.js';

const AGENDA_LIMIT = 20;

export type EventLookup =
  | { kind: 'found'; detail: EventDetail }
  | { kind: 'moved'; slug: string; detail: EventDetail }
  | { kind: 'missing' };

function publicStateOf(status: string): PublishedState {
  return status === 'archived' ? 'archived' : 'published';
}

function toSummary(row: EventPublicRow): EventSummary {
  return {
    slug: row.slug,
    title: row.title,
    startsAt: toIsoInstant(row.startsAt),
    endsAt: toIsoInstantOrNull(row.endsAt),
    location: row.location,
    state: publicStateOf(row.status),
  };
}

function toDetail(row: EventPublicRow): EventDetail {
  return { ...toSummary(row), description: row.description };
}

@Injectable()
export class EventService {
  constructor(private readonly repository: EventRepository) {}

  async collection(): Promise<EventCollection> {
    const now = new Date().toISOString();

    const [upcoming, past] = await Promise.all([
      this.repository.findUpcoming(now, AGENDA_LIMIT),
      this.repository.findPast(now, AGENDA_LIMIT),
    ]);

    return { upcoming: upcoming.map(toSummary), past: past.map(toSummary) };
  }

  async detail(slug: string): Promise<EventLookup> {
    const row = await this.repository.findVisibleBySlug(slug);

    if (row !== undefined) {
      return { kind: 'found', detail: toDetail(row) };
    }

    const redirectId = await this.repository.findRedirectTargetId(slug);

    if (redirectId === undefined) {
      return { kind: 'missing' };
    }

    const moved = await this.repository.findVisibleById(redirectId);

    return moved === undefined
      ? { kind: 'missing' }
      : { kind: 'moved', slug: moved.slug, detail: toDetail(moved) };
  }
}