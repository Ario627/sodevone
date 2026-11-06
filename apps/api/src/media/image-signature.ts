export type SniffedFormat = 'jpeg' | 'png' | 'webp';

type Signature = { offset: number; bytes: readonly number[] };

const JPEG: readonly Signature[] = [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }];

const PNG: readonly Signature[] = [
  { offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
];

const WEBP: readonly Signature[] = [
  { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
  { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
];

const SIGNATURE_READ_LENGTH = 16;

function matches(head: Uint8Array, signatures: readonly Signature[]): boolean {
  return signatures.every((signature) =>
    signature.bytes.every((byte, index) => head[signature.offset + index] === byte),
  );
}

export function sniffImageFormat(source: Uint8Array): SniffedFormat | undefined {
  const head = source.subarray(0, SIGNATURE_READ_LENGTH);

  if (head.length < SIGNATURE_READ_LENGTH) {
    return undefined;
  }

  if (matches(head, JPEG)) {
    return 'jpeg';
  }

  if (matches(head, PNG)) {
    return 'png';
  }

  if (matches(head, WEBP)) {
    return 'webp';
  }

  return undefined;
}