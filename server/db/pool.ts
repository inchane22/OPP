import pg from 'pg';
import type { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

import { 
  DatabaseConnectionError,
  DatabaseQueryError,
  PostgresErrorCode,
  POOL_CONFIG,
  isDatabaseError
} from './types';

interface DatabaseError extends Error {
  code?: PostgresErrorCode;
  column?: string;
  constraint?: string;
  detail?: string;
  schema?: string;
  table?: string;
}

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
      if (!process.env.DATABASE_URL) {
        throw new DatabaseConnectionError('DATABASE_URL environment variable is not set');
      }

      const config: PoolConfig = {
        connectionString: process.env.DATABASE_URL,
        max: POOL_CONFIG.MAX_SIZE,
        idleTimeoutMillis: POOL_CONFIG.IDLE_TIMEOUT,
        connectionTimeoutMillis: POOL_CONFIG.CONNECTION_TIMEOUT,
        ssl: process.env.NODE_ENV === 'production' 
          ? { rejectUnauthorized: false } 
          : undefined
      };

      const pool = new pg.Pool(config);

      // Handle pool-level errors
      pool.on('error', (err: Error) => {
        logger('Unexpected error on idle client', { 
          error: err.message,
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
        this.handlePoolError(err);
      });

      // Handle connection errors
      pool.on('connect', (client) => {
        client.on('error', (err: Error) => {
          logger('Client connection error', {
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
          });
          this.handlePoolError(err);
        });
      });

      await this.verifyConnection(pool);
      
      // Set up periodic connection check
      setInterval(() => {
        this.checkConnection();
      }, POOL_CONFIG.IDLE_TIMEOUT / 2);
      
      return pool;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger('Failed to create pool', { error: errorMessage });
      throw error;
    }
  }

  private async checkConnection(): Promise<void> {
    try {
      const pool = await this.getPool();
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }
    } catch (error) {
      const pgError = error as DatabaseError;
      const isRetryable = pgError.code ? POOL_CONFIG.RETRYABLE_ERROR_CODES.includes(pgError.code as PostgresErrorCode) : false;
      
      logger('Connection check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: pgError.code,
        isRetryable,
        willRetry: isRetryable
      });

      if (isRetryable) {
        this.pool = null; // Force reconnection on next getPool() call
      } else {
        throw new DatabaseConnectionError('Database connection check failed', error as Error);
      }
    }
  }

  private async verifyConnection(pool: Pool): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= POOL_CONFIG.MAX_RETRIES; attempt++) {
      try {
        const client = await pool.connect();
        try {
          await client.query('SELECT 1');
          if (attempt > 1) {
            logger('Database connection recovered', { attempt });
          } else {
            logger('Database connection verified', { attempt });
          }
          return;
        } finally {
          client.release();
        }
      } catch (error) {
        lastError = error as Error;
        const pgError = error as DatabaseError;
        const isRetryable = pgError.code ? POOL_CONFIG.RETRYABLE_ERROR_CODES.includes(pgError.code as PostgresErrorCode) : false;
        
        logger('Connection verification failed', { 
          attempt,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode: pgError.code,
          isRetryable,
          maxAttempts: POOL_CONFIG.MAX_RETRIES,
          willRetry: attempt < POOL_CONFIG.MAX_RETRIES && isRetryable
        });
        
        if (!isRetryable) {
          throw new DatabaseConnectionError(
            `Database connection failed with non-retryable error: ${pgError.message}`,
            error as Error
          );
        }
        
        if (attempt === POOL_CONFIG.MAX_RETRIES) {
          throw new DatabaseConnectionError(
            `Failed to verify connection after ${POOL_CONFIG.MAX_RETRIES} attempts`,
            lastError
          );
        }
        
        const backoffDelay = POOL_CONFIG.RETRY_DELAY * Math.pow(1.5, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
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