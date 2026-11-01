import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { assessPassword } from './password-policy.js';

const SUBJECT = { username: 'budi', displayName: 'Budi Santoso' };

const KUAT = 'sepeda-lipat-berwarna-hijau';

const SUFFIX = createHash('sha1').update(KUAT, 'utf8').digest('hex').toUpperCase().slice(5);

const TIMEOUT_MS = 2_000;

afterEach(() => {
  vi.unstubAllGlobals();
});

async function assess(password: string, breachCheck: 'enabled' | 'disabled' = 'disabled') {
  return assessPassword(password, SUBJECT, breachCheck, TIMEOUT_MS);
}

describe('assessPassword', () => {
  it('menerima kata sandi panjang yang tidak memuat identitas', async () => {
    await expect(assess(KUAT)).resolves.toEqual({ ok: true });
  });

  it('menolak kata sandi lebih pendek dari batas minimum', async () => {
    const hasil = await assess('pendek');

    expect(hasil.ok).toBe(false);

    if (!hasil.ok) {
      expect(hasil.message).toContain('12');
    }
  });

  it('menolak kata sandi yang memuat nama pengguna', async () => {
    const hasil = await assess('budi-kelas-xi-pplg');

    expect(hasil.ok).toBe(false);

    if (!hasil.ok) {
      expect(hasil.message).toContain('nama pengguna');
    }
  });

  it('menolak kata sandi yang memuat nama tampilan tanpa spasi', async () => {
    const hasil = await assess('arisetia-budisantoso99');

    expect(hasil.ok).toBe(false);
  });

  it('tidak menolak ketika nama terlalu pendek untuk dibandingkan', async () => {
    const verdict = await assessPassword(
      'kata-sandi-yang-panjang',
      { username: 'ab', displayName: 'Ab' },
      'disabled',
      TIMEOUT_MS,
    );

    expect(verdict.ok).toBe(true);
  });

  it('menolak kata sandi yang muncul pada kebocoran publik', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(`${SUFFIX}:5`, { status: 200 })),
    );

    const verdict = await assessPassword(KUAT, SUBJECT, 'enabled', TIMEOUT_MS);

    expect(verdict.ok).toBe(false);

    if (!verdict.ok) {
      expect(verdict.message).toContain('kebocoran');
    }
  });

  it('meloloskan kata sandi ketika pemeriksaan kebocoran dimatikan', async () => {
    const spy = vi.fn();

    vi.stubGlobal('fetch', spy);

    await expect(assess(KUAT, 'disabled')).resolves.toEqual({ ok: true });
    expect(spy).not.toHaveBeenCalled();
  });

  it('tetap meloloskan ketika layanan pemeriksaan tidak terjangkau', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('offline'))),
    );

    await expect(assess(KUAT, 'enabled')).resolves.toEqual({ ok: true });
  });
});
