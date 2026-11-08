import type { ExecutionContext } from "@nestjs/common";
import { Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { ThrottlerLimitDetail, ThrottlerModuleOptions, ThrottlerStorage } from "@nestjs/throttler";
import { ThrottlerException, ThrottlerGuard, getOptionsToken, getStorageToken } from "@nestjs/throttler";
import type { Response } from 'express';

const MIN_RETRY_SECONDS = 1;

export function retryAfterSecondsOf(detail: ThrottlerLimitDetail): number {
    const blockedFor = detail.isBlocked ? detail.timeToBlockExpire : 0;
    const remaining = blockedFor > 0 ? blockedFor : detail.timeToExpire;

    return Math.max(MIN_RETRY_SECONDS, Math.ceil(remaining));
}

@Injectable()
export class ApiThrottlerGuard extends ThrottlerGuard {
  constructor(
    @Inject(getOptionsToken()) options: ThrottlerModuleOptions,
    @Inject(getStorageToken()) storage: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options, storage, reflector);
  }

  protected override async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    context
      .switchToHttp()
      .getResponse<Response>()
      .setHeader('Retry-After', String(retryAfterSecondsOf(detail)));

    throw new ThrottlerException();
  }
}