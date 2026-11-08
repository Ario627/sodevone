import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';

const MIGRATION_DIRECTORY = path.join(import.meta.dirname, 'migrations');

const MIGRATION_FILE = /^\d{4}_[a-z0-9_]+\.sql$/;

const MIGRATION_PREFIX = /^(\d{4})_/;

function loadEnvFile(): void {
  try {
    process.loadEnvFile();
  } catch {
    return;
  }
}

const ADVISORY_LOCK_KEY = 8_412_119;

const LEDGER_TABLE = 'migration_ledger';

type MigrationFile = { name: string; checksum: string; body: string };

function assertUniquePrefixes(names: string[]): void {
  const seen = new Map<string, string>();

  for (const name of names) {
    const prefix = MIGRATION_PREFIX.exec(name)?.[1];

    if (prefix === undefined) {
      continue;
    }

    const previous = seen.get(prefix);

    if (previous !== undefined) {
      throw new Error(
        `Migrasi ${name} memakai nomor urut ${prefix} yang sama dengan ${previous}. ` +
          'Nomor urut harus unik; jangan jalankan drizzle-kit generate di direktori ini.',
      );
    }

    seen.set(prefix, name);
  }
}

async function listMigrationFiles(): Promise<string[]> {
  const entries = await readdir(MIGRATION_DIRECTORY);

  const names = entries.filter((entry) => MIGRATION_FILE.test(entry)).sort();

  assertUniquePrefixes(names);

  return names;
}

function checksumOf(body: string): string {
  return createHash('sha256').update(body, 'utf8').digest('hex');
}

async function readMigration(name: string): Promise<MigrationFile> {
  const body = await readFile(path.join(MIGRATION_DIRECTORY, name), 'utf8');

  return { name, checksum: checksumOf(body), body };
}

async function ensureLedger(sql: postgres.Sql): Promise<void> {
  await sql`
    create table if not exists ${sql(LEDGER_TABLE)} (
      name text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `;
}

async function appliedChecksums(sql: postgres.Sql): Promise<Map<string, string>> {
  const rows = await sql<{ name: string; checksum: string }[]>`
    select name, checksum from ${sql(LEDGER_TABLE)}
  `;

  return new Map(rows.map((row) => [row.name, row.checksum]));
}

async function applyMigration(sql: postgres.Sql, migration: MigrationFile): Promise<void> {
  await sql.begin(async (transaction) => {
    await transaction.unsafe(migration.body);
    await transaction`
      insert into ${transaction(LEDGER_TABLE)} (name, checksum)
      values (${migration.name}, ${migration.checksum})
    `;
  });
}

async function run(): Promise<void> {
  loadEnvFile();

  const url = process.env['DATABASE_URL'];

  if (url === undefined || url.length === 0) {
    throw new Error('DATABASE_URL wajib diisi untuk menjalankan migrasi');
  }

  const sql = postgres(url, { max: 1, onnotice: () => undefined });

  try {
    await sql`select pg_advisory_lock(${ADVISORY_LOCK_KEY})`;
    await ensureLedger(sql);

    const applied = await appliedChecksums(sql);
    const names = await listMigrationFiles();
    let count = 0;

    for (const name of names) {
      const migration = await readMigration(name);
      const previous = applied.get(name);

      if (previous !== undefined) {
        if (previous !== migration.checksum) {
          throw new Error(`Migrasi ${name} sudah diterapkan lalu diubah, buat migrasi baru`);
        }

        continue;
      }

      await applyMigration(sql, migration);
      count += 1;
      console.log(`diterapkan ${name}`);
    }

    console.log(count === 0 ? 'tidak ada migrasi baru' : `${count} migrasi diterapkan`);
  } finally {
    await sql`select pg_advisory_unlock(${ADVISORY_LOCK_KEY})`.catch(() => undefined);
    await sql.end({ timeout: 5 });
  }
}

await run();