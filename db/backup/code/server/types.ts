import type { Request } from 'express';
import type { User } from '../db/schema';

export interface AuthenticatedRequest extends Request {
  user: User;
  isAuthenticated(): this is AuthenticatedRequest;
}
