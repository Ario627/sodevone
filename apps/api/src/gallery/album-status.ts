import type { AlbumStatus } from '@kelas/contracts';
import { ConflictException } from '@nestjs/common';

export const ALBUM_TRANSITIONS: Record<AlbumStatus, readonly AlbumStatus[]> = {
  draft: ['published'],
  published: ['archived'],
  archived: ['draft'],
};

export function canTransitionAlbum(from: AlbumStatus, to: AlbumStatus): boolean {
  return ALBUM_TRANSITIONS[from].includes(to);
}

export function assertAlbumTransition(from: AlbumStatus, to: AlbumStatus): void {
  if (!canTransitionAlbum(from, to)) {
    throw new ConflictException({
      code: 'CONFLICT',
      message: `Album berstatus ${from} tidak dapat berpindah ke ${to}.`,
    });
  }
}