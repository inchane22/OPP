
import { logger } from '../utils/logger';
import pg from 'pg';
import type { Pool, PoolConfig } from 'pg';
import { 
  DatabaseConnectionError,
  DatabaseQueryError,
  PostgresErrorCode,
  POOL_CONFIG,
  isDatabaseError,
  PostgresError
} from './types';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool | null = null;
  private retryCount = 0;
  private readonly maxRetries = 5;
  private readonly retryDelay = 5000;
  private isShuttingDown = false;

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  async getPool(): Promise<Pool> {
    if (!this.pool) {
      this.pool = await this.createPool();
    }
    return this.pool;
  }

  private async createPool(): Promise<Pool> {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const poolConfig = {
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
    };

    const pool = new pg.Pool(poolConfig);

    pool.on('error', (err: Error) => {
      if (!this.isShuttingDown) {
        logger('Unexpected error on idle client', { error: err.message });
        this.handlePoolError(err);
      }
    });

    try {
      await this.verifyConnection(pool);
      this.retryCount = 0;
      return pool;
    } catch (error) {
      await pool.end().catch(() => {});
      throw error;
    }
  }

  private async verifyConnection(pool: Pool): Promise<void> {
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        logger('Database connection verified');
      } finally {
        client.release();
      }
    } catch (error) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        logger('Retrying database connection', { 
          attempt: this.retryCount, 
          maxRetries: this.maxRetries,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode: isDatabaseError(error) ? error.code : undefined
        });
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.verifyConnection(pool);
      }
      throw new DatabaseConnectionError(
        `Failed to connect to database after ${this.maxRetries} attempts`,
        error instanceof Error ? error : undefined
      );
    }
  }

  private handlePoolError(error: Error): void {
    logger('Pool error occurred', { error: error.message });
    if (this.pool && !this.isShuttingDown) {
      this.pool.end().catch(err => {
        logger('Error while ending pool', { error: err.message });
      });
      this.pool = null;
    }
  }

  async cleanup(): Promise<void> {
    this.isShuttingDown = true;
    if (this.pool) {
      await this.pool.end().catch(() => {});
      this.pool = null;
    }
  }
}

export const db = DatabaseConnection.getInstance();
