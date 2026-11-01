import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';

type Bucket = { failures: number; resetAt: number };

type Limit = { maxFailures: number; windowMs: number };

type BucketKind = 'username' | 'ip';

export type ThrottleVerdict = { blocked: false } | { blocked: true; retryAfterSeconds: number };

const SWEEP_THRESHOLD = 5_000;

const MILLISECONDS_PER_MINUTE = 60_000;

const MILLISECONDS_PER_SECOND = 1_000;

function secondsUntil(now: number, resetAt: number): number {
  return Math.max(1, Math.ceil((resetAt - now) / MILLISECONDS_PER_SECOND));
}

function keyOf(kind: BucketKind, value: string): string {
  return `${kind}:${value}`;
}

function blockedFor(bucket: Bucket | undefined, limit: Limit, now: number): number | undefined {
  if (bucket === undefined || bucket.resetAt <= now) {
    return undefined;
  }

  return bucket.failures >= limit.maxFailures ? secondsUntil(now, bucket.resetAt) : undefined;
}

type RawConfig = { get(key: string): unknown };

@Injectable()
export class LoginThrottle {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly config: ConfigService<Env, true>) {}

  private numberEnv(key: string): number {
    const raw = this.config as unknown as RawConfig;

    return Number(raw.get(key));
  }

  private limitOf(kind: BucketKind): Limit {
    const windowMs = this.numberEnv('LOGIN_FAILURE_WINDOW_MINUTES') * MILLISECONDS_PER_MINUTE;

    return {
      maxFailures:
        kind === 'username'
          ? this.numberEnv('LOGIN_FAILURE_LIMIT')
          : this.numberEnv('LOGIN_IP_FAILURE_LIMIT'),
      windowMs,
    };
  }

  private bump(kind: BucketKind, value: string, now: number): void {
    const key = keyOf(kind, value);
    const current = this.buckets.get(key);
    const windowMs = this.limitOf(kind).windowMs;

    const next =
      current === undefined || current.resetAt <= now
        ? { failures: 1, resetAt: now + windowMs }
        : { failures: current.failures + 1, resetAt: current.resetAt };

    this.buckets.set(key, next);
  }

  private prune(now: number): void {
    if (this.buckets.size < SWEEP_THRESHOLD) {
      return;
    }

    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }

  check(username: string, ipHash: string | null, now = Date.now()): ThrottleVerdict {
    const usernameRetry = blockedFor(
      this.buckets.get(keyOf('username', username)),
      this.limitOf('username'),
      now,
    );

    const ipRetry =
      ipHash === null
        ? undefined
        : blockedFor(this.buckets.get(keyOf('ip', ipHash)), this.limitOf('ip'), now);

    const retryAfterSeconds = Math.max(usernameRetry ?? 0, ipRetry ?? 0);

    return retryAfterSeconds > 0 ? { blocked: true, retryAfterSeconds } : { blocked: false };
  }

  recordFailure(username: string, ipHash: string | null, now = Date.now()): void {
    this.bump('username', username, now);

    if (ipHash !== null) {
      this.bump('ip', ipHash, now);
    }

    this.prune(now);
  }

  clear(username: string): void {
    this.buckets.delete(keyOf('username', username));
  }
}