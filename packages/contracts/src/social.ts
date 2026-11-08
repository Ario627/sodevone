import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './common.js';
import { hasControlCharacter } from './query.js';

export const SOCIAL_PLATFORMS = ['instagram', 'tiktok'] as const;

export const SOCIAL_LINK_LIMIT = 8;

export const SOCIAL_LINK_MAX_LIMIT = 24;

export const SOCIAL_CAPTION_MAX_LENGTH = 280;

export const SOCIAL_IMAGE_MAX_DIMENSION = 6000;

export const SocialPlatformSchema = z.enum(SOCIAL_PLATFORMS);

export type SocialPlatform = z.infer<typeof SocialPlatformSchema>;

export const HTTPS_URL_SCHEMA = z.url({ protocol: /^https$/ });

export const SocialCaptionSchema = z
  .string()
  .trim()
  .min(1)
  .max(SOCIAL_CAPTION_MAX_LENGTH)
  .refine((value) => !hasControlCharacter(value), 'Keterangan memuat karakter yang tidak diizinkan');

export const SocialAltTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .refine((value) => !hasControlCharacter(value), 'Teks alternatif memuat karakter yang tidak diizinkan');

export const SocialPlatformUrlSchema = z.strictObject({
  platform: SocialPlatformSchema,
  url: HTTPS_URL_SCHEMA,
});

export type SocialPlatformUrl = z.infer<typeof SocialPlatformUrlSchema>;

export const SocialImageSchema = z.object({
  id: UuidSchema.nullable(),
  url: HTTPS_URL_SCHEMA.nullable(),
  width: z.number().int().positive().max(SOCIAL_IMAGE_MAX_DIMENSION),
  height: z.number().int().positive().max(SOCIAL_IMAGE_MAX_DIMENSION),
  altText: SocialAltTextSchema.nullable(),
});

export type SocialImage = z.infer<typeof SocialImageSchema>;

export const SocialLinkSchema = z.object({
  id: z.string().min(1).max(120),
  platform: SocialPlatformSchema,
  url: HTTPS_URL_SCHEMA,
  caption: SocialCaptionSchema.nullable(),
  postedAt: IsoDateTimeSchema.nullable(),
  image: SocialImageSchema,
});

export type SocialLink = z.infer<typeof SocialLinkSchema>;

export const SocialCollectionSchema = z.object({
  items: z.array(SocialLinkSchema),
});

export type SocialCollection = z.infer<typeof SocialCollectionSchema>;

export const SocialListQuerySchema = z.strictObject({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(SOCIAL_LINK_MAX_LIMIT)
    .default(SOCIAL_LINK_LIMIT),
});

export type SocialListQuery = z.infer<typeof SocialListQuerySchema>;

const SocialLinkBodySchema = z.strictObject({
  platform: SocialPlatformSchema,
  url: HTTPS_URL_SCHEMA,
  caption: SocialCaptionSchema.nullable().optional(),
  postedAt: IsoDateTimeSchema.nullable().optional(),
  imageId: UuidSchema.nullable().optional(),
  imageUrl: HTTPS_URL_SCHEMA.nullable().optional(),
  imageWidth: z.number().int().positive().max(SOCIAL_IMAGE_MAX_DIMENSION).optional(),
  imageHeight: z.number().int().positive().max(SOCIAL_IMAGE_MAX_DIMENSION).optional(),
  altText: SocialAltTextSchema.nullable().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  isVisible: z.boolean().optional(),
});

export type SocialLinkBody = z.infer<typeof SocialLinkBodySchema>;

export const SocialLinkCreateSchema = SocialLinkBodySchema;

export type SocialLinkCreate = z.infer<typeof SocialLinkCreateSchema>;

export const SocialLinkUpdateSchema = SocialLinkBodySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Tidak ada perubahan yang dikirim');

export type SocialLinkUpdate = z.infer<typeof SocialLinkUpdateSchema>;

export const SocialLinkAdminSchema = z.object({
  id: UuidSchema,
  platform: SocialPlatformSchema,
  url: HTTPS_URL_SCHEMA,
  caption: SocialCaptionSchema.nullable(),
  postedAt: IsoDateTimeSchema.nullable(),
  imageId: UuidSchema.nullable(),
  imageUrl: HTTPS_URL_SCHEMA.nullable(),
  imageWidth: z.number().int().positive().nullable(),
  imageHeight: z.number().int().positive().nullable(),
  altText: SocialAltTextSchema.nullable(),
  sortOrder: z.number().int().min(0),
  isVisible: z.boolean(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type SocialLinkAdmin = z.infer<typeof SocialLinkAdminSchema>;

export const SocialLinkAdminListSchema = z.object({
  items: z.array(SocialLinkAdminSchema),
});

export type SocialLinkAdminList = z.infer<typeof SocialLinkAdminListSchema>;