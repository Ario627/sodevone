const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

const MANAGED_FILE = new RegExp(`^${UUID}(-sedang|-kecil)?\\.webp$`);

const MANAGED_DIRECTORY = new RegExp(`^${UUID}$`);

const UNSAFE_KEY_CHARACTERS = /[^a-z0-9/._-]/i;

const PARENT_SEGMENT = /(^|\/)\.\.(\/|$)/;

const MAX_STORAGE_KEY_LENGTH = 200;

export function isManagedFileName(name: string): boolean {
  return MANAGED_FILE.test(name);
}

export function isManagedDirectoryName(name: string): boolean {
  return MANAGED_DIRECTORY.test(name);
}


export function isSafeStorageKey(key: string): boolean {
    return (
        key.length > 0 &&
        key.length <= MAX_STORAGE_KEY_LENGTH &&
        !UNSAFE_KEY_CHARACTERS.test(key) &&
        !PARENT_SEGMENT.test(key)
    )
}