import pg from 'pg';
import type { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

// Configuration constants
const POOL_CONFIG = {
  MAX_SIZE: 20,
  IDLE_TIMEOUT: 30000,
  CONNECTION_TIMEOUT: 5000,
  MAX_RETRIES: 5,
  RETRY_DELAY: 5000
} as const;

export class DatabasePool {
  private static instance: DatabasePool;
  private pool: Pool | null = null;

  private constructor() {}

  static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool();
    }
    return DatabasePool.instance;
  }

  async getPool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = await this.createPool();
    }
    return this.pool;
  }

  private async createPool(): Promise<Pool> {
    try {
      const config: PoolConfig = {
        connectionString: process.env.DATABASE_URL,
        max: POOL_CONFIG.MAX_SIZE,
        idleTimeoutMillis: POOL_CONFIG.IDLE_TIMEOUT,
        connectionTimeoutMillis: POOL_CONFIG.CONNECTION_TIMEOUT,
        ssl: process.env.NODE_ENV === 'production' 
          ? { 
              rejectUnauthorized: false
            } 
          : undefined
      };

      const pool = new pg.Pool(config);

      pool.on('error', (err: Error) => {
        logger('Unexpected error on idle client', { 
          error: err.message,
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
        this.handlePoolError(err);
      });

      await this.verifyConnection(pool);
      return pool;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger('Failed to create pool', { error: errorMessage });
      throw error;
    }
  }

  private async verifyConnection(pool: Pool): Promise<void> {
    for (let attempt = 1; attempt <= POOL_CONFIG.MAX_RETRIES; attempt++) {
      try {
        const client = await pool.connect();
        try {
          await client.query('SELECT 1');
          logger('Database connection verified', { attempt });
          return;
        } finally {
          client.release();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger('Connection verification failed', { 
          attempt,
          error: errorMessage,
          maxAttempts: POOL_CONFIG.MAX_RETRIES
        });
        
        if (attempt === POOL_CONFIG.MAX_RETRIES) {
          throw new Error(`Failed to verify connection after ${POOL_CONFIG.MAX_RETRIES} attempts`);
        }
        
        await new Promise(resolve => setTimeout(resolve, POOL_CONFIG.RETRY_DELAY));
      }
    }
  }

  private handlePoolError(error: Error): void {
    logger('Pool error occurred', { error: error.message });
    if (this.pool) {
      this.pool.end().catch(err => {
        logger('Error while ending pool', { error: err.message });
      });
      this.pool = null;
    }
  }

  async cleanup(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger('Database pool cleaned up');
    }
  }

  static async end(): Promise<void> {
    if (DatabasePool.instance) {
      await DatabasePool.instance.cleanup();
    }
  }
}

// Export singleton instance
export const db = DatabasePool.getInstance();
