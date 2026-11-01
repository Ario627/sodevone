import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AdminRole, LoginRequest, SessionUser } from '@kelas/contracts';
import { AuditRepository } from '../audit/audit.repository.js';
import { toIsoInstant } from '../common/text/instant.js';
import type { Env } from '../config/env.js';
import { AuthRepository } from './auth.repository.js';
import type { AccountRow, SessionRow } from './auth.repository.js';
import { LoginThrottle } from './login-throttle.js';
import { consumeDummyVerification, verifyPassword } from './password.js';
import { createSessionToken, hashSessionToken } from './token.js';

export type SessionContext = {
  sessionId: string;
  userId: string;
  username: string;
  displayName: string;
  role: AdminRole;
  expiresAt: string;
};

export type LoginContext = {
  ipHash: string | null;
  userAgent: string | null;
  correlationId: string | null;
};

export type LoginOutcome =
  | { kind: 'ok'; token: string; expiresAt: string; user: SessionUser }
  | { kind: 'invalid' }
  | { kind: 'throttled'; retryAfterSeconds: number };

const MAX_ACTOR_LABEL_LENGTH = 120;

const MILLISECONDS_PER_HOUR = 3_600_000;

const SESSION_EXTENSION_FRACTION = 4;

function labelOf(username: string): string {
  return username.slice(0, MAX_ACTOR_LABEL_LENGTH);
}

function userOf(row: AccountRow): SessionUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    role: row.role as AdminRole,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly throttle: LoginThrottle,
    private readonly audit: AuditRepository,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private ttlMs(): number {
    return this.config.get('SESSION_TTL_HOURS', { infer: true }) * MILLISECONDS_PER_HOUR;
  }

  private instantOf(epochMs: number): string {
    return new Date(epochMs).toISOString();
  }

  private async recordFailure(
    username: string,
    context: LoginContext,
    now: number,
  ): Promise<void> {
    this.throttle.recordFailure(username, context.ipHash, now);

    await this.audit.record({
      actorId: null,
      actorLabel: labelOf(username),
      action: 'login_failed',
      entityType: 'session',
      entityId: null,
      ipHash: context.ipHash,
      correlationId: context.correlationId,
    });
  }

  private async extendSession(row: SessionRow, now: number): Promise<string> {
    const createdAt = Date.parse(toIsoInstant(row.createdAt));
    const current = Date.parse(toIsoInstant(row.expiresAt));
    const ttl = this.ttlMs();
    const ceiling = createdAt + ttl * 2;

    if (current - now > ttl / SESSION_EXTENSION_FRACTION || current >= ceiling) {
      return this.instantOf(current);
    }

    const next = Math.min(now + ttl, ceiling);
    await this.repository.renewSession(row.sessionId, this.instantOf(next));

    return this.instantOf(next);
  }

  async login(input: LoginRequest, context: LoginContext): Promise<LoginOutcome> {
    const now = Date.now();
    const verdict = this.throttle.check(input.username, context.ipHash, now);

    if (verdict.blocked) {
      return { kind: 'throttled', retryAfterSeconds: verdict.retryAfterSeconds };
    }

    const account = await this.repository.findAccountByUsername(input.username);

    if (account === undefined) {
      await consumeDummyVerification(input.password);
      await this.recordFailure(input.username, context, now);

      return { kind: 'invalid' };
    }

    const matches = await verifyPassword(account.passwordHash, input.password);

    if (!matches || !account.isActive) {
      await this.recordFailure(input.username, context, now);

      return { kind: 'invalid' };
    }

    const token = createSessionToken();
    const expiresAt = this.instantOf(now + this.ttlMs());

    await this.repository.createSession({
      userId: account.id,
      tokenHash: hashSessionToken(token),
      expiresAt,
      ipHash: context.ipHash,
      userAgent: context.userAgent,
    });
    await this.repository.markLogin(account.id, this.instantOf(now));
    await this.audit.record({
      actorId: account.id,
      actorLabel: account.username,
      action: 'login_success',
      entityType: 'session',
      entityId: null,
      ipHash: context.ipHash,
      correlationId: context.correlationId,
    });
    this.throttle.clear(input.username);

    return { kind: 'ok', token, expiresAt, user: userOf(account) };
  }

  async resolveSession(token: string): Promise<SessionContext | undefined> {
    const now = Date.now();
    const row = await this.repository.findSession(hashSessionToken(token));

    if (row === undefined || row.revokedAt !== null) {
      return undefined;
    }

    if (Date.parse(toIsoInstant(row.expiresAt)) <= now) {
      return undefined;
    }

    if (!row.isActive) {
      await this.repository.revokeSessionsOfUser(row.userId, this.instantOf(now));

      return undefined;
    }

    return {
      sessionId: row.sessionId,
      userId: row.userId,
      username: row.username,
      displayName: row.displayName,
      role: row.role as AdminRole,
      expiresAt: await this.extendSession(row, now),
    };
  }

  async logout(session: SessionContext, context: LoginContext): Promise<void> {
    await this.repository.revokeSession(session.sessionId, this.instantOf(Date.now()));

    await this.audit.record({
      actorId: session.userId,
      actorLabel: session.username,
      action: 'logout',
      entityType: 'session',
      entityId: session.sessionId,
      ipHash: context.ipHash,
      correlationId: context.correlationId,
    });
  }
}