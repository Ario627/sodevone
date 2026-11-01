import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DatabaseService } from '../db/database.service.js';
import type { Executor } from '../db/executor.js';
import { adminSession } from '../db/schema/admin-session.js';
import { adminUser } from '../db/schema/admin-user.js';

export type AccountRow = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  passwordHash: string;
  isActive: boolean;
};

export type SessionRow = {
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  userId: string;
  username: string;
  displayName: string;
  role: string;
  isActive: boolean;
};

export type CreateSessionInput = {
  userId: string;
  tokenHash: string;
  expiresAt: string;
  ipHash: string | null;
  userAgent: string | null;
};

const ACCOUNT_COLUMNS = {
  id: adminUser.id,
  username: adminUser.username,
  displayName: adminUser.displayName,
  role: adminUser.role,
  passwordHash: adminUser.passwordHash,
  isActive: adminUser.isActive,
};

@Injectable()
export class AuthRepository {
  constructor(private readonly database: DatabaseService) {}

  async findAccountByUsername(username: string): Promise<AccountRow | undefined> {
    const rows = await this.database.db
      .select(ACCOUNT_COLUMNS)
      .from(adminUser)
      .where(eq(adminUser.username, username))
      .limit(1);

    return rows[0];
  }

  async findSession(tokenHash: string): Promise<SessionRow | undefined> {
    const rows = await this.database.db
      .select({
        sessionId: adminSession.id,
        createdAt: adminSession.createdAt,
        expiresAt: adminSession.expiresAt,
        revokedAt: adminSession.revokedAt,
        userId: adminUser.id,
        username: adminUser.username,
        displayName: adminUser.displayName,
        role: adminUser.role,
        isActive: adminUser.isActive,
      })
      .from(adminSession)
      .innerJoin(adminUser, eq(adminUser.id, adminSession.userId))
      .where(eq(adminSession.tokenHash, tokenHash))
      .limit(1);

    return rows[0];
  }

  async createSession(input: CreateSessionInput): Promise<void> {
    await this.database.db.insert(adminSession).values(input);
  }

  async markLogin(userId: string, at: string): Promise<void> {
    await this.database.db
      .update(adminUser)
      .set({ lastLoginAt: at })
      .where(eq(adminUser.id, userId));
  }

  async renewSession(sessionId: string, expiresAt: string): Promise<void> {
    await this.database.db
      .update(adminSession)
      .set({ expiresAt })
      .where(eq(adminSession.id, sessionId));
  }

  async revokeSession(sessionId: string, at: string): Promise<void> {
    await this.database.db
      .update(adminSession)
      .set({ revokedAt: at })
      .where(eq(adminSession.id, sessionId));
  }

  async revokeSessionsOfUser(userId: string, at: string): Promise<void> {
    await this.revokeSessionsOfUserWithin(this.database.db, userId, at);
  }

  async revokeSessionsOfUserWithin(exec: Executor, userId: string, at: string): Promise<void> {
    await exec
      .update(adminSession)
      .set({ revokedAt: at })
      .where(and(eq(adminSession.userId, userId), isNull(adminSession.revokedAt)));
  }
}