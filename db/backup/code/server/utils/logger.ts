// Type-safe logging utility
import { type LogData } from '../types';

export function logger(message: string, data: LogData = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    message,
    ...data
  }));
}

// Re-export the LogData type for consumers
export type { LogData };