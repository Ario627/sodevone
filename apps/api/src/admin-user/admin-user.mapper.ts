import type { AdminRole, AdminUser, AdminUserListQuery, AdminUserPage, PaginationMeta } from '@kelas/contracts';
import { toIsoInstant, toIsoInstantOrNull } from '../common/text/instant.js';
import type { AdminUserListRow } from './admin-user.repository.js';

export function toAdminUser(row: AdminUserListRow): AdminUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    role: row.role as AdminRole,
    isActive: row.isActive,
    createdAt: toIsoInstant(row.createdAt),
    lastLoginAt: toIsoInstantOrNull(row.lastLoginAt),
  };
}

export function toAdminUserPage(
  rows: AdminUserListRow[],
  query: AdminUserListQuery,
  total: number,
): AdminUserPage {
  const meta: PaginationMeta = {
    page: query.page,
    perPage: query.perPage,
    total,
    totalPages: Math.ceil(total / query.perPage),
  };

  return { items: rows.map(toAdminUser), meta };
}