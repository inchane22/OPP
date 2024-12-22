import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// Export database types
export type * from './types';
export { DatabasePool } from './pool';
export { DatabaseConnectionError, DatabaseQueryError } from './types';