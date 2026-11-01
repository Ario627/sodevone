import path from 'node:path';

export function resolveWithinRoot(root: string, storageKey: string): string | null {
  if (storageKey.length === 0 || storageKey.includes('\0')) {
    return null;
  }

  const absoluteRoot = path.resolve(root);

  const resolved = path.resolve(absoluteRoot, storageKey);

  const prefix = absoluteRoot.endsWith(path.sep) ? absoluteRoot : `${absoluteRoot}${path.sep}`;

  return resolved.startsWith(prefix) ? resolved : null;
}
