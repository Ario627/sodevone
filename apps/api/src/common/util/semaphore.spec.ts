import { describe, expect, it } from 'vitest';
import { Semaphore } from './semaphore.js';

const TICK_MS = 5;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('Semaphore', () => {
  it('tidak pernah menjalankan lebih dari batas secara bersamaan', async () => {
    const semaphore = new Semaphore(2);
    let active = 0;
    let peak = 0;

    const task = async (): Promise<void> => {
      active += 1;
      peak = Math.max(peak, active);
      await delay(TICK_MS);
      active -= 1;
    };

    await Promise.all(Array.from({ length: 8 }, () => semaphore.run(task)));

    expect(peak).toBe(2);
  });

  it('menjalankan seluruh tugas sampai selesai', async () => {
    const semaphore = new Semaphore(1);
    const hasil: number[] = [];

    await Promise.all(
      [1, 2, 3, 4, 5].map((value) =>
        semaphore.run(async () => {
          await delay(TICK_MS);
          hasil.push(value);
        }),
      ),
    );

    expect(hasil).toEqual([1, 2, 3, 4, 5]);
  });

  it('melepas izin ketika tugas gagal', async () => {
    const semaphore = new Semaphore(1);

    await expect(
      semaphore.run(async () => {
        throw new Error('gagal');
      }),
    ).rejects.toThrow('gagal');

    await expect(semaphore.run(async () => 'lolos')).resolves.toBe('lolos');
  });

  it('meneruskan nilai kembalian tugas', async () => {
    const semaphore = new Semaphore(2);

    await expect(semaphore.run(async () => 42)).resolves.toBe(42);
  });

  it('menjaga urutan masuk ketika kapasitas penuh', async () => {
    const semaphore = new Semaphore(1);
    const urutan: string[] = [];

    const pertama = semaphore.run(async () => {
      await delay(TICK_MS * 2);
      urutan.push('pertama');
    });
    const kedua = semaphore.run(async () => {
      urutan.push('kedua');
    });

    await Promise.all([pertama, kedua]);

    expect(urutan).toEqual(['pertama', 'kedua']);
  });
});
