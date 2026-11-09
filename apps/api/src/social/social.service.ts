import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type SocialCollection,
  type SocialLinkAdmin,
  type SocialLinkAdminList,
  type SocialLinkCreate,
  type SocialLinkUpdate,
  type SocialListQuery,
  type SocialPlatform,
} from '@kelas/contracts';
import { AuditRepository } from '../audit/audit.repository.js';
import type { AuditEntryInput } from '../audit/audit.repository.js';
import type { SessionContext } from '../auth/auth.service.js';
import { collectionEtagOf } from '../common/http/collection-etag.js';
import type { RequestContext } from '../common/http/request-context.js';
import { DatabaseService } from '../db/database.service.js';
import type { Executor } from '../db/executor.js';
import type { SocialLinkInsert } from '../db/schema/social-link.js';
import { SocialRepository } from './social.repository.js';
import { isPlatformUrl } from './social-url.js';
import type { SocialAdminRow } from './social.repository.js';
import { toSocialAdmin, toSocialCollection } from './social.mapper.js';

const NOT_FOUND_MESSAGE = 'Tautan sosial tidak ditemukan.';

const HOST_MISMATCH_MESSAGE = 'Alamat tautan tidak sesuai platform yang dipilih.';

const IMAGE_REQUIRED_MESSAGE = 'Isi salah satu gambar: media lokal atau alamat gambar.';

const IMAGE_CONFLICT_MESSAGE = 'Pilih satu sumber gambar saja, bukan keduanya.';

const IMAGE_DIMENSIONS_MESSAGE = 'Alamat gambar memerlukan lebar dan tinggi.';

const IMAGE_MISSING_MESSAGE = 'Media lokal yang dipilih tidak ditemukan.';

type ImageChoice = { imageId: string | null; imageUrl: string | null };

function badRequest(message: string, path: string): BadRequestException {
  return new BadRequestException({
    code: 'VALIDATION_FAILED',
    message,
    fields: [{ path, message }],
  });
}

function assertPlatformUrl(platform: SocialPlatform, url: string): void {
  if (!isPlatformUrl(platform, url)) {
    throw badRequest(HOST_MISMATCH_MESSAGE, 'url');
  }
}

function imageChoiceOf(
  imageId: string | null | undefined,
  imageUrl: string | null | undefined,
): ImageChoice {
  const id = imageId ?? null;
  const url = imageUrl ?? null;

  if (id !== null && url !== null) {
    throw badRequest(IMAGE_CONFLICT_MESSAGE, 'imageUrl');
  }

  if (id === null && url === null) {
    throw badRequest(IMAGE_REQUIRED_MESSAGE, 'imageId');
  }

  return { imageId: id, imageUrl: url };
}

@Injectable()
export class SocialService {
  constructor(
    private readonly repository: SocialRepository,
    private readonly audit: AuditRepository,
    private readonly database: DatabaseService,
  ) {}

  private auditOf(
    actor: SessionContext,
    context: RequestContext,
    action: string,
    entityId: string,
  ): AuditEntryInput {
    return {
      actorId: actor.userId,
      actorLabel: actor.username,
      action,
      entityType: 'social',
      entityId,
      ipHash: context.ipHash,
      correlationId: context.correlationId,
    };
  }

  private async requireGalleryImage(exec: Executor, imageId: string): Promise<void> {
    const image = await this.repository.findGalleryImage(exec, imageId);

    if (image === undefined) {
      throw badRequest(IMAGE_MISSING_MESSAGE, 'imageId');
    }
  }

