import path from 'node:path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import { keptKeysOf, planMediaSweep, removeSweptFiles } from '../media/media-sweep.js';
import type { SweepPlan } from '../media/media-sweep.js';
import { announcementAttachment, galleryImage } from './schema/index.js';

const DEFAULT_GRACE_MINUTES = 60;

const MINUTES_PER_HOUR = 60_000;

const APPLY_FLAG = '--apply';

function loadEnvFile(): void {
  try {
    process.loadEnvFile();
  } catch {
    return;
  }
}

function requiredOf(name: string): string {
  const value = process.env[name]?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function graceMsOf(raw: string | undefined): number {
  const minutes = raw === undefined ? DEFAULT_GRACE_MINUTES : parseInt(raw, 10);
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new Error(`Invalid SWEEP_GRACE_MINUTES: ${raw}`);
  }

  return minutes * MINUTES_PER_HOUR;
}

function mebibyteOf(bytes: number): string {
  return `${(bytes / 1_048_576).toFixed(2)} MiB`;
}

function reportOf(plan: SweepPlan, graceMinutes: number): void {
  console.log(`berkas diperiksa: ${plan.scanned}`);
  console.log(`kandidat yatim : ${plan.orphans.length} (${mebibyteOf(plan.byteSize)})`);

  if (plan.orphans.length === 0) {
    return;
  }

  if (plan.orphans.length > 100) {
    console.log(`daftar dipotong pada 100 entri dari ${plan.orphans.length}`);

    return;
  }

  console.log(`batas aman    : ${graceMinutes} menit`);

  for (const orphan of plan.orphans) {
    console.log(`  ${orphan.modifiedAt} ${mebibyteOf(orphan.byteSize).padStart(10)} ${orphan.key}`);
  }
}

async function run(): Promise<void> {
  loadEnvFile();

  const databaseUrl = requiredOf('DATABASE_URL');
  const root = path.resolve(requiredOf('MEDIA_ROOT'));
  const graceMs = graceMsOf(process.env['SWEEP_GRACE_MINUTES']);
  const apply = process.argv.includes(APPLY_FLAG);

  const client = postgres(databaseUrl, { max: 1, onnotice: () => undefined });
  const db = drizzle(client, { schema });

  try {
    const [galleryRows, attachmentRows] = await Promise.all([
      db.select({ storageKey: galleryImage.storageKey }).from(galleryImage),
      db.select({ storageKey: announcementAttachment.storageKey }).from(announcementAttachment),
    ]);

    const plan = await planMediaSweep({
      root,
      keep: keptKeysOf([...galleryRows, ...attachmentRows].map((row) => row.storageKey)),
      graceMs,
      now: Date.now(),
    });

    reportOf(plan, graceMs / MINUTES_PER_HOUR);

    if (!apply) {
      console.log('mode uji: tidak ada berkas dihapus, jalankan dengan --apply untuk menghapus');

      return;
    }

    const removed = await removeSweptFiles(root, plan);

    console.log(`${removed} berkas yatim dihapus`);
  } finally {
    await client.end({ timeout: 5 });
  }
}

await run();
