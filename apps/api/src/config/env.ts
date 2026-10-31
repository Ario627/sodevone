import { z } from 'zod';

const DATABASE_URL_PATTERN = /^postgres(ql)?:\/\/[^\s]+$/;

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_NAME: z.string().min(1).max(80).default('kelas-xi-pplg-1-api'),
  CORS_ORIGINS: z.string().default('http://localhost:4200'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  RATE_LIMIT_TTL_SECONDS: z.coerce.number().int().min(1).max(3600).default(60),
  RATE_LIMIT_LIMIT: z.coerce.number().int().min(1).max(100000).default(120),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (value) => DATABASE_URL_PATTERN.test(value),
      'DATABASE_URL harus berupa URL postgres:// atau postgresql://',
    )
    .optional(),
  DATABASE_SSL: z.enum(['disable', 'require']).default('disable'),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  DATABASE_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(100).max(120_000).default(15_000),
  MEDIA_ROOT: z.string().min(1).max(400).default('storage'),
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(raw: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(raw);

  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
    throw new Error(`Konfigurasi environment tidak valid\n${lines.join('\n')}`);
  }

  return result.data;
}

export function corsOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => /^https?:\/\/[^/]+$/.test(origin));
}

export function databaseSsl(mode: Env['DATABASE_SSL']): false | 'require' {
  return mode === 'require' ? 'require' : false;
}

let cachedEnv: Env | undefined;

export function loadEnv(): Env {
  cachedEnv ??= parseEnv(process.env);
  return cachedEnv;
}
