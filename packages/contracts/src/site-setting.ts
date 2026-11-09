import { z } from 'zod';
import { IsoDateTimeSchema } from './common.js';
import { hasControlCharacter } from './query.js';

export const SETTING_KEYS = ['voxel-board'] as const;

export const SettingKeySchema = z.enum(SETTING_KEYS);

export type SettingKey = z.infer<typeof SettingKeySchema>;

export const VOXEL_COLORS = ['sinyal', 'tinta', 'batu', 'hijau'] as const;

export const VoxelColorSchema = z.enum(VOXEL_COLORS);

export type VoxelColor = z.infer<typeof VoxelColorSchema>;

export const VOXEL_NARROW_WIDTH = 5;

export const VOXEL_GLYPH_HEIGHT = 7;

export const VOXEL_MIN_COLUMNS = 5;

export const VOXEL_MAX_COLUMNS = 48;

export const VOXEL_MIN_ROWS = 7;

export const VOXEL_MAX_ROWS = 24;

export const VOXEL_TEXT_MAX_LENGTH = 16;

const VOXEL_ROW = /^[01]+$/;

export const VoxelTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(VOXEL_TEXT_MAX_LENGTH)
  .refine((value) => !hasControlCharacter(value), 'Teks memuat karakter yang tidak diizinkan');

export const VoxelRowsSchema = z
  .array(z.string().regex(VOXEL_ROW, 'Baris papan hanya boleh berisi 0 dan 1'))
  .min(VOXEL_MIN_ROWS, `Papan minimal ${VOXEL_MIN_ROWS} baris`)
  .max(VOXEL_MAX_ROWS, `Papan maksimal ${VOXEL_MAX_ROWS} baris`)
  .refine(
    (rows) => rows.every((row) => row.length === rows[0]?.length),
    'Semua baris papan harus sama panjang',
  )
  .refine(
    (rows) => (rows[0]?.length ?? 0) >= VOXEL_MIN_COLUMNS,
    `Papan minimal ${VOXEL_MIN_COLUMNS} kolom`,
  )
  .refine(
    (rows) => (rows[0]?.length ?? 0) <= VOXEL_MAX_COLUMNS,
    `Papan maksimal ${VOXEL_MAX_COLUMNS} kolom`,
  );

export const VoxelBoardSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('teks'),
    teks: VoxelTextSchema,
    warna: VoxelColorSchema,
  }),
  z.strictObject({
    kind: z.literal('matriks'),
    baris: VoxelRowsSchema,
    warna: VoxelColorSchema,
  }),
]);

export type VoxelBoard = z.infer<typeof VoxelBoardSchema>;

export const DEFAULT_VOXEL_BOARD: VoxelBoard = {
  kind: 'teks',
  teks: 'XI',
  warna: 'sinyal',
};

export const SiteSettingSchema = z.strictObject({
  voxelBoard: VoxelBoardSchema,
  updatedAt: IsoDateTimeSchema.nullable(),
});

export type SiteSetting = z.infer<typeof SiteSettingSchema>;

export const SiteSettingAdminSchema = SiteSettingSchema;

export type SiteSettingAdmin = z.infer<typeof SiteSettingAdminSchema>;

export const VoxelBoardInputSchema = z.strictObject({
  voxelBoard: VoxelBoardSchema,
});

export type VoxelBoardInput = z.infer<typeof VoxelBoardInputSchema>;