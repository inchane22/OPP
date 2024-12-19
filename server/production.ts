import express, { Response, Request } from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import compression from 'compression';
import cors from 'cors';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import helmet from 'helmet';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import * as fs from 'fs';
import { setupAuth } from "./auth.js";

// ES Module path resolution utility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const resolvePath = (relativePath: string) => path.resolve(__dirname, relativePath);

// Ensure all paths are resolved relative to the current module
const resolveFromRoot = (relativePath: string) => path.resolve(__dirname, '..', relativePath);

// Import database configuration and types
import { DatabasePool } from './db/pool';
import type { Pool } from 'pg';
import { 
  DatabaseConnectionError,
  DatabaseQueryError,
  PostgresErrorCode,
  POOL_CONFIG,
  isDatabaseError,
  DatabaseError
} from './db/types';

type CustomRequest = Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>> & {
  _startTime?: number;
};

type CustomResponse = Response & {
  end: {
    (cb?: (() => void)): Response;
    (chunk: any, cb?: (() => void)): Response;
    (chunk: any, encoding: BufferEncoding, cb?: (() => void)): Response;
  };
};

const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000,
  MAX_REQUESTS: 100
} as const;

// Import necessary database configuration from connection module
import { logger, type LogData } from "./utils/logger.js";

export async function setupProduction(app: express.Express): Promise<void> {
  // Initialize database connection with fallback mode
  const initializeDatabase = async (): Promise<void> => {
    const retries = 3;
    const retryDelay = 2000;
    let fallbackMode = false;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const db = DatabasePool.getInstance();
        await db.getPool();
        if (fallbackMode) {
          logger('Database connection restored, exiting fallback mode', { attempt } as LogData);
        } else {
          logger('Database connection initialized successfully', { attempt } as LogData);
        }
        return;
      } catch (error) {
        const pgError = error instanceof DatabaseError ? error : new DatabaseQueryError(
          error instanceof Error ? error.message : 'Unknown error'
        );
        const isRetryable = pgError.code && POOL_CONFIG.RETRYABLE_ERROR_CODES.includes(pgError.code as PostgresErrorCode);
        
        logger('Database connection attempt failed', {
          attempt,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode: pgError.code,
          isRetryable,
          stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
        } as LogData);

        if (attempt === retries) {
          if (process.env.NODE_ENV === 'production') {
            logger('Entering fallback mode - some features will be limited', {
              mode: 'fallback',
              features: ['read-only', 'cached-data']
            } as LogData);
            fallbackMode = true;
            // Instead of throwing, we'll continue with limited functionality
            app.use((req: Request, res: Response, next: Function) => {
              if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
                res.status(503).json({
                  error: 'Service temporarily in read-only mode due to database connectivity issues',
                  status: 503,
                  fallback: true
                });
              } else {
                next();
              }
            });
            return;
          } else {
            throw new DatabaseConnectionError(
              'Failed to initialize database after all retries',
              error as Error
            );
          }
        }

        const backoffDelay = retryDelay * Math.pow(1.5, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  };

  try {
    await initializeDatabase();
  } catch (error) {
    logger('Failed to initialize database after all retries', {
      error: error instanceof Error ? error.message : 'Unknown error'
    } as LogData);
    process.exit(1);
  }

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://www.youtube.com", "https://s.ytimg.com", "https://platform.twitter.com", "https://*.twitter.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://platform.twitter.com"],
        imgSrc: ["'self'", "data:", "https:", "https://i.ytimg.com", "https://img.youtube.com", "https://*.twitter.com", "https://platform.twitter.com"],
        connectSrc: ["'self'", "https://api.codidact.com", "https://*.twitter.com", "https://api.coingecko.com"],
        fontSrc: ["'self'", "https://platform.twitter.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "https:", "blob:"],
        frameSrc: ["'self'", "https://www.youtube.com", "https://youtube.com", "https://youtu.be", "https://platform.twitter.com", "https://*.twitter.com"],
        frameAncestors: ["'self'"],
        workerSrc: ["'self'", "blob:"],
        childSrc: ["'self'", "blob:", "https://platform.twitter.com"],
        baseUri: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: RATE_LIMIT.WINDOW_MS,
    max: RATE_LIMIT.MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(limiter);

  // CORS configuration
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));

  // Compression
  app.use(compression());

  // Request logging
  app.use((req: CustomRequest, res: CustomResponse, next) => {
    req._startTime = Date.now();
    const cleanup = () => {
      res.removeListener('finish', logRequest);
      res.removeListener('error', logError);
      res.removeListener('close', cleanup);
    };

    const logRequest = () => {
      cleanup();
      const responseTime = Date.now() - (req._startTime || Date.now());
      logger('Request completed', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime
      });
    };

    const logError = (error: Error) => {
      cleanup();
      logger('Request error', {
        method: req.method,
        path: req.path,
        error: error.message
      });
    };

    res.on('finish', logRequest);
    res.on('error', logError);
    res.on('close', cleanup);
    next();
  });

  // Static file serving with proper path resolution for ES modules
  const publicPath = resolveFromRoot('dist/public');
  const indexPath = path.join(publicPath, 'index.html');
  
  if (!fs.existsSync(publicPath)) {
    logger('Building client application...', {
      directory: publicPath
    } as LogData);
    throw new Error(`Build directory not found: ${publicPath}. Please run 'npm run build' first.`);
  }

  logger('Static files will be served from:', { 
    path: publicPath,
    exists: fs.existsSync(publicPath)
  } as LogData);

  app.use(express.static(publicPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
    etag: true,
    index: false // We'll handle serving index.html manually
  }));

  // Error handling
  app.use((error: Error, req: Request, res: Response, next: Function) => {
    const isProduction = process.env.NODE_ENV === 'production';
    let statusCode = 500;
    let errorMessage = isProduction ? 'Internal Server Error' : error.message;
    
    // Handle specific database errors
    if (error instanceof DatabaseConnectionError) {
      statusCode = 503; // Service Unavailable
      errorMessage = isProduction ? 
        'Database service temporarily unavailable' : 
        'Database connection error: ' + error.message;
    } else if (error instanceof DatabaseQueryError) {
      statusCode = 400; // Bad Request
      if (error.code === '23505') { // Unique violation
        errorMessage = 'Record already exists';
      } else if (error.code === '23503') { // Foreign key violation
        errorMessage = 'Referenced record does not exist';
      } else if (error.code === '23502') { // Not null violation
        errorMessage = 'Required field is missing';
      } else {
        errorMessage = isProduction ? 
          'Invalid database operation' : 
          'Database query error: ' + error.message;
      }
    }

    const errorData: Record<string, any> = {
      error: error.message,
      errorType: error.constructor.name,
      errorCode: (error as any).code,
      stack: !isProduction ? error.stack : undefined,
      path: req.path,
      method: req.method
    };

    logger('Error occurred', errorData as LogData);

    // Send appropriate error response
    res.status(statusCode).json({
      error: errorMessage,
      status: statusCode,
      path: req.path,
      timestamp: new Date().toISOString(),
      ...((!isProduction && error instanceof DatabaseQueryError) && {
        details: {
          code: error.code,
          query: error.query
        }
      })
    });
  });

  // Cleanup on shutdown
  const cleanup = async (): Promise<never> => {
    try {
      logger('Shutting down gracefully', {
        environment: process.env.NODE_ENV
      } as LogData);
      await DatabasePool.end();
      process.exit(0);
    } catch (error) {
      logger('Error during shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      } as LogData);
      process.exit(1);
    }
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  // Serve index.html for client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}