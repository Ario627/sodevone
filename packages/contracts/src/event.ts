import { z } from 'zod';
import {
  IsoDateTimeSchema,
  PublishedStateSchema,
  SlugSchema,
  UuidSchema,
  paginatedSchema,
} from './common.js';
import { MAX_IMAGE_DIMENSION } from './gallery.js';
import { PageParamSchema, PerPageAdminSchema } from './query.js';

export const EVENT_PHOTO_MAX = 12;

export const EventStatusSchema = z.enum(['draft', 'published', 'archived']);

export type EventStatus = z.infer<typeof EventStatusSchema>;

export const EventTitleSchema = z.string().trim().min(3).max(160);

export const EventDescriptionSchema = z.string().trim().max(2000);

export const EventLocationSchema = z.string().trim().max(200);

export const EventSummarySchema = z.object({
  slug: SlugSchema,
  title: EventTitleSchema,
  startsAt: IsoDateTimeSchema,
  endsAt: IsoDateTimeSchema.nullable(),
  location: EventLocationSchema.nullable(),
  state: PublishedStateSchema,
});

export type EventSummary = z.infer<typeof EventSummarySchema>;

export const EventPhotoSchema = z.object({
  id: UuidSchema,
  width: z.number().int().positive().max(MAX_IMAGE_DIMENSION),
  height: z.number().int().positive().max(MAX_IMAGE_DIMENSION),
  altText: z.string().min(1).max(200).nullable(),
  sortOrder: z.number().int().min(0),
});

export type EventPhoto = z.infer<typeof EventPhotoSchema>;

export const EventImagesSchema = z.strictObject({
  imageIds: z.array(UuidSchema).max(EVENT_PHOTO_MAX),
});

export type EventImages = z.infer<typeof EventImagesSchema>;

export const EventDetailSchema = EventSummarySchema.extend({
  description: EventDescriptionSchema.nullable(),
  photos: z.array(EventPhotoSchema).max(EVENT_PHOTO_MAX),
});

export type EventDetail = z.infer<typeof EventDetailSchema>;

export const EventCollectionSchema = z.object({
  upcoming: z.array(EventSummarySchema),
  past: z.array(EventSummarySchema),
});

export type EventCollection = z.infer<typeof EventCollectionSchema>;

export const EventAdminSchema = z.object({
  id: UuidSchema,
  slug: SlugSchema,
  title: EventTitleSchema,
  description: EventDescriptionSchema.nullable(),
  location: EventLocationSchema.nullable(),
  startsAt: IsoDateTimeSchema,
  endsAt: IsoDateTimeSchema.nullable(),
  status: EventStatusSchema,
  photoCount: z.number().int().min(0),
  authorName: z.string().min(1).max(120),
  version: z.number().int().min(1),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type EventAdmin = z.infer<typeof EventAdminSchema>;

export const EventAdminDetailSchema = EventAdminSchema.extend({
  photos: z.array(EventPhotoSchema).max(EVENT_PHOTO_MAX),
});

export type EventAdminDetail = z.infer<typeof EventAdminDetailSchema>;

export const EventAdminListSchema = EventAdminSchema.omit({ description: true });

export type EventAdminList = z.infer<typeof EventAdminListSchema>;

export const EventAdminPageSchema = paginatedSchema(EventAdminListSchema);

export type EventAdminPage = z.infer<typeof EventAdminPageSchema>;

export const EventCreateSchema = z
  .strictObject({
    title: EventTitleSchema,
    description: EventDescriptionSchema.nullable().optional(),
    location: EventLocationSchema.nullable().optional(),
    startsAt: IsoDateTimeSchema,
    endsAt: IsoDateTimeSchema.nullable().optional(),
    slug: SlugSchema.optional(),
  })
  .refine(
    (value) =>
      value.endsAt === undefined ||
      value.endsAt === null ||
      Date.parse(value.endsAt) >= Date.parse(value.startsAt),
    { message: 'Waktu selesai tidak boleh lebih awal dari waktu mulai', path: ['endsAt'] },
  );

export type EventCreate = z.infer<typeof EventCreateSchema>;

export const EventUpdateSchema = z
  .strictObject({
    title: EventTitleSchema.optional(),
    description: EventDescriptionSchema.nullable().optional(),
    location: EventLocationSchema.nullable().optional(),
    startsAt: IsoDateTimeSchema.optional(),
    endsAt: IsoDateTimeSchema.nullable().optional(),
    slug: SlugSchema.optional(),
  })
  .refine(
    (value) =>
      value.startsAt === undefined ||
      value.endsAt === undefined ||
      value.endsAt === null ||
      Date.parse(value.endsAt) >= Date.parse(value.startsAt),
    { message: 'Waktu selesai tidak boleh lebih awal dari waktu mulai', path: ['endsAt'] },
  )
  .refine((value) => Object.keys(value).length > 0, 'Tidak ada perubahan yang dikirim');

export type EventUpdate = z.infer<typeof EventUpdateSchema>;

export const EventAdminListQuerySchema = z.strictObject({
  page: PageParamSchema,
  perPage: PerPageAdminSchema,
  status: EventStatusSchema.optional(),
});

export type EventAdminListQuery = z.infer<typeof EventAdminListQuerySchema>;
