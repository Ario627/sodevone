import { z } from 'zod';
import {
  IsoDateTimeSchema,
  PublishedStateSchema,
  SlugSchema,
  UuidSchema,
  paginatedSchema,
} from './common.js';
import { MAX_IMAGE_DIMENSION } from './gallery.js';
import {
  BooleanQuerySchema,
  PageParamSchema,
  PerPageAdminSchema,
  PerPagePublicSchema,
  SearchQuerySchema,
} from './query.js';

export const ANNOUNCEMENT_PIN_MAX = 3;

export const ANNOUNCEMENT_ATTACHMENT_MAX = 8;

export const MAX_ATTACHMENTS_PER_REQUEST = 5;

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export const ATTACHMENT_KINDS = ['image', 'file'] as const;

export const ATTACHMENT_FILE_MIME_TYPES = ['application/pdf'] as const;

export const AnnouncementCategorySchema = z.enum(['akademik', 'kegiatan', 'administrasi', 'umum']);

export type AnnouncementCategory = z.infer<typeof AnnouncementCategorySchema>;

export const AnnouncementStatusSchema = z.enum(['draft', 'published', 'archived']);

export type AnnouncementStatus = z.infer<typeof AnnouncementStatusSchema>;

export const AnnouncementTitleSchema = z.string().trim().min(3).max(160);

export const AnnouncementExcerptSchema = z.string().trim().max(320);

export const AnnouncementBodySchema = z.string().min(1).max(16_000);

export const AnnouncementSummarySchema = z.object({
  slug: SlugSchema,
  title: AnnouncementTitleSchema,
  excerpt: AnnouncementExcerptSchema,
  category: AnnouncementCategorySchema,
  state: PublishedStateSchema,
  isPinned: z.boolean(),
  publishedAt: IsoDateTimeSchema,
});

export type AnnouncementSummary = z.infer<typeof AnnouncementSummarySchema>;

export const AttachmentKindSchema = z.enum(ATTACHMENT_KINDS);

export type AttachmentKind = z.infer<typeof AttachmentKindSchema>;

export const AttachmentFileNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .refine(
    (value) => [...value].every((character) => character >= ' ' && character !== '\u007f'),
    'Nama berkas tidak valid',
  );

export const AttachmentMimeSchema = z.string().trim().min(3).max(120);

export const AnnouncementAttachmentSchema = z.object({
  id: UuidSchema,
  kind: AttachmentKindSchema,
  fileName: AttachmentFileNameSchema,
  mimeType: AttachmentMimeSchema,
  byteSize: z.number().int().positive().max(MAX_ATTACHMENT_BYTES),
  width: z.number().int().positive().max(MAX_IMAGE_DIMENSION).nullable(),
  height: z.number().int().positive().max(MAX_IMAGE_DIMENSION).nullable(),
  sortOrder: z.number().int().min(0),
});

export type AnnouncementAttachment = z.infer<typeof AnnouncementAttachmentSchema>;

export const AnnouncementAttachmentOrderSchema = z.strictObject({
  ids: z.array(UuidSchema).min(1).max(ANNOUNCEMENT_ATTACHMENT_MAX),
});

export type AnnouncementAttachmentOrder = z.infer<typeof AnnouncementAttachmentOrderSchema>;

export const AnnouncementPinSchema = z.strictObject({ pinned: z.boolean() });

export type AnnouncementPin = z.infer<typeof AnnouncementPinSchema>;

export const AnnouncementDetailSchema = AnnouncementSummarySchema.extend({
  bodyHtml: z.string().min(1),
  authorName: z.string().min(1).max(120).nullable(),
  attachments: z.array(AnnouncementAttachmentSchema).max(ANNOUNCEMENT_ATTACHMENT_MAX),
  updatedAt: IsoDateTimeSchema,
});

export type AnnouncementDetail = z.infer<typeof AnnouncementDetailSchema>;

export const AnnouncementListQuerySchema = z.object({
  page: PageParamSchema,
  perPage: PerPagePublicSchema,
  kategori: AnnouncementCategorySchema.optional(),
  q: SearchQuerySchema.optional(),
  arsip: BooleanQuerySchema.default(false),
});

export type AnnouncementListQuery = z.infer<typeof AnnouncementListQuerySchema>;

export const AnnouncementPageSchema = paginatedSchema(AnnouncementSummarySchema);

export type AnnouncementPage = z.infer<typeof AnnouncementPageSchema>;

export const AnnouncementAdminSchema = z.object({
  id: UuidSchema,
  slug: SlugSchema,
  title: AnnouncementTitleSchema,
  excerpt: AnnouncementExcerptSchema,
  body: AnnouncementBodySchema,
  category: AnnouncementCategorySchema,
  status: AnnouncementStatusSchema,
  isPinned: z.boolean(),
  authorId: UuidSchema,
  authorName: z.string().min(1).max(120),
  version: z.number().int().min(1),
  publishedAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type AnnouncementAdmin = z.infer<typeof AnnouncementAdminSchema>;

export const AnnouncementAdminDetailSchema = AnnouncementAdminSchema.extend({
  bodyHtml: z.string().min(1),
  attachments: z.array(AnnouncementAttachmentSchema).max(ANNOUNCEMENT_ATTACHMENT_MAX),
});

export type AnnouncementAdminDetail = z.infer<typeof AnnouncementAdminDetailSchema>;

export const AnnouncementAdminListSchema = AnnouncementAdminSchema.omit({ body: true });

export type AnnouncementAdminList = z.infer<typeof AnnouncementAdminListSchema>;

export const AnnouncementAdminPageSchema = paginatedSchema(AnnouncementAdminListSchema);

export type AnnouncementAdminPage = z.infer<typeof AnnouncementAdminPageSchema>;

export const AnnouncementCreateSchema = z.strictObject({
  title: AnnouncementTitleSchema,
  body: AnnouncementBodySchema,
  category: AnnouncementCategorySchema.optional(),
  excerpt: AnnouncementExcerptSchema.optional(),
  slug: SlugSchema.optional(),
});

export type AnnouncementCreate = z.infer<typeof AnnouncementCreateSchema>;

export const AnnouncementUpdateSchema = z
  .strictObject({
    title: AnnouncementTitleSchema.optional(),
    body: AnnouncementBodySchema.optional(),
    category: AnnouncementCategorySchema.optional(),
    excerpt: AnnouncementExcerptSchema.optional(),
    slug: SlugSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Tidak ada perubahan yang dikirim');

export type AnnouncementUpdate = z.infer<typeof AnnouncementUpdateSchema>;

export const AnnouncementAdminListQuerySchema = z.strictObject({
  page: PageParamSchema,
  perPage: PerPageAdminSchema,
  status: AnnouncementStatusSchema.optional(),
  kategori: AnnouncementCategorySchema.optional(),
  q: SearchQuerySchema.optional(),
});

export type AnnouncementAdminListQuery = z.infer<typeof AnnouncementAdminListQuerySchema>;
