import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@kelas/contracts';
import { checkBreached } from './breached-password.js';

const NON_ALPHANUMERIC = /[^a-z0-9]/g;

const MIN_NAME_LENGTH = 3;

export type PasswordVerdict = { ok: true } | { ok: false; message: string };

export type PasswordSubject = { username: string; displayName: string };

function normalize(value: string): string {
  return value.toLowerCase().replace(NON_ALPHANUMERIC, '');
}

function containsIdentity(password: string, subject: PasswordSubject): boolean {
  const target = normalize(password);

  if (target.length === 0) {
    return false;
  }

  return [subject.username, subject.displayName].some((name) => {
    const normalized = normalize(name);

    return normalized.length >= MIN_NAME_LENGTH && target.includes(normalized);
  });
}

export async function assessPassword(
  password: string,
  subject: PasswordSubject,
  breachCheck: 'enabled' | 'disabled',
  timeoutMs: number,
): Promise<PasswordVerdict> {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, message: `Kata sandi minimal ${PASSWORD_MIN_LENGTH} karakter.` };
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, message: `Kata sandi maksimal ${PASSWORD_MAX_LENGTH} karakter.` };
  }

  if (containsIdentity(password, subject)) {
    return { ok: false, message: 'Kata sandi tidak boleh memuat nama pengguna atau nama tampilan.' };
  }

  if (breachCheck === 'disabled') {
    return { ok: true };
  }

  const result = await checkBreached(password, timeoutMs);

  return result === 'breached'
    ? {
        ok: false,
        message: 'Kata sandi ini pernah muncul pada kebocoran data publik. Pilih kata sandi lain.',
      }
    : { ok: true };
}