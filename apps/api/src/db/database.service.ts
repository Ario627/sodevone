import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { HealthCheckStatus } from '@kelas/contracts';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Env } from '../config/env.js';
import { databaseSsl } from '../config/env.js';
import * as schema from './schema/index.js';

const PROBE_TIMEOUT_MS = 3_000;

const IDLE_TIMEOUT_SECONDS = 30;

const CONNECT_TIMEOUT_SECONDS = 10;

const MAX_LIFETIME_SECONDS = 1_800;

const APPLICATION_NAME = 'kelas-api';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  private client: postgres.Sql | null = null;

  private instance: PostgresJsDatabase<typeof schema> | null = null;

  constructor(private readonly config: ConfigService<Env, true>) {}

  get sql(): postgres.Sql {
    return this.clientOrThrow();
  }

  get db(): PostgresJsDatabase<typeof schema> {
    if (this.instance === null) {
      this.instance = drizzle(this.clientOrThrow(), { schema });
    }

    return this.instance;
  }

  private clientOrThrow(): postgres.Sql {
    if (this.client === null) {
      throw new Error('DATABASE_URL belum dikonfigurasi, akses basis data tidak tersedia');
    }

    return this.client;
  }

  private createClient(url: string): postgres.Sql {
    return postgres(url, {
      max: this.config.get('DATABASE_POOL_MAX', { infer: true }),
      idle_timeout: IDLE_TIMEOUT_SECONDS,
      connect_timeout: CONNECT_TIMEOUT_SECONDS,
      max_lifetime: MAX_LIFETIME_SECONDS,
      ssl: databaseSsl(this.config.get('DATABASE_SSL', { infer: true })),
      connection: {
        application_name: APPLICATION_NAME,
        timezone: 'UTC',
        statement_timeout: this.config.get('DATABASE_STATEMENT_TIMEOUT_MS', { infer: true }),
        idle_in_transaction_session_timeout: this.config.get(
          'DATABASE_STATEMENT_TIMEOUT_MS',
          { infer: true },
        ),
      },
      onnotice: () => undefined,
    });
  }

  onModuleInit(): void {
    const url = this.config.get('DATABASE_URL', { infer: true });

    if (url === undefined) {
      if (this.config.get('NODE_ENV', { infer: true }) === 'production') {
        throw new Error('DATABASE_URL wajib diisi pada lingkungan produksi');
      }

      this.logger.warn('DATABASE_URL belum diisi, endpoint yang butuh basis data akan menolak');

      return;
    }

    this.client = this.createClient(url);
    this.logger.log('Koneksi basis data disiapkan');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client === null) {
      return;
    }

    await this.client.end({ timeout: 5 });
    this.client = null;
    this.instance = null;
  }

  async probe(): Promise<HealthCheckStatus> {
    if (this.client === null) {
      return 'skipped';
    }

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Waktu pemeriksaan basis data habis')), PROBE_TIMEOUT_MS)
        .unref();
    });

    try {
      await Promise.race([this.client`select 1`, timeout]);

      return 'ok';
    } catch (error) {
      this.logger.warn(
        `Pemeriksaan basis data gagal: ${error instanceof Error ? error.name : 'unknown'}`,
      );

      return 'error';
    }
  }
}