const UNIQUE_VIOLATION = '23505';

type Coded = { code?: unknown; cause?: unknown };

function codeOf(value: unknown): unknown {
  return typeof value === 'object' && value !== null ? (value as Coded).code : undefined;
}

function causeOf(value: unknown): unknown {
  return typeof value === 'object' && value !== null ? (value as Coded).cause : undefined;
}

export function isUniqueViolation(error: unknown): boolean {
  if (codeOf(error) === UNIQUE_VIOLATION) {
    return true;
  }

  return codeOf(causeOf(error)) === UNIQUE_VIOLATION;
}