  private async requireLink(exec: Executor, id: string): Promise<SocialAdminRow> {
    const row = await this.repository.findById(exec, id);

    if (row === undefined) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: NOT_FOUND_MESSAGE });
    }

    return row;
  }

  async collection(
    query: SocialListQuery,
  ): Promise<{ items: SocialCollection['items']; etag: string }> {
    const [rows, latest] = await Promise.all([
      this.repository.findVisible(query.limit),
      this.repository.latestUpdatedAt(),
    ]);

    const items = toSocialCollection(rows);

    return { items, etag: collectionEtagOf(latest, items.length) };
  }

  async list(): Promise<SocialLinkAdminList> {
    return { items: (await this.repository.findMany()).map(toSocialAdmin) };
  }

  async create(
    input: SocialLinkCreate,
    actor: SessionContext,
    context: RequestContext,
  ): Promise<SocialLinkAdmin> {
    assertPlatformUrl(input.platform, input.url);

    const choice = imageChoiceOf(input.imageId, input.imageUrl);

    if (
      choice.imageUrl !== null &&
      (input.imageWidth === undefined || input.imageHeight === undefined)
    ) {
      throw badRequest(IMAGE_DIMENSIONS_MESSAGE, 'imageWidth');
    }

    if (choice.imageId !== null) {
      await this.requireGalleryImage(this.database.db, choice.imageId);
    }

    const createdId = await this.database.db.transaction(async (tx) => {
      const sortOrder = input.sortOrder ?? (await this.repository.nextSortOrder(tx));

      const values: SocialLinkInsert = {
        platform: input.platform,
        url: input.url,
        caption: input.caption ?? null,
        postedAt: input.postedAt ?? null,
        imageId: choice.imageId,
        imageUrl: choice.imageUrl,
        imageWidth: choice.imageUrl === null ? null : (input.imageWidth as number),
        imageHeight: choice.imageUrl === null ? null : (input.imageHeight as number),
        altText: input.altText ?? null,
        sortOrder,
        isVisible: input.isVisible ?? true,
        createdBy: actor.userId,
      };

      const created = await this.repository.insert(tx, values);

      await this.audit.recordWithin(tx, this.auditOf(actor, context, 'create', created.id));

      return created.id;
    });

    return toSocialAdmin(await this.requireLink(this.database.db, createdId));
  }

  async update(
    id: string,
    input: SocialLinkUpdate,
    actor: SessionContext,
    context: RequestContext,
  ): Promise<SocialLinkAdmin> {
    const current = await this.requireLink(this.database.db, id);

    const platform = (input.platform ?? current.platform) as SocialPlatform;
    const url = input.url ?? current.url;

    assertPlatformUrl(platform, url);

    const nextImageId = input.imageId === undefined ? current.imageId : input.imageId;
    const nextImageUrl = input.imageUrl === undefined ? current.imageUrl : input.imageUrl;

    const choice = imageChoiceOf(nextImageId, nextImageUrl);

    if (choice.imageUrl !== null) {
      const width = input.imageWidth ?? current.imageWidth;
      const height = input.imageHeight ?? current.imageHeight;

      if (width === null || height === null) {
        throw badRequest(IMAGE_DIMENSIONS_MESSAGE, 'imageWidth');
      }
    }

    if (choice.imageId !== null && choice.imageId !== current.imageId) {
      await this.requireGalleryImage(this.database.db, choice.imageId);
    }

    await this.database.db.transaction(async (tx) => {
      await this.repository.update(tx, id, {
        platform,
        url,
        ...(input.caption === undefined ? {} : { caption: input.caption }),
        ...(input.postedAt === undefined ? {} : { postedAt: input.postedAt }),
        imageId: choice.imageId,
        imageUrl: choice.imageUrl,
        imageWidth: choice.imageUrl === null ? null : (input.imageWidth ?? current.imageWidth),
        imageHeight: choice.imageUrl === null ? null : (input.imageHeight ?? current.imageHeight),
        ...(input.altText === undefined ? {} : { altText: input.altText }),
        ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
        ...(input.isVisible === undefined ? {} : { isVisible: input.isVisible }),
        updatedAt: new Date().toISOString(),
      });

      await this.audit.recordWithin(tx, this.auditOf(actor, context, 'update', id));
    });

    return toSocialAdmin(await this.requireLink(this.database.db, id));
  }

  async remove(
    id: string,
    actor: SessionContext,
    context: RequestContext,
  ): Promise<{ id: string }> {
    const removed = await this.database.db.transaction(async (tx) => {
      const deleted = await this.repository.remove(tx, id);

      if (deleted === undefined) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: NOT_FOUND_MESSAGE });
      }

      await this.audit.recordWithin(tx, this.auditOf(actor, context, 'delete', id));

      return deleted;
    });

    return removed;
  }
}
