const WIB_OFFSET_HOURS = 7;

const MILLISECONDS_PER_HOUR = 3_600_000;

const MILLISECONDS_PER_DAY = 86_400_000;

const DAY_END_OFFSET_MS = MILLISECONDS_PER_DAY - 1;

const WIB_OFFSET_MS = WIB_OFFSET_HOURS * MILLISECONDS_PER_HOUR;

function utcMidnightOf(date: string): number {
  return Date.parse(`${date}T00:00:00.000Z`);
}

export function wibDayStartUtc(date: string): string {
  return new Date(utcMidnightOf(date) - WIB_OFFSET_MS).toISOString();
}

export function wibDayEndUtc(date: string): string {
  return new Date(utcMidnightOf(date) + DAY_END_OFFSET_MS - WIB_OFFSET_MS).toISOString();
}

export function isWibDateRangeValid(from: string, to: string): boolean {
  return from <= to;
}