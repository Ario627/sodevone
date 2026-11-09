import { ANNOUNCEMENT_PIN_MAX, type AnnouncementStatus } from '@kelas/contracts';

const PINNED_STATUS: AnnouncementStatus = 'published';

export const PIN_NOT_PUBLISHED_MESSAGE =
  'Hanya pengumuman terbit yang dapat disematkan. Terbitkan dulu pengumuman ini.';

export const PIN_FULL_MESSAGE = `Maksimal ${ANNOUNCEMENT_PIN_MAX} pengumuman dapat disematkan. Lepas sematan yang lain dulu.`;

export const PIN_CONFLICT_MESSAGE = 'Pengumuman sudah dalam keadaan yang diminta.';

export function canPin(status: AnnouncementStatus): boolean {
  return status === PINNED_STATUS;
}

export function pinRoomLeft(pinnedCount: number, alreadyPinned: boolean): number {
  return alreadyPinned ? 1 : ANNOUNCEMENT_PIN_MAX - pinnedCount;
}

export function hasRoom(pinnedCount: number, alreadyPinned: boolean): boolean {
  return pinRoomLeft(pinnedCount, alreadyPinned) > 0;
}