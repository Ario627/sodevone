import { ConflictException } from '@nestjs/common';
import type { EventStatus } from '@kelas/contracts';

export const EVENT_TRANSITIONS: Record<EventStatus, readonly EventStatus[]> = {
  draft: ['published'],
  published: ['archived'],
  archived: ['draft'],
};

export function canTransitionEvent(from: EventStatus, to: EventStatus): boolean {
  return EVENT_TRANSITIONS[from].includes(to);
}

export function assertEventTransition(from: EventStatus, to: EventStatus): void {
  if (!canTransitionEvent(from, to)) {
    throw new ConflictException({
      code: 'CONFLICT',
      message: `Kegiatan berstatus ${from} tidak dapat berpindah ke ${to}.`,
    });
  }
}