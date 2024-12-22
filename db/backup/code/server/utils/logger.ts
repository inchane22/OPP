import { type LogData } from '../types';

/**
 * Type-safe logging utility for consistent logging across the application
 */
export function logger(message: string, data: Partial<LogData> = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    message,
    ...data
  }));
}

// Re-export the LogData type for consumers
export type { LogData };