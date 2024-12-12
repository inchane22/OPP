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
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set');
      }

      const config: PoolConfig = {
        connectionString: process.env.DATABASE_URL,
        max: POOL_CONFIG.MAX_SIZE,
        idleTimeoutMillis: POOL_CONFIG.IDLE_TIMEOUT,
        connectionTimeoutMillis: POOL_CONFIG.CONNECTION_TIMEOUT,
        ssl: process.env.NODE_ENV === 'production' 
          ? { rejectUnauthorized: false } 
          : undefined,
        application_name: 'PeruvianBitcoinApp',
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000
      };

      logger('Creating database pool', {
        max_connections: POOL_CONFIG.MAX_SIZE,
        idle_timeout: POOL_CONFIG.IDLE_TIMEOUT,
        connection_timeout: POOL_CONFIG.CONNECTION_TIMEOUT,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });

      const pool = new pg.Pool(config);

      // Handle pool-level errors
      pool.on('error', (err: Error) => {
        logger('Pool error occurred', { 
          error: err.message,
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
          timestamp: new Date().toISOString()
        });
        this.handlePoolError(err);
      });

      // Handle connection errors
      pool.on('connect', (client: pg.PoolClient) => {
        logger('New client connected to pool', {
          total_count: pool.totalCount,
          idle_count: pool.idleCount,
          waiting_count: pool.waitingCount,
          timestamp: new Date().toISOString()
        });

        client.on('error', (err: Error) => {
          logger('Client connection error', {
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
            timestamp: new Date().toISOString()
          });
        });
      });

      // Verify initial connection
      await this.verifyConnection(pool);
      
      logger('Pool created successfully', {
        timestamp: new Date().toISOString()
      });

      return pool;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger('Failed to create pool', { 
        error: errorMessage,
        stack: error instanceof Error && process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  private async verifyConnection(pool: Pool): Promise<void> {
    let lastError: Error | null = null;
    let client: pg.PoolClient | null = null;
    let healthCheckInterval: NodeJS.Timeout | null = null;
    
    const healthCheck = async (client: pg.PoolClient): Promise<void> => {
      try {
        await client.query('SELECT 1');
        logger('Health check passed', { timestamp: new Date().toISOString() });
      } catch (error) {
        logger('Health check failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    };

    const cleanupClient = async () => {
      try {
        if (client) {
          await Promise.race([
            client.release(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Release timeout')), 5000))
          ]);
          client = null;
        }
        if (healthCheckInterval) {
          if (healthCheckInterval) {
                  clearInterval(healthCheckInterval);
                }
          healthCheckInterval = null;
        }
      } catch (error) {
        logger('Error during client cleanup', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    };

    const cleanup = async () => {
      await cleanupClient();
      process.removeListener('SIGINT', cleanup);
      process.removeListener('SIGTERM', cleanup);
      process.removeListener('beforeExit', cleanup);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('beforeExit', cleanup);

    try {
      for (let attempt = 1; attempt <= POOL_CONFIG.MAX_RETRIES; attempt++) {
        try {
          // Connection attempt with timeout
          client = await Promise.race([
            pool.connect(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Connection timeout')), POOL_CONFIG.CONNECTION_TIMEOUT)
            )
          ]) as pg.PoolClient;

          client.on('error', async (err: Error) => {
            logger('Client error detected', {
              error: err.message,
              timestamp: new Date().toISOString()
            });
            await cleanup();
            this.handlePoolError(err);
          });

          // Initial health check
          await healthCheck(client);
          
          logger('Database connection verified', { 
            attempt,
            success: true,
            timestamp: new Date().toISOString()
          });

          // Setup periodic health checks with proper cleanup
          healthCheckInterval = setInterval(async () => {
            try {
              if (!client) {
                logger('Client missing during health check', {
                  timestamp: new Date().toISOString()
                });
                if (healthCheckInterval) {
                  clearInterval(healthCheckInterval);
                }
                return;
              }
              await healthCheck(client);
            } catch (error) {
              logger('Periodic health check failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
              });
              if (healthCheckInterval) {
                  clearInterval(healthCheckInterval);
                }
              await cleanup();
              this.handlePoolError(error instanceof Error ? error : new Error('Health check failed'));
            }
          }, POOL_CONFIG.IDLE_TIMEOUT / 2);

          // Successfully connected and verified
          return;

        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          const backoff = Math.min(POOL_CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1), 30000);
          
          logger('Connection verification failed', { 
            attempt,
            error: lastError.message,
            maxAttempts: POOL_CONFIG.MAX_RETRIES,
            nextRetryIn: backoff,
            remainingAttempts: POOL_CONFIG.MAX_RETRIES - attempt,
            timestamp: new Date().toISOString()
          });
          
          await cleanupClient();

          if (attempt === POOL_CONFIG.MAX_RETRIES) {
            logger('All connection attempts exhausted', {
              totalAttempts: POOL_CONFIG.MAX_RETRIES,
              finalError: lastError.message,
              timestamp: new Date().toISOString()
            });
            throw new Error(`Failed to verify connection after ${POOL_CONFIG.MAX_RETRIES} attempts: ${lastError.message}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
      }
    } finally {
      await cleanup();
    }
  }

  private async handlePoolError(error: Error): Promise<void> {
    const timestamp = new Date().toISOString();
    logger('Pool error occurred', { 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp
    });

    if (this.pool) {
      try {
        // Handle active clients gracefully
        const activeQueries = new Promise<void>((resolve) => {
          if (this.pool?.totalCount === this.pool?.idleCount) {
            resolve();
            return;
          }
          
          const timeout = setTimeout(() => {
            logger('Timeout waiting for active queries', { timestamp });
            resolve();
          }, 5000);

          this.pool?.on('release', () => {
            if (this.pool?.totalCount === this.pool?.idleCount) {
              clearTimeout(timeout);
              resolve();
            }
          });
        });

        // Wait for active queries or timeout
        await Promise.race([
          activeQueries,
          new Promise(resolve => setTimeout(resolve, 5000))
        ]);

        // Attempt graceful shutdown
        const forceTermination = new Promise<void>((resolve) => {
          setTimeout(() => {
            logger('Force terminating pool connections', { timestamp });
            this.pool?.end().catch(e => logger('Error in force termination', { 
              error: e instanceof Error ? e.message : 'Unknown error',
              timestamp 
            })).finally(resolve);
          }, 5000);
        });

        await Promise.race([
          this.pool.end(),
          forceTermination
        ]);

        logger('Pool terminated successfully', { timestamp });
      } catch (endError) {
        logger('Error while ending pool', { 
          error: endError instanceof Error ? endError.message : 'Unknown error',
          timestamp
        });
      } finally {
        this.pool = null;
      }
    }

    // Attempt to recreate the pool with exponential backoff
    let attempt = 0;
    const maxRecoveryAttempts = 3;
    const maxBackoff = 30000; // 30 seconds

    while (attempt < maxRecoveryAttempts) {
      try {
        const backoff = Math.min(1000 * Math.pow(2, attempt), maxBackoff);
        logger('Attempting to recover pool', { 
          attempt: attempt + 1, 
          backoff,
          timestamp 
        });

        await new Promise(resolve => setTimeout(resolve, backoff));

        // Create new pool with recovery-specific settings
        const recoveryPool = await this.createPool();
        
        // Verify the new pool works
        const client = await Promise.race([
          recoveryPool.connect(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Recovery connection timeout')), 5000)
          )
        ]) as pg.PoolClient;

        try {
          await client.query('SELECT 1');
          this.pool = recoveryPool;
          logger('Pool recovered successfully', { 
            attempt: attempt + 1,
            timestamp 
          });
          return;
        } finally {
          client.release();
        }
      } catch (recoveryError) {
        attempt++;
        logger('Pool recovery attempt failed', {
          attempt,
          remaining: maxRecoveryAttempts - attempt,
          error: recoveryError instanceof Error ? recoveryError.message : 'Unknown error',
          timestamp
        });

        if (attempt === maxRecoveryAttempts) {
          logger('Pool recovery failed after all attempts', {
            totalAttempts: maxRecoveryAttempts,
            timestamp
          });
          throw new Error(`Failed to recover database pool after ${maxRecoveryAttempts} attempts`);
        }
      }
    }
  }

  async cleanup(): Promise<void> {
    const timestamp = new Date().toISOString();
    
    if (this.pool) {
      logger('Starting pool cleanup', {
        total_connections: this.pool.totalCount,
        idle_connections: this.pool.idleCount,
        timestamp
      });

      try {
        // Give active queries a chance to complete
        const activeQueries = new Promise<void>((resolve) => {
          if (this.pool?.totalCount === this.pool?.idleCount) {
            resolve();
            return;
          }
          
          const timeout = setTimeout(() => {
            logger('Timeout waiting for active queries during cleanup', { timestamp });
            resolve();
          }, 5000);

          this.pool?.on('release', () => {
            if (this.pool?.totalCount === this.pool?.idleCount) {
              clearTimeout(timeout);
              resolve();
            }
          });
        });

        // Wait for active queries or timeout
        await Promise.race([
          activeQueries,
          new Promise(resolve => setTimeout(resolve, 5000))
        ]);

        // Attempt graceful shutdown with timeout
        await Promise.race([
          this.pool.end(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Pool end timeout during cleanup')), 5000)
          )
        ]);

        this.pool = null;
        logger('Database pool cleaned up successfully', { timestamp });
      } catch (error) {
        logger('Error during pool cleanup', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp
        });
        // Force cleanup in case of error
        this.pool = null;
        throw error;
      }
    }
  }

  static async end(): Promise<void> {
    if (DatabasePool.instance) {
      await DatabasePool.instance.cleanup();
      // @ts-ignore - Intentionally clearing singleton instance
      DatabasePool.instance = null;
    }
  }

  // Handle process termination
  static setupCleanup(): void {
    const cleanup = async () => {
      try {
        await DatabasePool.end();
      } catch (error) {
        logger('Error during pool cleanup on exit', {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      } finally {
        process.exit(0);
      }
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('beforeExit', cleanup);
  }
}

// Export singleton instance
export const db = DatabasePool.getInstance();
