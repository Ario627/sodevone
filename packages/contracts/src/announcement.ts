import { z } from 'zod';
import { IsoDateTimeSchema, PublishedStateSchema, SlugSchema, UuidSchema } from './common.js';
import {
  BooleanQuerySchema,
  PageParamSchema,
  PerPageAdminSchema,
  PerPagePublicSchema,
  SearchQuerySchema,
} from './query.js';

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
  publishedAt: IsoDateTimeSchema,
});

export type AnnouncementSummary = z.infer<typeof AnnouncementSummarySchema>;

export const AnnouncementDetailSchema = AnnouncementSummarySchema.extend({
  bodyHtml: z.string().min(1),
  authorName: z.string().min(1).max(120).nullable(),
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

export const AnnouncementAdminSchema = z.object({
  id: UuidSchema,
  slug: SlugSchema,
  title: AnnouncementTitleSchema,
  excerpt: AnnouncementExcerptSchema,
  body: AnnouncementBodySchema,
  category: AnnouncementCategorySchema,
  status: AnnouncementStatusSchema,
  authorId: UuidSchema,
  authorName: z.string().min(1).max(120),
  publishedAt: IsoDateTimeSchema.nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type AnnouncementAdmin = z.infer<typeof AnnouncementAdminSchema>;

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
