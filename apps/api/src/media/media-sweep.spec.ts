import { mkdir, mkdtemp, rm, stat, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { keptKeysOf, planMediaSweep, removeSweptFiles } from './media-sweep.js';

const ALBUM = 'd7b9913b-3784-4c41-b8bb-35eeb74f1b87';

const OTHER_ALBUM = '11111111-1111-4111-8111-111111111111';

const KEPT = 'fda21022-5a3a-439a-b675-08bfaae93951';

const ORPHAN = '22222222-2222-4222-8222-222222222222';

const GRACE_MS = 60 * 60 * 1000;

const OLD_SECONDS = 1_000_000_000;

let root = '';

async function touch(directory: string, name: string, body = 'x'): Promise<string> {
  const absoluteDirectory = path.join(root, directory);

  await mkdir(absoluteDirectory, { recursive: true });

  const absolute = path.join(absoluteDirectory, name);

  await writeFile(absolute, body);

  return absolute;
}

async function backdate(absolute: string): Promise<void> {
  await utimes(absolute, OLD_SECONDS, OLD_SECONDS);
}

function options(keep: string[], now = Date.now()) {
  return { root, keep: new Set(keep), graceMs: GRACE_MS, now };
}

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'kelas-sweep-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('keptKeysOf', () => {
  it('menurunkan tiga kunci dari setiap storage_key', () => {
    const keep = keptKeysOf([`${ALBUM}/${KEPT}.webp`]);

    expect([...keep].sort()).toEqual(
      [
        `${ALBUM}/${KEPT}.webp`,
        `${ALBUM}/${KEPT}-sedang.webp`,
        `${ALBUM}/${KEPT}-kecil.webp`,
      ].sort(),
    );
  });

  it('melewati kunci yang tidak aman', () => {
    expect(keptKeysOf(['../../etc/passwd']).size).toBe(0);
  });
});

describe('planMediaSweep', () => {
  it('menandai berkas yang tidak punya baris basis data', async () => {
    await backdate(await touch(ALBUM, `${KEPT}.webp`, 'a'));
    await backdate(await touch(ALBUM, `${ORPHAN}.webp`, 'bb'));

    const plan = await planMediaSweep(options([`${ALBUM}/${KEPT}.webp`]));

    expect(plan.scanned).toBe(2);
    expect(plan.orphans.map((orphan) => orphan.key)).toEqual([`${ALBUM}/${ORPHAN}.webp`]);
    expect(plan.byteSize).toBe(2);
  });

  it('tidak menandai berkas yang baru ditulis meski belum ada di basis data', async () => {
    await touch(ALBUM, `${ORPHAN}.webp`);

    const plan = await planMediaSweep(options([]));

    expect(plan.orphans).toHaveLength(0);
  });

  it('mulai menandai setelah batas aman terlewati', async () => {
    const absolute = await touch(ALBUM, `${ORPHAN}.webp`);
    const info = await stat(absolute);

    const belum = await planMediaSweep(options([], info.mtimeMs + GRACE_MS - 1));
    const sudah = await planMediaSweep(options([], info.mtimeMs + GRACE_MS + 1));

    expect(belum.orphans).toHaveLength(0);
    expect(sudah.orphans).toHaveLength(1);
  });

  it('mengabaikan direktori yang bukan milik sistem', async () => {
    await backdate(await touch('catatan-penting', `${ORPHAN}.webp`));

    const plan = await planMediaSweep(options([]));

    expect(plan.orphans).toHaveLength(0);
    expect(plan.scanned).toBe(0);
  });

  it('mengabaikan berkas dengan nama di luar pola sistem', async () => {
    await backdate(await touch(ALBUM, 'rapor-budi.jpg'));
    await backdate(await touch(ALBUM, 'catatan.txt'));

    const plan = await planMediaSweep(options([]));

    expect(plan.orphans).toHaveLength(0);
  });

  it('mengabaikan berkas kosong', async () => {
    await backdate(await touch(ALBUM, `${ORPHAN}.webp`, ''));

    const plan = await planMediaSweep(options([]));

    expect(plan.orphans).toHaveLength(0);
  });

  it('memeriksa beberapa album sekaligus', async () => {
    await backdate(await touch(ALBUM, `${KEPT}.webp`, 'a'));
    await backdate(await touch(OTHER_ALBUM, `${ORPHAN}-kecil.webp`, 'b'));

    const plan = await planMediaSweep(options([`${ALBUM}/${KEPT}.webp`]));

    expect(plan.orphans.map((orphan) => orphan.key)).toEqual([
      `${OTHER_ALBUM}/${ORPHAN}-kecil.webp`,
    ]);
  });

  it('tidak melempar galat ketika akar penyimpanan belum ada', async () => {
    const plan = await planMediaSweep({
      root: path.join(root, 'belum-ada'),
      keep: new Set(),
      graceMs: GRACE_MS,
      now: Date.now(),
    });

    expect(plan).toEqual({ orphans: [], byteSize: 0, scanned: 0 });
  });
});

describe('removeSweptFiles', () => {
  it('menghapus hanya berkas yang ada di rencana', async () => {
    await backdate(await touch(ALBUM, `${KEPT}.webp`, 'a'));
    await backdate(await touch(ALBUM, `${ORPHAN}.webp`, 'b'));

    const plan = await planMediaSweep(options([`${ALBUM}/${KEPT}.webp`]));

    await expect(removeSweptFiles(root, plan)).resolves.toBe(1);
    await expect(stat(path.join(root, ALBUM, `${ORPHAN}.webp`))).rejects.toThrow();
    await expect(stat(path.join(root, ALBUM, `${KEPT}.webp`))).resolves.toBeDefined();
  });

  it('tidak gagal ketika berkas sudah dihapus lebih dulu', async () => {
    await backdate(await touch(ALBUM, `${ORPHAN}.webp`, 'b'));

    const plan = await planMediaSweep(options([]));

    await rm(path.join(root, ALBUM, `${ORPHAN}.webp`));

    await expect(removeSweptFiles(root, plan)).resolves.toBe(0);
  });

  it('menolak kunci yang keluar dari akar penyimpanan', async () => {
    await expect(
      removeSweptFiles(root, {
        orphans: [{ key: '../../etc/passwd', byteSize: 1, modifiedAt: '2020-01-01T00:00:00.000Z' }],
        byteSize: 1,
        scanned: 1,
      }),
    ).resolves.toBe(0);
  });
});
