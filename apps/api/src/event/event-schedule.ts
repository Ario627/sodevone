import { BadRequestException } from '@nestjs/common';
import { toIsoInstant } from '../common/text/instant.js';

const END_BEFORE_START = 'Waktu selesai tidak boleh lebih awal dari waktu mulai.';

export function isEventScheduleOrdered(startsAt: string, endsAt: string | null): boolean {
  return (
    endsAt === null || Date.parse(toIsoInstant(endsAt)) >= Date.parse(toIsoInstant(startsAt))
  );
}

export function assertEventSchedule(startsAt: string, endsAt: string | null): void {
  if (isEventScheduleOrdered(startsAt, endsAt)) {
    return;
  }

  throw new BadRequestException({
    code: 'VALIDATION_FAILED',
    message: END_BEFORE_START,
    fields: [{ path: 'endsAt', message: END_BEFORE_START }],
  });
}