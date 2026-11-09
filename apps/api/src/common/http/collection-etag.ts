const ETAG_UNSAFE = /[^a-zA-Z0-9]/g;

const EMPTY_MARKER = 'kosong';

export function collectionEtagOf(latest: string | undefined, count: number): string {
    const stamp = (latest ?? EMPTY_MARKER).replace(ETAG_UNSAFE, '-');
    return `"${stamp}-${count}"`;
}