import type { ConfigService } from '@nestjs/config';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { AuditRepository } from '../audit/audit.repository.js';
import type { Env } from '../config/env.js';
import type { AccountRow, AuthRepository, SessionRow } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import type { SessionContext } from './auth.service.js';
import { LoginThrottle } from './login-throttle.js';
import { hashPassword } from './password.js';
import { hashSessionToken } from './token.js';

const NILAI: Record<string, number> = {
  SESSION_TTL_HOURS: 12,
  LOGIN_FAILURE_LIMIT: 5,
  LOGIN_FAILURE_WINDOW_MINUTES: 15,
  LOGIN_IP_FAILURE_LIMIT: 30,
};

const USER_ID = '11111111-1111-4111-8111-111111111111';

const SESSION_ID = '22222222-2222-4222-8222-222222222222';

const PASSWORD = 'kata-sandi-yang-panjang';

const PASSWORD_SALAH = 'kata-sandi-yang-salah';

const KONTEKS = { ipHash: 'c'.repeat(64), userAgent: 'vitest', correlationId: 'abc12345' };

const JAM = 3_600_000;

let hash = '';

beforeAll(async () => {
  hash = await hashPassword(PASSWORD);
});

function configOf(): ConfigService<Env, true> {
  return { get: (key: string) => NILAI[key] } as unknown as ConfigService<Env, true>;
}

function waktu(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString().replace('T', ' ').replace('Z', '+00');
}

function akunOf(overrides: Partial<AccountRow> = {}): AccountRow {
  return {
    id: USER_ID,
    username: 'budi',
    displayName: 'Budi Santoso',
    role: 'admin',
    passwordHash: hash,
    isActive: true,
    ...overrides,
  };
}

function sesiOf(overrides: Partial<SessionRow> = {}): SessionRow {
  return {
    sessionId: SESSION_ID,
    createdAt: waktu(-60_000),
    expiresAt: waktu(12 * JAM),
    revokedAt: null,
    userId: USER_ID,
    username: 'budi',
    displayName: 'Budi Santoso',
    role: 'admin',
    isActive: true,
    ...overrides,
  };
}

function sesiKonteksOf(): SessionContext {
  return {
    sessionId: SESSION_ID,
    userId: USER_ID,
    username: 'budi',
    displayName: 'Budi Santoso',
    role: 'admin',
    expiresAt: waktu(JAM),
  };
}

function buatService(options: { akun?: AccountRow; sesi?: SessionRow } = {}) {
  const repository = {
    findAccountByUsername: vi.fn().mockResolvedValue(options.akun),
    findSession: vi.fn().mockResolvedValue(options.sesi),
    createSession: vi.fn().mockResolvedValue(undefined),
    markLogin: vi.fn().mockResolvedValue(undefined),
    renewSession: vi.fn().mockResolvedValue(undefined),
    revokeSession: vi.fn().mockResolvedValue(undefined),
    revokeSessionsOfUser: vi.fn().mockResolvedValue(undefined),
  };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const config = configOf();
  const service = new AuthService(
    repository as unknown as AuthRepository,
    new LoginThrottle(config),
    audit as unknown as AuditRepository,
    config,
  );

  return { service, repository, audit };
}

