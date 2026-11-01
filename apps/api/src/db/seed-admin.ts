import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { hashPassword } from '../auth/password.js';
import { adminUser } from './schema/admin-user.js';
import * as schema from './schema/index.js';

const USERNAME_PATTERN = /^[a-z0-9._-]{3,64}$/;

const MIN_PASSWORD_LENGTH = 12;

const MAX_PASSWORD_LENGTH = 128;

const MIN_DISPLAY_NAME_LENGTH = 2;

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
    throw new Error(`${name} wajib diisi`);
  }

  return value;
}

function usernameOf(): string {
  const username = requiredOf('SEED_ADMIN_USERNAME').toLowerCase();

  if (!USERNAME_PATTERN.test(username)) {
    throw new Error(
      'SEED_ADMIN_USERNAME harus 3-64 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung',
    );
  }

  return username;
}

function passwordOf(): string {
  const password = requiredOf('SEED_ADMIN_PASSWORD');

  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(
      `SEED_ADMIN_PASSWORD harus ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} karakter`,
    );
  }

  return password;
}

function displayNameOf(): string {
  const displayName = requiredOf('SEED_ADMIN_DISPLAY_NAME');

  if (displayName.length < MIN_DISPLAY_NAME_LENGTH) {
    throw new Error('SEED_ADMIN_DISPLAY_NAME minimal 2 karakter');
  }

  return displayName;
}

async function main(): Promise<void> {
  loadEnvFile();

  const databaseUrl = requiredOf('DATABASE_URL');
  const username = usernameOf();
  const password = passwordOf();
  const displayName = displayNameOf();

  const client = postgres(databaseUrl, { max: 1, onnotice: () => undefined });
  const db = drizzle(client, { schema });

  try {
    const passwordHash = await hashPassword(password);
    const existing = await db
      .select({ id: adminUser.id })
      .from(adminUser)
      .where(eq(adminUser.username, username))
      .limit(1);

    const found = existing[0];

    if (found === undefined) {
      await db.insert(adminUser).values({ username, displayName, passwordHash, role: 'admin' });
      console.log(`Akun ${username} dibuat.`);

      return;
    }

    await db
      .update(adminUser)
      .set({ displayName, passwordHash, role: 'admin', isActive: true })
      .where(eq(adminUser.id, found.id));
    console.log(`Akun ${username} diperbarui.`);
  } finally {
    await client.end({ timeout: 5 });
  }
}

await main();