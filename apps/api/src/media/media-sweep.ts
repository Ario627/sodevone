import { readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { storageKeysOf } from './image-keys.js';
import {
  isManagedDirectoryName,
  isManagedFileName,
  isSafeStorageKey,
} from './managed-file.js';

const SWEEPABLE_FILE = /\.webp$/;

export type SweepCandidate = { key: string; byteSize: number; modifiedAt: string };

export type SweepPlan = { orphans: SweepCandidate[]; byteSize: number; scanned: number };

export type SweepOptions = {
  root: string;
  keep: ReadonlySet<string>;
  graceMs: number;
  now: number;
};

async function namesIn(absolute: string): Promise<string[]> {
  try {
    return await readdir(absolute);
  } catch {
    return [];
  }
}

async function orphanOf(
  absolute: string,
  key: string,
  options: SweepOptions,
): Promise<SweepCandidate | undefined> {
  try {
    const info = await stat(absolute);

    if (!info.isFile() || info.size === 0 || options.now - info.mtimeMs < options.graceMs) {
      return undefined;
    }

    return { key, byteSize: info.size, modifiedAt: new Date(info.mtimeMs).toISOString() };
  } catch {
    return undefined;
  }
}

export async function planMediaSweep(options: SweepOptions): Promise<SweepPlan> {
  const root = path.resolve(options.root);
  const orphans: SweepCandidate[] = [];
  let scanned = 0;

  for (const directory of await namesIn(root)) {
    if (!isManagedDirectoryName(directory)) {
      continue;
    }

    const absoluteDirectory = path.join(root, directory);

    for (const name of await namesIn(absoluteDirectory)) {
      if (!SWEEPABLE_FILE.test(name) || !isManagedFileName(name)) {
        continue;
      }

      scanned += 1;

      const key = `${directory}/${name}`;

      if (options.keep.has(key)) {
        continue;
      }

      const candidate = await orphanOf(path.join(absoluteDirectory, name), key, options);

      if (candidate !== undefined) {
        orphans.push(candidate);
      }
    }
  }

  return {
    orphans,
    byteSize: orphans.reduce((total, orphan) => total + orphan.byteSize, 0),
    scanned,
  };
}

export function keptKeysOf(storageKeys: string[]): Set<string> {
  const keep = new Set<string>();

  for (const storageKey of storageKeys) {
    if (!isSafeStorageKey(storageKey)) {
      continue;
    }

    const keys = storageKeysOf(storageKey);

    keep.add(keys.master);
    keep.add(keys.medium);
    keep.add(keys.small);
  }

  return keep;
}

export async function removeSweptFiles(root: string, plan: SweepPlan): Promise<number> {
  const base = path.resolve(root);
  let removed = 0;

  for (const orphan of plan.orphans) {
    if (!isSafeStorageKey(orphan.key)) {
      continue;
    }

    try {
      await rm(path.join(base, orphan.key));
      removed += 1;
    } catch {
      continue;
    }
  }

  return removed;
}