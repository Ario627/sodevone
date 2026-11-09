import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export const MIGRATION_DIRECTORY = path.join(import.meta.dirname, 'migrations');

const MIGRATION_FILE = /^\d{4}_[a-z0-9_]+\.sql$/;

const MIGRATION_PREFIX = /^(\d{4})_/;

export function withoutSchemaQualifier(body: string): string {
  return body.replaceAll('"public".', '');
}

export async function migrationFileNames(): Promise<string[]> {
  const entries = await readdir(MIGRATION_DIRECTORY);

  return entries.filter((entry) => MIGRATION_FILE.test(entry)).sort();
}

export async function migrationBodies(): Promise<string[]> {
  const names = await migrationFileNames();

  const bodies = await Promise.all(
    names.map((name) => readFile(path.join(MIGRATION_DIRECTORY, name), 'utf8')),
  );

  return bodies.map(withoutSchemaQualifier);
}

export function migrationPrefixOf(name: string): string | undefined {
  return MIGRATION_PREFIX.exec(name)?.[1];
}