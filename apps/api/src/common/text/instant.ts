const INSTANT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:?\d{2})?$/;

const OFFSET_DIGITS = 4;

const MINUTES_PER_DEGREE = 60;

function offsetMinutesOf(zone: string | undefined): number {
  if (zone === undefined || zone === 'Z') {
    return 0;
  }

  const digits = zone.slice(1).replace(':', '');

  if (digits.length !== OFFSET_DIGITS) {
    return 0;
  }

  const hours = Number.parseInt(digits.slice(0, 2), 10);
  const minutes = Number.parseInt(digits.slice(2), 10);

  return (zone.startsWith('-') ? -1 : 1) * (hours * MINUTES_PER_DEGREE + minutes);
}

function millisecondsOf(fraction: string | undefined): number {
  return fraction === undefined ? 0 : Number.parseInt(fraction.padEnd(3, '0').slice(0, 3), 10);
}

export function toIsoInstant(value: string): string {
  const match = INSTANT_PATTERN.exec(value.trim());

  if (match === null) {
    return new Date(value).toISOString();
  }

  const [, year, month, day, hour, minute, second, fraction, zone] = match;

  const epoch =
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      millisecondsOf(fraction),
    ) -
    offsetMinutesOf(zone) * MINUTES_PER_DEGREE * 1000;

  return new Date(epoch).toISOString();
}

export function toIsoInstantOrNull(value: string | null): string | null {
  return value === null ? null : toIsoInstant(value);
}