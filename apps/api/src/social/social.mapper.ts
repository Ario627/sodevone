import { SocialLinkAdmin, SocialImage, SocialLink, SocialPlatform } from '@kelas/contracts';
import { toIsoInstant, toIsoInstantOrNull } from '../common/text/instant.js';
import type { SocialAdminRow, SocialPublicRow } from './social.repository.js';

type ResolvedImage = SocialImage & { width: number; height: number };

function imageOf(row: SocialPublicRow): ResolvedImage | null {
  if (row.imageId !== null) {
    if (row.galleryWidth === null || row.galleryHeight === null) {
      return null;
    }

    return {
      id: row.imageId,
      url: null,
      width: row.galleryWidth,
      height: row.galleryHeight,
      altText: row.galleryAltText ?? row.altText,
    };
  }

  if (row.imageUrl === null || row.imageWidth === null || row.imageHeight === null) {
    return null;
  }

  return {
    id: null,
    url: row.imageUrl,
    width: row.imageWidth,
    height: row.imageHeight,
    altText: row.altText,
  };
}

export function toSocialLink(row: SocialPublicRow): SocialLink | null {
  const image = imageOf(row);

  if (image === null) {
    return null;
  }

  return {
    id: row.id,
    platform: row.platform as SocialPlatform,
    url: row.url,
    caption: row.caption,
    postedAt: toIsoInstantOrNull(row.postedAt),
    image,
  };
}

export function toSocialCollection(rows: SocialPublicRow[]): SocialLink[] {
  return rows.flatMap((row) => {
    const link = toSocialLink(row);

    return link === null ? [] : [link];
  });
}

export function toSocialAdmin(row: SocialAdminRow): SocialLinkAdmin {
  return {
    id: row.id,
    platform: row.platform as SocialPlatform,
    url: row.url,
    caption: row.caption,
    postedAt: toIsoInstantOrNull(row.postedAt),
    imageId: row.imageId,
    imageUrl: row.imageUrl,
    imageWidth: row.imageWidth,
    imageHeight: row.imageHeight,
    altText: row.altText,
    sortOrder: row.sortOrder,
    isVisible: row.isVisible,
    createdAt: toIsoInstant(row.createdAt),
    updatedAt: toIsoInstant(row.updatedAt),
  };
}