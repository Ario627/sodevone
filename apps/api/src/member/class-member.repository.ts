import { Injectable } from '@nestjs/common';
import { asc, count, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../db/database.service.js';
import type { Executor } from '../db/executor.js';
import { classMember } from '../db/schema/class-member.js';
import type { ClassMemberInsert, ClassMemberRow } from '../db/schema/class-member.js';

export type MemberFingerprint = { count: number; latest: string | undefined };

@Injectable()
export class ClassMemberRepository {
  constructor(private readonly database: DatabaseService) {}

  async findPublished(): Promise<ClassMemberRow[]> {
    return this.database.db
      .select()
      .from(classMember)
      .where(eq(classMember.isPublished, true))
      .orderBy(asc(classMember.sortOrder), asc(classMember.createdAt), asc(classMember.id));
  }

  async findMany(): Promise<ClassMemberRow[]> {
    return this.database.db
      .select()
      .from(classMember)
      .orderBy(asc(classMember.sortOrder), asc(classMember.createdAt), asc(classMember.id));
  }

  async fingerprint(): Promise<MemberFingerprint> {
    const rows = await this.database.db
      .select({
        total: count(),
        latest: sql<string | null>`max(${classMember.updatedAt})`,
      })
      .from(classMember)
      .where(eq(classMember.isPublished, true));

    const row = rows[0];

    return { count: row?.total ?? 0, latest: row?.latest ?? undefined };
  }

  async replaceAll(exec: Executor, rows: ClassMemberInsert[]): Promise<void> {
    await exec.delete(classMember);

    if (rows.length === 0) {
      return;
    }

    await exec.insert(classMember).values(rows);
  }
}