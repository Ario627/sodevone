import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../db/database.service.js';
import type { Executor } from '../db/executor.js';
import { announcement } from '../db/schema/announcement.js';
import { announcementAttachment } from '../db/schema/announcement-attachment.js';
import type {
  AnnouncementAttachmentInsert,
  AnnouncementAttachmentRow,
} from '../db/schema/announcement-attachment.js';

const FIRST_SORT_ORDER = 0;

@Injectable()
export class AnnouncementAttachmentRepository {
  constructor(private readonly database: DatabaseService) {}

  async findMany(exec: Executor, announcementId: string): Promise<AnnouncementAttachmentRow[]> {
    return exec
      .select()
      .from(announcementAttachment)
      .where(eq(announcementAttachment.announcementId, announcementId))
      .orderBy(asc(announcementAttachment.sortOrder), asc(announcementAttachment.createdAt));
  }

  async findOne(
    exec: Executor,
    announcementId: string,
    attachmentId: string,
  ): Promise<AnnouncementAttachmentRow | undefined> {
    const rows = await exec
      .select()
      .from(announcementAttachment)
      .where(
        and(
          eq(announcementAttachment.announcementId, announcementId),
          eq(announcementAttachment.id, attachmentId),
        ),
      )
      .limit(1);

    return rows[0];
  }

  async announcementStatusOf(exec: Executor, announcementId: string): Promise<string | undefined> {
    const rows = await exec
      .select({ status: announcement.status })
      .from(announcement)
      .where(eq(announcement.id, announcementId))
      .limit(1);

    return rows[0]?.status;
  }

  async announcementBySlug(
    exec: Executor,
    slug: string,
  ): Promise<{ id: string; status: string } | undefined> {
    const rows = await exec
      .select({ id: announcement.id, status: announcement.status })
      .from(announcement)
      .where(eq(announcement.slug, slug))
      .limit(1);

    return rows[0];
  }

  async totalBytesOf(exec: Executor, announcementId: string): Promise<number> {
    const rows = await exec
      .select({ value: sql<number>`coalesce(sum(${announcementAttachment.byteSize}), 0)` })
      .from(announcementAttachment)
      .where(eq(announcementAttachment.announcementId, announcementId));

    return rows[0]?.value ?? 0;
  }

  async countOf(exec: Executor, announcementId: string): Promise<number> {
    const rows = await exec
      .select({ value: count() })
      .from(announcementAttachment)
      .where(eq(announcementAttachment.announcementId, announcementId));

    return rows[0]?.value ?? 0;
  }

  async nextSortOrder(exec: Executor, announcementId: string): Promise<number> {
    const rows = await exec
      .select({
        value: sql<number>`coalesce(max(${announcementAttachment.sortOrder}), -1) + 1`,
      })
      .from(announcementAttachment)
      .where(eq(announcementAttachment.announcementId, announcementId));

    return rows[0]?.value ?? FIRST_SORT_ORDER;
  }

  async insert(exec: Executor, values: AnnouncementAttachmentInsert): Promise<void> {
    await exec.insert(announcementAttachment).values(values);
  }

  async remove(
    exec: Executor,
    announcementId: string,
    attachmentId: string,
  ): Promise<AnnouncementAttachmentRow | undefined> {
    const rows = await exec
      .delete(announcementAttachment)
      .where(
        and(
          eq(announcementAttachment.announcementId, announcementId),
          eq(announcementAttachment.id, attachmentId),
        ),
      )
      .returning();

    return rows[0];
  }

  async applyOrder(exec: Executor, announcementId: string, ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const values = sql.join(
      ids.map((id, index) => sql`(${id}::uuid, ${index}::integer)`),
      sql`, `,
    );

    await exec.execute(sql`
      update ${announcementAttachment} as a
      set sort_order = v.position
      from (values ${values}) as v(id, position)
      where a.id = v.id and a.announcement_id = ${announcementId}
    `);
  }
}