import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pg from "pg";
const { Pool } = pg;
import * as schema from "./schema";
import { logger } from "../server/utils/logger";

// Database configuration constants
const DB_CONFIG = {
  MAX_POOL_SIZE: 20,
  IDLE_TIMEOUT_MS: 30000,
  CONNECTION_TIMEOUT_MS: 5000,
  MAX_RETRIES: 5,
  RETRY_DELAY_MS: 5000,
  SSL_CONFIG: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false }
    : undefined
} as const;

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Please check your environment variables.");
}

// Create pool configuration
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: DB_CONFIG.MAX_POOL_SIZE,
  idleTimeoutMillis: DB_CONFIG.IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: DB_CONFIG.CONNECTION_TIMEOUT_MS,
  ssl: DB_CONFIG.SSL_CONFIG
};

// Create a single pool instance
const pool = new Pool(poolConfig);

// Enhanced error handling for the pool
pool.on('error', (err) => {
  logger('Database pool error', { 
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    poolConfig: {
      ...poolConfig,
      connectionString: '[REDACTED]'
    }
  });
});

// Verify database connection with retries
async function verifyConnection(): Promise<void> {
  for (let attempt = 1; attempt <= DB_CONFIG.MAX_RETRIES; attempt++) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT 
            current_database() as database,
            current_user as user,
            version() as version,
            (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections
        `);
        
        logger('Database connection verified', { 
          attempt,
          database: result.rows[0].database,
          user: result.rows[0].user,
          version: result.rows[0].version,
          activeConnections: result.rows[0].active_connections
        });
        return;
      } finally {
        client.release();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger('Connection verification failed', { 
        attempt,
        error: errorMessage,
        maxAttempts: DB_CONFIG.MAX_RETRIES
      });
      
      if (attempt === DB_CONFIG.MAX_RETRIES) {
        throw new Error(`Failed to verify connection after ${DB_CONFIG.MAX_RETRIES} attempts: ${errorMessage}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, DB_CONFIG.RETRY_DELAY_MS));
    }
  }
}

// Initialize connection
verifyConnection()
  .then(() => logger('Database initialized successfully'))
  .catch(err => {
    logger('Failed to initialize database', { 
      error: err instanceof Error ? err.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    process.exit(1);
  });

// Export the drizzle instance and sql template tag
export const db = drizzle(pool, { schema });
export { sql } from 'drizzle-orm';

// Cleanup function for graceful shutdown
export async function cleanup(): Promise<void> {
  logger('Cleaning up database connections...');
  await pool.end();
  logger('Database pool cleaned up');
}
