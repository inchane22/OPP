import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { logger } from "../server/utils/logger";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

pool.on('error', (err) => {
  logger('Unexpected error on idle client', { error: err.message });
});

export const db = drizzle(pool, { schema });

// Verify database connection
pool.connect()
  .then(() => logger('Database connection verified'))
  .catch(err => {
    logger('Failed to connect to database', { error: err.message });
    process.exit(1);
  });
