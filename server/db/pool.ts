import pg from 'pg';
import type { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

// Custom error types for better error handling
class DatabaseConnectionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

class DatabaseQueryError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly query?: string,
    public readonly params?: any[]
  ) {
    super(message);
    this.name = 'DatabaseQueryError';
  }
}

interface DatabaseError extends Error {
  code?: string;
  column?: string;
  constraint?: string;
  detail?: string;
  schema?: string;
  table?: string;
}

// Configuration constants
const POOL_CONFIG = {
  MAX_SIZE: 20,
  IDLE_TIMEOUT: 30000,
  CONNECTION_TIMEOUT: 5000,
  MAX_RETRIES: 5,
  RETRY_DELAY: 5000,
  // Error codes that warrant a retry
  RETRYABLE_ERROR_CODES: [
    '08006', // Connection failure
    '08001', // Unable to connect
    '08004', // Rejected connection
    '57P01', // Database shutdown
    '57P02', // Connection shutdown
    '57P03', // Cannot connect now
    'XX000'  // Internal error
  ]
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
      const isRetryable = POOL_CONFIG.RETRYABLE_ERROR_CODES.includes(pgError.code || '');
      
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
        const isRetryable = POOL_CONFIG.RETRYABLE_ERROR_CODES.includes(pgError.code || '');
        
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