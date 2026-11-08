import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AdminRole,
  AdminUser,
  AdminUserCreate,
  AdminUserListQuery,
  AdminUserPage,
  AdminUserUpdate,
} from '@kelas/contracts';
import { AuditRepository } from '../audit/audit.repository.js';
import type { AuditEntryInput } from '../audit/audit.repository.js';
import { AuthRepository } from '../auth/auth.repository.js';
import type { SessionContext } from '../auth/auth.service.js';
import { hashPassword } from '../auth/password.js';
import { assessPassword } from '../auth/password-policy.js';
import type { RequestContext } from '../common/http/request-context.js';
import type { Env } from '../config/env.js';
import { DatabaseService } from '../db/database.service.js';
import type { Executor } from '../db/executor.js';
import { isUniqueViolation } from '../db/pg-error.js';
import { AdminUserRepository } from './admin-user.repository.js';
import type { AdminUserListRow, AdminUserPatch } from './admin-user.repository.js';
import { toAdminUser, toAdminUserPage } from './admin-user.mapper.js';

const ADMIN_ROLE: AdminRole = 'admin';

const NOT_FOUND_MESSAGE = 'Akun tidak ditemukan.';

const USERNAME_TAKEN_MESSAGE = 'Nama pengguna sudah dipakai. Pilih nama lain.';

const SELF_DEACTIVATE_MESSAGE = 'Anda tidak dapat menonaktifkan akun sendiri.';

const SELF_DEMOTE_MESSAGE = 'Anda tidak dapat menurunkan peran akun sendiri.';

const LAST_ADMIN_MESSAGE = 'Harus tersisa minimal satu administrator aktif.';

const PASSWORD_REJECTED_MESSAGE = 'Kata sandi belum memenuhi syarat.';

function selfViolationOf(
  current: AdminUserListRow,
  input: AdminUserUpdate,
  actor: SessionContext,
): string | undefined {
  if (current.id !== actor.userId) {
    return undefined;
  }

  if (input.isActive === false) {
    return SELF_DEACTIVATE_MESSAGE;
  }

  if (input.role !== undefined && input.role !== ADMIN_ROLE) {
    return SELF_DEMOTE_MESSAGE;
  }

  return undefined;
}

function needsAdminGuard(current: AdminUserListRow, input: AdminUserUpdate): boolean {
  if (!current.isActive || current.role !== ADMIN_ROLE) {
    return false;
  }

  const demoting = input.role !== undefined && input.role !== ADMIN_ROLE;

  return demoting || input.isActive === false;
}

function patchOf(input: AdminUserUpdate, now: string): AdminUserPatch {
  return {
    ...(input.displayName === undefined ? {} : { displayName: input.displayName }),
    ...(input.role === undefined ? {} : { role: input.role }),
    ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
    updatedAt: now,
  };
}

@Injectable()
export class AdminUserService {
  constructor(
    private readonly repository: AdminUserRepository,
    private readonly auth: AuthRepository,
    private readonly audit: AuditRepository,
    private readonly database: DatabaseService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private auditOf(
    actor: SessionContext,
    context: RequestContext,
    action: string,
    entityId: string,
    entityType: 'user' | 'session' = 'user',
  ): AuditEntryInput {
    return {
      actorId: actor.userId,
      actorLabel: actor.username,
      action,
      entityType,
      entityId,
      ipHash: context.ipHash,
      correlationId: context.correlationId,
    };
  }

  private async requireUser(exec: Executor, id: string): Promise<AdminUserListRow> {
    const row = await this.repository.findById(exec, id);

    if (row === undefined) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: NOT_FOUND_MESSAGE });
    }

    return row;
  }

  async list(query: AdminUserListQuery): Promise<AdminUserPage> {
    const { rows, total } = await this.repository.findPage({
      page: query.page,
      perPage: query.perPage,
      role: query.role,
      active: query.aktif,
      search: query.q,
    });

    return toAdminUserPage(rows, query, total);
  }

  async create(
    input: AdminUserCreate,
    actor: SessionContext,
    context: RequestContext,
  ): Promise<AdminUser> {
    const verdict = await assessPassword(
      input.password,
      { username: input.username, displayName: input.displayName },
      this.config.get('PASSWORD_BREACH_CHECK', { infer: true }),
      this.config.get('PASSWORD_BREACH_TIMEOUT_MS', { infer: true }),
    );

    if (!verdict.ok) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: PASSWORD_REJECTED_MESSAGE,
        fields: [{ path: 'password', message: verdict.message }],
      });
    }

    const passwordHash = await hashPassword(input.password);
    let createdId: string;

    try {
      createdId = await this.database.db.transaction(async (tx) => {
        const row = await this.repository.insert(tx, {
          username: input.username,
          displayName: input.displayName,
          passwordHash,
          role: input.role,
        });

        await this.audit.recordWithin(tx, this.auditOf(actor, context, 'user_created', row.id));

        return row.id;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({ code: 'CONFLICT', message: USERNAME_TAKEN_MESSAGE });
      }

      throw error;
    }

    return toAdminUser(await this.requireUser(this.database.db, createdId));
  }

  async update(
    id: string,
    input: AdminUserUpdate,
    actor: SessionContext,
    context: RequestContext,
  ): Promise<AdminUser> {
    const current = await this.requireUser(this.database.db, id);
    const violation = selfViolationOf(current, input, actor);

    if (violation !== undefined) {
      throw new ConflictException({ code: 'CONFLICT', message: violation });
    }

    const now = new Date().toISOString();
    const deactivating = input.isActive === false && current.isActive;
    const action = deactivating ? 'user_deactivated' : 'update';

    await this.database.db.transaction(async (tx) => {
      if (needsAdminGuard(current, input)) {
        await this.repository.lockAdminGuard(tx);

        const remaining = await this.repository.countActiveAdmins(tx, id);

        if (remaining === 0) {
          throw new ConflictException({ code: 'CONFLICT', message: LAST_ADMIN_MESSAGE });
        }
      }

      await this.repository.update(tx, id, patchOf(input, now));

      if (deactivating) {
        await this.auth.revokeSessionsOfUserWithin(tx, id, now);
        await this.audit.recordWithin(
          tx,
          this.auditOf(actor, context, 'session_revoked', id, 'session'),
        );
      }

      await this.audit.recordWithin(tx, this.auditOf(actor, context, action, id));
    });

    return toAdminUser(await this.requireUser(this.database.db, id));
  }
}
