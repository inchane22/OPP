import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { logger } from "../server/utils/logger";
import { DatabasePool } from '../server/db/pool';

// Initialize database connection
const initDb = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
    }

    // Get database pool instance and initialize it
    const dbPool = DatabasePool.getInstance();
    const pool = await dbPool.getPool();
    
    // Create drizzle instance
    const db = drizzle(pool, { schema });
    
    logger('Database initialized successfully', {
      timestamp: new Date().toISOString()
    });

    // Setup cleanup handlers
    DatabasePool.setupCleanup();
    
    return db;
  } catch (error) {
    logger('Failed to initialize database', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

// Initialize and export the database instance
const db = await initDb();
export { db };
export default db;
