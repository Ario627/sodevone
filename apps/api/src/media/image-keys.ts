import type { ImageVariant } from '@kelas/contracts';

const EXTENSION_SEPARATOR = '.';

const VARIANT_SEPARATOR = '-';

const FALLBACK_EXTENSION = '.webp';

export type StorageKeys = { master: string; medium: string; small: string };

export function baseKeyOf(storageKey: string): string {
  const dot = storageKey.lastIndexOf(EXTENSION_SEPARATOR);

  return dot === -1 ? storageKey : storageKey.slice(0, dot);
}

export function extensionOf(storageKey: string): string {
  const dot = storageKey.lastIndexOf(EXTENSION_SEPARATOR);

  return dot === -1 ? FALLBACK_EXTENSION : storageKey.slice(dot);
}

export function variantKeyOf(storageKey: string, variant: ImageVariant): string {
  return `${baseKeyOf(storageKey)}${VARIANT_SEPARATOR}${variant}${extensionOf(storageKey)}`;
}

export function storageKeysOf(storageKey: string): StorageKeys {
  return {
    master: storageKey,
    medium: variantKeyOf(storageKey, 'sedang'),
    small: variantKeyOf(storageKey, 'kecil'),
  };
}