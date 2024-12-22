import type { Request } from 'express';
import type { User } from '../db/schema';

// Define LogData type for consistent logging
export type LogData = Record<string, any>;

export interface AuthenticatedRequest extends Request {
  user: User;
  isAuthenticated(): this is AuthenticatedRequest;
}