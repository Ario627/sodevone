import { randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

const ARGON2_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

let dummyHash: Promise<string> | undefined;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

export function dummyHashOf(): Promise<string> {
  dummyHash ??= hash(randomBytes(24).toString('base64url'), ARGON2_OPTIONS);

  return dummyHash;
}

export async function consumeDummyVerification(password: string): Promise<void> {
  await verifyPassword(await dummyHashOf(), password);
}