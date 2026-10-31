import { z } from 'zod';

export const UuidSchema = z.uuid();

export const SlugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Gunakan huruf kecil, angka, dan tanda hubung');

export const IsoDateTimeSchema = z.iso.datetime();

export const IsoDateSchema = z.iso.date();

export const PublishedStateSchema = z.enum(['published', 'archived']);

export type PublishedState = z.infer<typeof PublishedStateSchema>;

export const CorrelationIdSchema = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[A-Za-z0-9._:-]+$/, 'Correlation id memuat karakter yang tidak diizinkan');

export const IdempotencyKeySchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._~-]+$/, 'Idempotency key memuat karakter yang tidak diizinkan');

export const PaginationMetaSchema = z.object({
  page: z.number().int().min(1),
  perPage: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export function paginatedSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    meta: PaginationMetaSchema,
  });
}

export const ApiErrorCodeSchema = z.enum([
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
]);

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiFieldErrorSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    correlationId: z.string().optional(),
    fields: z.array(ApiFieldErrorSchema).optional(),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const HealthStatusSchema = z.enum(['ok', 'degraded']);

export const HealthCheckStatusSchema = z.enum(['ok', 'skipped', 'error']);

export type HealthCheckStatus = z.infer<typeof HealthCheckStatusSchema>;

export const HealthResponseSchema = z.object({
  status: HealthStatusSchema,
  uptimeSeconds: z.number().nonnegative(),
  version: z.string(),
  checks: z.object({ database: HealthCheckStatusSchema }).optional(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