describe('AuthService.login', () => {
  it('membuat sesi dan menyimpan hash token, bukan token mentah', async () => {
    const { service, repository, audit } = buatService({ akun: akunOf() });

    const hasil = await service.login({ username: 'budi', password: PASSWORD }, KONTEKS);

    expect(hasil.kind).toBe('ok');

    if (hasil.kind !== 'ok') {
      return;
    }

    expect(hasil.user).toEqual({
      id: USER_ID,
      username: 'budi',
      displayName: 'Budi Santoso',
      role: 'admin',
    });
    expect(hasil.token).toHaveLength(43);

    const simpan = repository.createSession.mock.calls[0]?.[0] as
      | { tokenHash: string; expiresAt: string; userId: string }
      | undefined;

    expect(simpan?.userId).toBe(USER_ID);
    expect(simpan?.tokenHash).toBe(hashSessionToken(hasil.token));
    expect(simpan?.tokenHash).not.toBe(hasil.token);
    expect(simpan?.expiresAt).toBe(hasil.expiresAt);
    expect(repository.markLogin).toHaveBeenCalledWith(USER_ID, expect.any(String));
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'login_success', actorId: USER_ID }),
    );
  });

  it('menolak kata sandi salah tanpa membuat sesi dan mencatat kegagalan', async () => {
    const { service, repository, audit } = buatService({ akun: akunOf() });

    const hasil = await service.login({ username: 'budi', password: PASSWORD_SALAH }, KONTEKS);

    expect(hasil).toEqual({ kind: 'invalid' });
    expect(repository.createSession).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'login_failed', actorLabel: 'budi', actorId: null }),
    );
  });

  it('memerlukan verifikasi tiruan ketika username tidak ada', async () => {
    const { service, repository, audit } = buatService();

    const hasil = await service.login({ username: 'asing', password: PASSWORD }, KONTEKS);

    expect(hasil).toEqual({ kind: 'invalid' });
    expect(repository.findAccountByUsername).toHaveBeenCalledWith('asing');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'login_failed', actorLabel: 'asing' }),
    );
  });

  it('menolak akun nonaktif walau kata sandi benar', async () => {
    const { service, repository } = buatService({ akun: akunOf({ isActive: false }) });

    const hasil = await service.login({ username: 'budi', password: PASSWORD }, KONTEKS);

    expect(hasil).toEqual({ kind: 'invalid' });
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it('memblokir percobaan keenam setelah lima kegagalan', async () => {
    const { service } = buatService({ akun: akunOf() });

    for (let index = 0; index < 5; index += 1) {
      await service.login({ username: 'budi', password: PASSWORD_SALAH }, KONTEKS);
    }

    const hasil = await service.login({ username: 'budi', password: PASSWORD }, KONTEKS);

    expect(hasil.kind).toBe('throttled');

    if (hasil.kind === 'throttled') {
      expect(hasil.retryAfterSeconds).toBeGreaterThan(0);
    }
  });
});

describe('AuthService.resolveSession', () => {
  it('mengembalikan konteks sesi yang masih berlaku', async () => {
    const { service, repository } = buatService({ sesi: sesiOf() });

    const hasil = await service.resolveSession('token-uji');

    expect(hasil).toEqual({
      sessionId: SESSION_ID,
      userId: USER_ID,
      username: 'budi',
      displayName: 'Budi Santoso',
      role: 'admin',
      expiresAt: expect.any(String),
    });
    expect(repository.findSession).toHaveBeenCalledWith(hashSessionToken('token-uji'));
    expect(repository.renewSession).not.toHaveBeenCalled();
  });

  it('menolak sesi yang sudah kedaluwarsa', async () => {
    const { service } = buatService({ sesi: sesiOf({ expiresAt: waktu(-1_000) }) });

    await expect(service.resolveSession('token-uji')).resolves.toBeUndefined();
  });

  it('menolak sesi yang sudah dicabut', async () => {
    const { service } = buatService({ sesi: sesiOf({ revokedAt: waktu(-500) }) });

    await expect(service.resolveSession('token-uji')).resolves.toBeUndefined();
  });

  it('menolak sesi tanpa token yang dikenal', async () => {
    const { service } = buatService();

    await expect(service.resolveSession('token-uji')).resolves.toBeUndefined();
  });

  it('mencabut semua sesi ketika akun dinonaktifkan', async () => {
    const { service, repository } = buatService({ sesi: sesiOf({ isActive: false }) });

    await expect(service.resolveSession('token-uji')).resolves.toBeUndefined();
    expect(repository.revokeSessionsOfUser).toHaveBeenCalledWith(USER_ID, expect.any(String));
  });

  it('memperpanjang sesi yang hampir habis tanpa melewati batas dua kali masa berlaku', async () => {
    const { service, repository } = buatService({
      sesi: sesiOf({ createdAt: waktu(-JAM), expiresAt: waktu(JAM) }),
    });

    const hasil = await service.resolveSession('token-uji');

    expect(repository.renewSession).toHaveBeenCalledTimes(1);

    const panggilan = repository.renewSession.mock.calls[0] as [string, string];

    expect(panggilan[0]).toBe(SESSION_ID);
    expect(Date.parse(panggilan[1])).toBeGreaterThan(Date.now() + 11 * JAM);
    expect(hasil?.expiresAt).toBe(panggilan[1]);
  });
});

describe('AuthService.logout', () => {
  it('mencabut sesi aktif dan mencatat audit', async () => {
    const { service, repository, audit } = buatService();

    await service.logout(sesiKonteksOf(), KONTEKS);

    expect(repository.revokeSession).toHaveBeenCalledWith(SESSION_ID, expect.any(String));
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'logout', entityId: SESSION_ID, actorId: USER_ID }),
    );
  });
});