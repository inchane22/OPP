import type { Pool, PoolConfig, PoolClient } from 'pg';
import { logger } from '../utils/logger';

// Type guard for Pool instance
function isPool(pool: any): pool is Pool {
  return pool && typeof pool === 'object' && 'connect' in pool;
}

// Singleton pool loader with proper ESM/CommonJS handling
const loadPgPool = async (): Promise<typeof Pool> => {
  try {
    const pg = await import('pg');
    return (pg.default || pg).Pool;
  } catch (error) {
    logger('Failed to load pg module', { error: (error as Error).message });
    throw new Error('Failed to initialize database module');
  }
};

export class DatabasePool {
  private static instance: DatabasePool;
  private pool: Pool | null = null;
  private retryCount = 0;
  private readonly maxRetries = 5;
  private readonly retryDelay = 5000;
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
      const poolConfig: PoolConfig = {
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
      };

      const PgPool = await loadPgPool();
      const pool = new PgPool(poolConfig);

      if (!isPool(pool)) {
        throw new Error('Failed to create valid pool instance');
      }

      pool.on('error', (err: Error) => {
        logger('Unexpected error on idle client', { 
          error: err.message,
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
        this.handlePoolError(err);
      });

      // Verify connection immediately
      await this.verifyConnection(pool);

    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        logger('Database connection verified');
        this.retryCount = 0;
      } finally {
        client.release();
      }
    } catch (error) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        logger(`Retrying database connection`, { attempt: this.retryCount, maxRetries: this.maxRetries });
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.createPool();
      }
      throw new Error(`Failed to connect to database after ${this.maxRetries} attempts`);
    }

    return pool;
  }

  async cleanup(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  static async end(): Promise<void> {
    if (DatabasePool.instance) {
      await DatabasePool.instance.cleanup();
    }
  }
}
