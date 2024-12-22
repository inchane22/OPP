import type { Request } from 'express';
import type { User } from '@backup/db/schema';
import type { PostgresErrorCode } from '@backup/db/types';

// Database error interface
export interface DatabaseError extends Error {
  code?: PostgresErrorCode;
  query?: string;
  isRetryableError(): boolean;
}

export interface AuthenticatedRequest extends Request {
  user: User;
  isAuthenticated(): this is AuthenticatedRequest;
}