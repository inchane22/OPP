import pg from 'pg';
import type { Pool, PoolConfig as PgPoolConfig } from 'pg';
import { logger } from '../utils/logger';

import { 
  DatabaseConnectionError,
  DatabaseQueryError,
  PostgresErrorCode,
  POOL_CONFIG,
  isDatabaseError,
  PgDatabaseError,
  type PostgresError
} from './types';

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

      const config: PgPoolConfig = {
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
        const isDbError = isDatabaseError(err);
        logger('Unexpected error on idle client', { 
          error: err.message,
          errorCode: isDbError ? (err as PgDatabaseError).code : undefined,
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
        this.handlePoolError(err);
      });

      // Handle connection errors
      pool.on('connect', (client) => {
        client.on('error', (err: Error) => {
          const isDbError = isDatabaseError(err);
          logger('Client connection error', {
            error: err.message,
            errorCode: isDbError ? (err as PgDatabaseError).code : undefined,
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
      const isDbError = isDatabaseError(error);
      const pgError = isDbError ? error : new DatabaseQueryError(
        error instanceof Error ? error.message : 'Unknown error'
      );

      const isRetryable = isDbError && pgError.code ? 
        POOL_CONFIG.RETRYABLE_ERROR_CODES.includes(pgError.code as PostgresErrorCode) : 
        false;

      logger('Connection check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: isDbError ? pgError.code : undefined,
        isRetryable,
        willRetry: isRetryable
      });

      if (isRetryable) {
        this.pool = null; // Force reconnection on next getPool() call
      } else {
        throw new DatabaseConnectionError('Database connection check failed', error instanceof Error ? error : undefined);
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
        lastError = error instanceof Error ? error : new Error('Unknown error');
        const isDbError = isDatabaseError(error);
        const pgError = isDbError ? error : new DatabaseQueryError(
          error instanceof Error ? error.message : 'Unknown error'
        );

        const isRetryable = isDbError && pgError.code ? 
          POOL_CONFIG.RETRYABLE_ERROR_CODES.includes(pgError.code as PostgresErrorCode) : 
          false;

        logger('Connection verification failed', { 
          attempt,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode: isDbError ? pgError.code : undefined,
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
    const isDbError = isDatabaseError(error);
    logger('Pool error occurred', { 
      error: error.message,
      errorCode: isDbError ? (error as PgDatabaseError).code : undefined,
      severity: isDbError ? (error as PgDatabaseError).severity : undefined
    });
    if (this.pool) {
      this.pool.end().catch(err => {
        const endError = err instanceof Error ? err : new Error('Unknown error ending pool');
        logger('Error while ending pool', { 
          error: endError.message,
          stack: process.env.NODE_ENV === 'development' ? endError.stack : undefined
        });
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