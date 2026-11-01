import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgDatabase, PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import type * as schema from './schema/index.js';

type Relations = ExtractTablesWithRelations<typeof schema>;

export type Transaction = PgTransaction<PostgresJsQueryResultHKT, typeof schema, Relations>;

export type Executor = PgDatabase<PostgresJsQueryResultHKT, typeof schema, Relations>;