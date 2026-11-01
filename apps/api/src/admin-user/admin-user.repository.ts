import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, ilike, or, sql } from 'drizzle-orm';
import { DatabaseService } from '../db/database.service.js';
import type { Executor } from '../db/executor.js';
import { adminUser } from '../db/schema/admin-user.js';

const ADMIN_GUARD_LOCK_KEY = 8_412_120;

const ACTIVE_ADMIN_ROLE = 'admin';

const LIKE_SPECIAL_CHARACTERS = /[%_\\]/g;

const LIKE_ESCAPE = '\\';

export type FindAdminUserPageInput = {
  page: number;
  perPage: number;
  role?: string;
  active?: boolean;
  search?: string;
};

export type AdminUserListRow = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

export type AdminUserPage = { rows: AdminUserListRow[]; total: number };

export type AdminUserPatch = {
  displayName?: string;
  role?: string;
  isActive?: boolean;
  updatedAt?: string;
};

const COLUMNS = {
  id: adminUser.id,
  username: adminUser.username,
  displayName: adminUser.displayName,
  role: adminUser.role,
  isActive: adminUser.isActive,
  createdAt: adminUser.createdAt,
  lastLoginAt: adminUser.lastLoginAt,
};

function likePatternOf(search: string): string {
  return `%${search.replace(LIKE_SPECIAL_CHARACTERS, `${LIKE_ESCAPE}$&`)}%`;
}

function searchConditionOf(search: string | undefined) {
  if (search === undefined) {
    return undefined;
  }

  const pattern = likePatternOf(search);

  return or(ilike(adminUser.username, pattern), ilike(adminUser.displayName, pattern));
}

@Injectable()
export class AdminUserRepository {
  constructor(private readonly database: DatabaseService) {}

  private conditionOf(input: FindAdminUserPageInput) {
    return and(
      input.role === undefined ? undefined : eq(adminUser.role, input.role),
      input.active === undefined ? undefined : eq(adminUser.isActive, input.active),
      searchConditionOf(input.search),
    );
  }

  async findPage(input: FindAdminUserPageInput): Promise<AdminUserPage> {
    const where = this.conditionOf(input);
    const offset = (input.page - 1) * input.perPage;

    const [rows, totals] = await Promise.all([
      this.database.db
        .select(COLUMNS)
        .from(adminUser)
        .where(where)
        .orderBy(asc(adminUser.username), asc(adminUser.id))
        .limit(input.perPage)
        .offset(offset),
      this.database.db.select({ value: count() }).from(adminUser).where(where),
    ]);

    return { rows, total: totals[0]?.value ?? 0 };
  }

  async findById(exec: Executor, id: string): Promise<AdminUserListRow | undefined> {
    const rows = await exec.select(COLUMNS).from(adminUser).where(eq(adminUser.id, id)).limit(1);

    return rows[0];
  }

  async lockAdminGuard(exec: Executor): Promise<void> {
    await exec.execute(sql`select pg_advisory_xact_lock(${ADMIN_GUARD_LOCK_KEY})`);
  }

  async countActiveAdmins(exec: Executor, excludingId: string): Promise<number> {
    const rows = await exec
      .select({ value: count() })
      .from(adminUser)
      .where(
        and(
          eq(adminUser.role, ACTIVE_ADMIN_ROLE),
          eq(adminUser.isActive, true),
          sql`${adminUser.id} <> ${excludingId}`,
        ),
      );

    return rows[0]?.value ?? 0;
  }

  async insert(
    exec: Executor,
    input: { username: string; displayName: string; passwordHash: string; role: string },
  ): Promise<{ id: string }> {
    const rows = await exec
      .insert(adminUser)
      .values(input)
      .returning({ id: adminUser.id });
    const row = rows[0];

    if (row === undefined) {
      throw new Error('Baris pengguna tidak dikembalikan setelah penyimpanan');
    }

    return row;
  }

  async update(exec: Executor, id: string, patch: AdminUserPatch): Promise<void> {
    await exec.update(adminUser).set(patch).where(eq(adminUser.id, id));
  }
}