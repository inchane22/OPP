import express from "express";
import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { ParsedQs } from "qs";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

// Import database configuration and types
import { DatabasePool } from "@backup/db/pool";
import type { Pool } from "pg";
import {
  DatabaseConnectionError,
  DatabaseQueryError,
  PostgresErrorCode,
  PgDatabaseError,
  type PostgresError,
  isDatabaseError,
  isDatabaseQueryError
} from "@backup/db/types";

// Import local types
import type { DatabaseError } from "./types";

// Import logger and types
import { logger, type LogData } from "@backup/server/utils/logger";

type CustomRequest = Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>> & {
  _startTime?: number;
};

// Production setup implementation with proper error handling
export async function setupProduction(app: express.Express): Promise<void> {
  app.use((error: Error | DatabaseError, req: Request, res: Response) => {
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    let errorDetails: Record<string, unknown> = {};

    if (error instanceof DatabaseConnectionError) {
      statusCode = 503; // Service Unavailable
      errorMessage = 'Database connection error';
    } else if (isDatabaseQueryError(error)) {
      statusCode = 400; // Bad Request
      errorMessage = 'Database query error';
      errorDetails = {
        code: error.code,
        query: error.query,
        isRetryable: error.isRetryableError()
      };

      if (error.isRetryableError() && error.code) {
        switch (error.code) {
          case '23505': // Unique violation
            errorMessage = 'Record already exists';
            break;
          case '23503': // Foreign key violation
            errorMessage = 'Referenced record does not exist';
            break;
          case '23502': // Not null violation
            errorMessage = 'Required field is missing';
            break;
          default:
            errorMessage = 'Database query error';
        }
      }
    }

    const isProduction = process.env.NODE_ENV === 'production';

    logger('Error occurred', {
      error: error.message,
      stack: !isProduction ? error.stack : undefined,
      ...errorDetails
    });

    res.status(statusCode).json({ error: errorMessage });
  });

  // Apply security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  }));

  // Enable gzip compression
  app.use(compression());

  // Apply rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });

  app.use(limiter);
}