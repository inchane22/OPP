import pg from 'pg';
import { DatabaseError as PgDatabaseError } from 'pg-protocol';

// Export PostgreSQL database error types
export { PgDatabaseError }; // Export the concrete class for value context
export type PostgresError = pg.DatabaseError;

// Valid PostgreSQL error codes
export type PostgresErrorCode = 
  | '08006' // Connection failure
  | '08001' // Unable to establish connection
  | '08004' // Rejected connection
  | '57P01' // Admin shutdown
  | '57P02' // Crash shutdown
  | '57P03' // Cannot connect now
  | 'XX000' // Internal error
  | '23505' // Unique violation
  | '23503' // Foreign key violation
  | '23502' // Not null violation
  | '23514'; // Check violation

// Pool configuration type
export type PoolConfig = {
  readonly MAX_RETRIES: number;
  readonly RETRY_DELAY: number;
  readonly MAX_SIZE: number;
  readonly IDLE_TIMEOUT: number;
  readonly CONNECTION_TIMEOUT: number;
  readonly RETRYABLE_ERROR_CODES: readonly PostgresErrorCode[];
};

// Pool configuration constant
export const POOL_CONFIG: Readonly<PoolConfig> = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  MAX_SIZE: 20,
  IDLE_TIMEOUT: 30000,
  CONNECTION_TIMEOUT: 5000,
  RETRYABLE_ERROR_CODES: [
    '08006', // Connection failure
    '08001', // Unable to establish connection
    '08004', // Rejected connection
    '57P01', // Admin shutdown
    '57P02', // Crash shutdown
    '57P03', // Cannot connect now
    'XX000', // Internal error
    '23505', // Unique violation
    '23503', // Foreign key violation
    '23502', // Not null violation
    '23514'  // Check violation
  ] as const
} as const;

// Custom error classes
export class DatabaseConnectionError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

export class DatabaseQueryError extends Error {
  public readonly code?: PostgresErrorCode;
  public readonly query?: string;
  public readonly originalError?: Error;

  constructor(
    message: string,
    errorCode?: string,
    query?: string,
    originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseQueryError';
    if (errorCode && POOL_CONFIG.RETRYABLE_ERROR_CODES.includes(errorCode as PostgresErrorCode)) {
      this.code = errorCode as PostgresErrorCode;
    }
    this.query = query;
    this.originalError = originalError;
  }

  isRetryableError(): boolean {
    return this.code !== undefined && POOL_CONFIG.RETRYABLE_ERROR_CODES.includes(this.code);
  }
}

// Type guard function - export as a value, not just a type
export function isDatabaseError(error: unknown): error is PgDatabaseError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    'severity' in error
  );
}

export function isDatabaseQueryError(error: unknown): error is DatabaseQueryError {
  return error instanceof DatabaseQueryError;
}