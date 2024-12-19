import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { DatabasePool } from "../server/db/pool";
import { logger } from "../server/utils/logger";

const dbPool = DatabasePool.getInstance();

// Initialize the database connection
const initializeDb = async () => {
  try {
    const pool = await dbPool.getPool();
    return drizzle(pool, { schema });
  } catch (error) {
    logger('Failed to initialize database', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

// Export a promise that resolves to the database instance
export const db = await initializeDb();
