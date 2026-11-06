import { z } from 'zod';
import {
  IsoDateSchema,
  IsoDateTimeSchema,
  PublishedStateSchema,
  SlugSchema,
  UuidSchema,
  paginatedSchema,
} from './common.js';
import { PageParamSchema, PerPageAdminSchema, hasControlCharacter } from './query.js';

export const IMAGE_INPUT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const IMAGE_STORED_MIME_TYPES = ['image/jpeg', 'image/webp'] as const;

export const IMAGE_VARIANTS = ['kecil', 'sedang'] as const;

export const ImageInputMimeSchema = z.enum(IMAGE_INPUT_MIME_TYPES);

export type ImageInputMime = z.infer<typeof ImageInputMimeSchema>;

export const ImageStoredMimeSchema = z.enum(IMAGE_STORED_MIME_TYPES);

export type ImageStoredMime = z.infer<typeof ImageStoredMimeSchema>;

export const ImageVariantSchema = z.enum(IMAGE_VARIANTS);

export type ImageVariant = z.infer<typeof ImageVariantSchema>;

export const MEDIA_VARIANT_WIDTHS: Record<ImageVariant, number> = { kecil: 480, sedang: 1024 };

export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

export const MAX_IMAGES_PER_REQUEST = 10;

export const MAX_IMAGE_DIMENSION = 6000;

export const MAX_IMAGE_PIXELS = 24_000_000;

export const ALBUM_IMAGES_PER_PAGE = 24;

export const ALBUM_LIST_PER_PAGE = 12;

export const ALBUM_LIST_MAX_PER_PAGE = 50;

export const AlbumStatusSchema = z.enum(['draft', 'published', 'archived']);

export type AlbumStatus = z.infer<typeof AlbumStatusSchema>;

export const AlbumTitleSchema = z.string().trim().min(3).max(160);

export const AlbumDescriptionSchema = z.string().trim().max(1000);

export const ImageAltTextSchema = z.string().trim().min(1).max(200);

export const GalleryImageSchema = z.object({
  id: UuidSchema,
  width: z.number().int().positive().max(MAX_IMAGE_DIMENSION),
  height: z.number().int().positive().max(MAX_IMAGE_DIMENSION),
  altText: ImageAltTextSchema.nullable(),
  sortOrder: z.number().int().min(0),
});

export type GalleryImage = z.infer<typeof GalleryImageSchema>;

export const AlbumSummarySchema = z.object({
  slug: SlugSchema,
  title: AlbumTitleSchema,
  description: AlbumDescriptionSchema.nullable(),
  eventDate: IsoDateSchema,
  state: PublishedStateSchema,
  cover: GalleryImageSchema.nullable(),
  imageCount: z.number().int().min(0),
  publishedAt: IsoDateTimeSchema,
});

export type AlbumSummary = z.infer<typeof AlbumSummarySchema>;

export const AlbumPageSchema = paginatedSchema(AlbumSummarySchema);

export type AlbumPage = z.infer<typeof AlbumPageSchema>;

export const AlbumDetailSchema = AlbumSummarySchema.extend({
  images: paginatedSchema(GalleryImageSchema),
});

export type AlbumDetail = z.infer<typeof AlbumDetailSchema>;

export const AlbumDetailQuerySchema = z.object({
  page: PageParamSchema,
  perPage: z.coerce.number().int().min(1).max(ALBUM_IMAGES_PER_PAGE).default(ALBUM_IMAGES_PER_PAGE),
});

export type AlbumDetailQuery = z.infer<typeof AlbumDetailQuerySchema>;

export const AlbumListQuerySchema = z.object({
  page: PageParamSchema,
  perPage: z.coerce.number().int().min(1).max(ALBUM_LIST_MAX_PER_PAGE).default(ALBUM_LIST_PER_PAGE),
});

export type AlbumListQuery = z.infer<typeof AlbumListQuerySchema>;

export const AlbumAdminSchema = z.object({
  id: UuidSchema,
  slug: SlugSchema,
  title: AlbumTitleSchema,
  description: AlbumDescriptionSchema.nullable(),
  eventDate: IsoDateSchema,
  status: AlbumStatusSchema,
  coverImageId: UuidSchema.nullable(),
  imageCount: z.number().int().min(0),
  publishedAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type AlbumAdmin = z.infer<typeof AlbumAdminSchema>;

export const AlbumAdminDetailSchema = AlbumAdminSchema.extend({
  images: z.array(GalleryImageSchema),
});

export type AlbumAdminDetail = z.infer<typeof AlbumAdminDetailSchema>;

export const AlbumAdminPageSchema = paginatedSchema(AlbumAdminSchema);

export type AlbumAdminPage = z.infer<typeof AlbumAdminPageSchema>;

export const AlbumCreateSchema = z.strictObject({
  title: AlbumTitleSchema,
  description: AlbumDescriptionSchema.nullable().optional(),
  eventDate: IsoDateSchema,
  slug: SlugSchema.optional(),
});

export type AlbumCreate = z.infer<typeof AlbumCreateSchema>;

export const AlbumUpdateSchema = z
  .strictObject({
    title: AlbumTitleSchema.optional(),
    description: AlbumDescriptionSchema.nullable().optional(),
    eventDate: IsoDateSchema.optional(),
    slug: SlugSchema.optional(),
    coverImageId: UuidSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Tidak ada perubahan yang dikirim');

export type AlbumUpdate = z.infer<typeof AlbumUpdateSchema>;

export const AlbumAdminListQuerySchema = z.strictObject({
  page: PageParamSchema,
  perPage: PerPageAdminSchema,
  status: AlbumStatusSchema.optional(),
});

export type AlbumAdminListQuery = z.infer<typeof AlbumAdminListQuerySchema>;

export const ImageAltUpdateSchema = z.strictObject({ altText: ImageAltTextSchema });

export type ImageAltUpdate = z.infer<typeof ImageAltUpdateSchema>;

export const MAX_ALBUM_IMAGES = 200;

export const AlbumImageOrderSchema = z.strictObject({
  ids: z.array(UuidSchema).min(1).max(MAX_ALBUM_IMAGES),
});

export type AlbumImageOrder = z.infer<typeof AlbumImageOrderSchema>;

export const ImageUploadFailureSchema = z.object({
  fileName: z
    .string()
    .max(255)
    .refine(
      (value) => !hasControlCharacter(value),
      'Nama berkas memuat karakter yang tidak diizinkan',
    ),
  reason: z.string().min(1).max(200),
});

export type ImageUploadFailure = z.infer<typeof ImageUploadFailureSchema>;

export const ImageUploadResultSchema = z.object({
  uploaded: z.array(GalleryImageSchema),
  failed: z.array(ImageUploadFailureSchema),
});

export type ImageUploadResult = z.infer<typeof ImageUploadResultSchema>;
