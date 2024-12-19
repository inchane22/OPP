import { DatabaseError } from 'pg';

// Define valid PostgreSQL error codes
export type PostgresErrorCode = 
  | '08006' // Connection failure
  | '08001' // Unable to establish connection
  | '08004' // Rejected connection
  | '57P01' // Admin shutdown
  | '57P02' // Crash shutdown
  | '57P03' // Cannot connect now
  | 'XX000'; // Internal error

// Pool configuration
export const POOL_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  MAX_SIZE: 20,
  IDLE_TIMEOUT: 30000,
  CONNECTION_TIMEOUT: 5000,
  RETRYABLE_ERROR_CODES: [
    '08006', '08001', '08004',
    '57P01', '57P02', '57P03',
    'XX000'
  ] as PostgresErrorCode[]
} as const;

// Custom error classes
export class DatabaseConnectionError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

export class DatabaseQueryError extends Error {
  constructor(
    message: string,
    public code?: string,
    public query?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseQueryError';
  }
}

// Type guard for DatabaseError
export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof Error && 'code' in error;
}
