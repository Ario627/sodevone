import { integer, timestamp } from 'drizzle-orm/pg-core';

export const createdAtColumn = () =>
  timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow();

export const updatedAtColumn = () =>
  timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow();

export const versionColumn = () => integer('version').notNull().default(1);