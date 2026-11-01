import { createHash, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 32;

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function createSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return sha256Hex(token);
}