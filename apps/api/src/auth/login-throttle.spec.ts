import type { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import type { Env } from '../config/env.js';
import { LoginThrottle } from './login-throttle.js';

type Limits = {
  LOGIN_FAILURE_LIMIT: number;
  LOGIN_FAILURE_WINDOW_MINUTES: number;
  LOGIN_IP_FAILURE_LIMIT: number;
};

const BATAS: Limits = {
  LOGIN_FAILURE_LIMIT: 5,
  LOGIN_FAILURE_WINDOW_MINUTES: 15,
  LOGIN_IP_FAILURE_LIMIT: 30,
};

const MULAI = 1_700_000_000_000;

const JENDELA = 15 * 60 * 1000;

const IP = 'a'.repeat(64);

function throttleOf(overrides: Partial<Limits> = {}): LoginThrottle {
  const values = { ...BATAS, ...overrides };
  const config = {
    get: (key: keyof Limits) => values[key],
  } as unknown as ConfigService<Env, true>;

  return new LoginThrottle(config);
}

function gagal(throttle: LoginThrottle, jumlah: number, now = MULAI): void {
  for (let index = 0; index < jumlah; index += 1) {
    throttle.recordFailure('budi', IP, now);
  }
}

describe('LoginThrottle', () => {
  it('mengizinkan percobaan selama belum mencapai batas', () => {
    const throttle = throttleOf();
    gagal(throttle, 4);

    expect(throttle.check('budi', IP, MULAI)).toEqual({ blocked: false });
  });

  it('memblokir setelah batas kegagalan username tercapai', () => {
    const throttle = throttleOf();
    gagal(throttle, 5);

    const hasil = throttle.check('budi', IP, MULAI);

    expect(hasil.blocked).toBe(true);

    if (hasil.blocked) {
      expect(hasil.retryAfterSeconds).toBeGreaterThan(0);
      expect(hasil.retryAfterSeconds).toBeLessThanOrEqual(JENDELA / 1000);
    }
  });

  it('membuka blokir setelah jendela waktu habis', () => {
    const throttle = throttleOf();
    gagal(throttle, 5);

    expect(throttle.check('budi', IP, MULAI + JENDELA + 1)).toEqual({ blocked: false });
  });

  it('tidak menghukum pengguna lain dari IP yang sama', () => {
    const throttle = throttleOf();
    gagal(throttle, 5);

    expect(throttle.check('sari', IP, MULAI)).toEqual({ blocked: false });
  });

  it('memblokir seluruh IP setelah batas IP tercapai', () => {
    const throttle = throttleOf();

    for (let index = 0; index < BATAS.LOGIN_IP_FAILURE_LIMIT; index += 1) {
      throttle.recordFailure(`pengguna-${index}`, IP, MULAI);
    }

    const hasil = throttle.check('pengguna-baru', IP, MULAI);

    expect(hasil.blocked).toBe(true);
  });

  it('menghapus penghitung username setelah login berhasil', () => {
    const throttle = throttleOf();
    gagal(throttle, 5);
    throttle.clear('budi');

    expect(throttle.check('budi', IP, MULAI)).toEqual({ blocked: false });
  });

  it('memisahkan penghitung antar username', () => {
    const throttle = throttleOf();
    gagal(throttle, 5);

    const ipLain = 'b'.repeat(64);

    expect(throttle.check('budi', ipLain, MULAI).blocked).toBe(true);
    expect(throttle.check('sari', IP, MULAI).blocked).toBe(false);
  });

  it('mengabaikan penghitung IP ketika alamat tidak diketahui', () => {
    const throttle = throttleOf();

    for (let index = 0; index < BATAS.LOGIN_IP_FAILURE_LIMIT; index += 1) {
      throttle.recordFailure(`pengguna-${index}`, null, MULAI);
    }

    expect(throttle.check('pengguna-baru', null, MULAI).blocked).toBe(false);
  });
});