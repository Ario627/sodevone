import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { EnvSchema, corsOrigins, databaseSsl, parseEnv } from './env.js';

const CONTOH_PATH = path.join(import.meta.dirname, '..', '..', '.env.example');

function keysOfExample(body: string): string[] {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => line.split('=')[0] ?? '')
    .filter((key) => key.length > 0);
}

const MINIMAL_ENV = {};

describe('parseEnv', () => {
  it('memberi nilai bawaan saat lingkungan kosong', () => {
    const env = parseEnv(MINIMAL_ENV);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_SSL).toBe('disable');
    expect(env.DATABASE_POOL_MAX).toBe(10);
    expect(env.TRUST_PROXY_HOPS).toBe(0);
  });

  it('menerima URL postgres dan postgresql', () => {
    expect(
      parseEnv({ DATABASE_URL: 'postgres://user:pass@host:5432/db' }).DATABASE_URL,
    ).toBeDefined();
    expect(parseEnv({ DATABASE_URL: 'postgresql://user@host/db' }).DATABASE_URL).toBeDefined();
  });

  it('menolak DATABASE_URL dengan skema lain', () => {
    expect(() => parseEnv({ DATABASE_URL: 'mysql://host/db' })).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ DATABASE_URL: 'localhost:5432' })).toThrow(/DATABASE_URL/);
  });

  it('menolak port di luar rentang', () => {
    expect(() => parseEnv({ PORT: '0' })).toThrow(/PORT/);
    expect(() => parseEnv({ PORT: '70000' })).toThrow(/PORT/);
  });

  it('membatasi jumlah hop trust proxy', () => {
    expect(parseEnv({ TRUST_PROXY_HOPS: '2' }).TRUST_PROXY_HOPS).toBe(2);
    expect(() => parseEnv({ TRUST_PROXY_HOPS: '11' })).toThrow(/TRUST_PROXY_HOPS/);
  });

  it('menolak level log yang tidak dikenal', () => {
    expect(() => parseEnv({ LOG_LEVEL: 'verbose' })).toThrow(/LOG_LEVEL/);
  });

  it('menyebutkan nama variabel pada pesan galat', () => {
    expect(() => parseEnv({ PORT: 'abc' })).toThrow(/PORT/);
  });
});

describe('corsOrigins', () => {
  it('memisahkan daftar dan memangkas spasi', () => {
    expect(corsOrigins(' http://localhost:4200 , https://kelas.example ')).toEqual([
      'http://localhost:4200',
      'https://kelas.example',
    ]);
  });

  it('membuang entri yang bukan origin http atau https', () => {
    expect(corsOrigins('*,null,file:///tmp,https://ok.example/path,https://baik.example')).toEqual([
      'https://baik.example',
    ]);
  });

  it('mengembalikan daftar kosong bila tidak ada origin sah', () => {
    expect(corsOrigins('')).toEqual([]);
  });
});

describe('databaseSsl', () => {
  it('mematikan TLS saat mode disable', () => {
    expect(databaseSsl('disable')).toBe(false);
  });

  it('mewajibkan TLS saat mode require', () => {
    expect(databaseSsl('require')).toBe('require');
  });
});

describe('.env.example', () => {
  it('memuat seluruh kunci skema dan tidak memuat kunci asing', async () => {
    const body = await readFile(CONTOH_PATH, 'utf8');
    const exampleKeys = keysOfExample(body).sort();
    const schemaKeys = EnvSchema.keyof().options.map(String).sort();

    expect(exampleKeys).toEqual(schemaKeys);
  });

  it('hanya menunjuk basis data lokal sehingga tidak mungkin berisi kredensial nyata', async () => {
    const body = await readFile(CONTOH_PATH, 'utf8');
    const line = body.split('\n').find((entry) => entry.startsWith('DATABASE_URL='));
    const url = line?.slice('DATABASE_URL='.length) ?? '';
    const parsed = EnvSchema.parse({ DATABASE_URL: url });

    expect(parsed.DATABASE_URL).toMatch(/@(localhost|127\.0\.0\.1):/);
  });
});
