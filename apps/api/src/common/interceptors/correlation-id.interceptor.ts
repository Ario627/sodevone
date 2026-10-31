import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { CorrelationIdSchema } from '@kelas/contracts';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { Observable } from 'rxjs';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  private static resolveId(incoming: unknown): string {
    if (typeof incoming !== 'string') {
      return randomUUID();
    }

    const parsed = CorrelationIdSchema.safeParse(incoming);

    return parsed.success ? parsed.data : randomUUID();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const correlationId = CorrelationIdInterceptor.resolveId(
      request.headers[CORRELATION_ID_HEADER],
    );

    request.headers[CORRELATION_ID_HEADER] = correlationId;
    response.setHeader(CORRELATION_ID_HEADER, correlationId);

    return next.handle();
  }
}
