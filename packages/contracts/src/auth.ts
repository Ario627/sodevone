import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema } from './common.js';

export const AdminRoleSchema = z.enum(['admin', 'editor']);

export type AdminRole = z.infer<typeof AdminRoleSchema>;

export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_MAX_LENGTH = 128;

export const AdminUsernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9._-]{3,64}$/,
    'Gunakan 3-64 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung',
  );

export const AdminDisplayNameSchema = z.string().trim().min(2).max(120);

export const AdminPasswordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH);

export const LoginRequestSchema = z.object({
  username: AdminUsernameSchema,
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const SessionUserSchema = z.object({
  id: UuidSchema,
  username: AdminUsernameSchema,
  displayName: AdminDisplayNameSchema,
  role: AdminRoleSchema,
});

export type SessionUser = z.infer<typeof SessionUserSchema>;

export const SessionResponseSchema = z.object({
  user: SessionUserSchema,
  expiresAt: IsoDateTimeSchema,
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export const AdminUserSchema = SessionUserSchema.extend({
  isActive: z.boolean(),
  createdAt: IsoDateTimeSchema,
  lastLoginAt: IsoDateTimeSchema.nullable(),
});

export type AdminUser = z.infer<typeof AdminUserSchema>;

export const AdminUserCreateSchema = z.strictObject({
  username: AdminUsernameSchema,
  displayName: AdminDisplayNameSchema,
  password: AdminPasswordSchema,
  role: AdminRoleSchema,
});

export type AdminUserCreate = z.infer<typeof AdminUserCreateSchema>;

export const AdminUserUpdateSchema = z
  .strictObject({
    displayName: AdminDisplayNameSchema.optional(),
    role: AdminRoleSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Tidak ada perubahan yang dikirim');

export type AdminUserUpdate = z.infer<typeof AdminUserUpdateSchema>;
