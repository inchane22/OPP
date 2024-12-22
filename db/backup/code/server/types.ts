import type { Request } from 'express';
import type { User } from '../db/schema';

// Define LogData type for consistent logging across application
export interface LogData {
  [key: string]: any;
  timestamp?: string;
  environment?: string;
  error?: string;
  details?: Record<string, unknown>;
}

export interface AuthenticatedRequest extends Request {
  user: User;
  isAuthenticated(): this is AuthenticatedRequest;
}