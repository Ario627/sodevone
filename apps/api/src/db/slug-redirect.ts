import { eq, sql } from 'drizzle-orm';
import { slugRedirect } from './schema/slug-redirect.js';
import type { Executor } from './executor.js';

export type SlugResourceType = 'announcement' | 'album' | 'event';

export async function recordSlugRedirect(
  exec: Executor,
  resourceType: SlugResourceType,
  oldSlug: string,
  resourceId: string,
): Promise<void> {
  await exec
    .insert(slugRedirect)
    .values({ oldSlug, resourceType, resourceId })
    .onConflictDoUpdate({
      target: slugRedirect.oldSlug,
      set: { resourceType, resourceId, createdAt: sql`now()` },
    });
}

export async function dropSlugRedirect(exec: Executor, slug: string): Promise<void> {
  await exec.delete(slugRedirect).where(eq(slugRedirect.oldSlug, slug));
}