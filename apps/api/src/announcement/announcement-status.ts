import { ConflictException } from '@nestjs/common';
import type { AnnouncementStatus } from '@kelas/contracts';

export const ANNOUNCEMENT_TRANSITIONS: Record<AnnouncementStatus, readonly AnnouncementStatus[]> = {
  draft: ['published'],
  published: ['archived', 'draft'],
  archived: ['draft'],
};

export function canTransition(from: AnnouncementStatus, to: AnnouncementStatus): boolean {
  return ANNOUNCEMENT_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: AnnouncementStatus, to: AnnouncementStatus): void {
  if (!canTransition(from, to)) {
    throw new ConflictException({
      code: 'CONFLICT',
      message: `Pengumuman berstatus ${from} tidak dapat berpindah ke ${to}.`,
    });
  }
}