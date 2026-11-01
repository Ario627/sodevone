import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkBreached } from './breached-password.js';

const TIMEOUT_MS = 2_000;

const PASSWORD = 'kata-sandi-uji-yang-panjang';

const HASH = createHash('sha1').update(PASSWORD, 'utf8').digest('hex').toUpperCase();

const PREFIX = HASH.slice(0, 5);

const SUFFIX = HASH.slice(5);

type FetchStub = (input: string, init?: RequestInit) => Promise<Response>;

function stubFetch(handler: FetchStub): ReturnType<typeof vi.fn> {
  const spy = vi.fn(handler);
  vi.stubGlobal('fetch', spy);

  return spy;
}

function rangeResponse(body: string, ok = true): Promise<Response> {
  return Promise.resolve(new Response(body, { status: ok ? 200 : 500 }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('checkBreached', () => {
  it('meminta hanya lima karakter pertama hash dan mengaktifkan padding', async () => {
    const spy = stubFetch(async () => rangeResponse(`${SUFFIX}:0`));

    await checkBreached(PASSWORD, TIMEOUT_MS);

    const [url, init] = spy.mock.calls[0] ?? [];

    expect(String(url)).toBe(`https://api.pwnedpasswords.com/range/${PREFIX}`);
    expect((init as RequestInit).headers).toEqual({ 'Add-Padding': 'true' });
  });

  it('melaporkan breached ketika akhiran cocok dengan jumlah di atas nol', async () => {
    stubFetch(async () => rangeResponse(`${SUFFIX}:42\r\nFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:3`));

    await expect(checkBreached(PASSWORD, TIMEOUT_MS)).resolves.toBe('breached');
  });

  it('mengabaikan akhiran dengan jumlah nol dari baris padding', async () => {
    stubFetch(async () => rangeResponse(`${SUFFIX}:0\r\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:9`));

    await expect(checkBreached(PASSWORD, TIMEOUT_MS)).resolves.toBe('clean');
  });

  it('melaporkan clean ketika akhiran tidak ada di respons', async () => {
    stubFetch(async () => rangeResponse('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:5'));

    await expect(checkBreached(PASSWORD, TIMEOUT_MS)).resolves.toBe('clean');
  });

  it('melaporkan unavailable ketika layanan menjawab galat', async () => {
    stubFetch(async () => rangeResponse('', false));

    await expect(checkBreached(PASSWORD, TIMEOUT_MS)).resolves.toBe('unavailable');
  });

  it('melaporkan unavailable ketika jaringan gagal', async () => {
    stubFetch(async () => Promise.reject(new Error('offline')));

    await expect(checkBreached(PASSWORD, TIMEOUT_MS)).resolves.toBe('unavailable');
  });

  it('mencocokkan akhiran tanpa membedakan huruf besar kecil', async () => {
    stubFetch(async () => rangeResponse(`${SUFFIX.toLowerCase()}:7`));

    await expect(checkBreached(PASSWORD, TIMEOUT_MS)).resolves.toBe('breached');
  });
});
