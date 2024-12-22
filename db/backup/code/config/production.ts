import express from "express";
import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { ParsedQs } from "qs";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

// Import database configuration and types
import { DatabasePool } from "@db/pool";
import type { Pool } from "pg";
import {
  DatabaseConnectionError,
  DatabaseQueryError,
  PostgresErrorCode,
  PgDatabaseError,
  type PostgresError
} from "@db/types";

type CustomRequest = Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>> & {
  _startTime?: number;
};

// Import logger and types
import { logger, type LogData } from "@server/utils/logger";

// Custom error interface for database errors
interface DatabaseError extends Error {
  code?: string;
  query?: string;
  isRetryableError?(): boolean;
}

export async function setupProduction(app: express.Express): Promise<void> {
  // Production setup implementation with proper error handling
  app.use((error: Error | DatabaseError, req: Request, res: Response) => {
    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (error instanceof DatabaseConnectionError) {
      statusCode = 503; // Service Unavailable
      errorMessage = 'Database connection error';
    } else if (error instanceof DatabaseQueryError) {
      statusCode = 400; // Bad Request
      const dbError = error as DatabaseError;
      if (dbError.isRetryableError?.() && dbError.code) {
        switch (dbError.code) {
          case '23505': // Unique violation
            errorMessage = 'Record already exists';
            break;
          default:
            errorMessage = 'Database query error';
        }
      }
    }

    logger('Error occurred', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      ...((error as DatabaseError).code && {
        details: {
          code: (error as DatabaseError).code,
          query: (error as DatabaseError).query
        }
      })
    });

    res.status(statusCode).json({ error: errorMessage });
  });
}