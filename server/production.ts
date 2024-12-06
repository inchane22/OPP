import express, { Response, Request } from 'express';
import * as path from 'path';
import compression from 'compression';
import cors from 'cors';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import helmet from 'helmet';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import * as fs from 'fs';
import { setupAuth } from "./auth";
// Dynamic import of database configuration
const { Pool } = await import('pg').then(module => module.default || module);
const { DatabasePool } = await import('./db/pool.js').then(module => module.default || module);

interface DatabaseError extends Error {
  code?: string;
  column?: string;
  constraint?: string;
  detail?: string;
  schema?: string;
  table?: string;
}

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

// Constants
const DB_CONFIG = {
  MAX_POOL_SIZE: 20,
  IDLE_TIMEOUT_MS: 30000,
  CONNECTION_TIMEOUT_MS: 5000,
  MAX_RETRIES: 5,
  RETRY_DELAY_MS: 5000
} as const;

const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000,
  MAX_REQUESTS: 100
} as const;

// Import necessary database configuration from connection module

// Logger utility
function logger(message: string, data: Record<string, any> = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    message,
    ...data
  }));
}

export async function setupProduction(app: express.Express): Promise<void> {
  // Initialize database connection
  const initializeDatabase = async (): Promise<void> => {
    const retries = 3;
    const retryDelay = 2000;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const db = DatabasePool.getInstance();
        await db.getPool();
        logger('Database connection initialized successfully', { attempt });
        return;
      } catch (error) {
        logger('Database connection attempt failed', {
          attempt,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
        });

        if (attempt === retries) {
          throw new Error('Failed to initialize database after all retries');
        }

        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  };

  try {
    await initializeDatabase();
  } catch (error) {
    logger('Failed to initialize database after all retries');
    process.exit(1);
  }

  // Security middleware
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
        frameSrc: ["'none'"]
      }
    }
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

  // Static file serving
  const publicPath = path.join(__dirname, '../dist/public');
  if (!fs.existsSync(publicPath)) {
    throw new Error(`Public directory not found: ${publicPath}`);
  }

  app.use(express.static(publicPath, {
    maxAge: '1y',
    etag: true
  }));

  // Error handling
  app.use((error: Error, req: Request, res: Response, next: Function) => {
    logger('Error occurred', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message
    });
  });

  // Cleanup on shutdown
  const cleanup = async () => {
    logger('Shutting down');
    await DatabasePool.end();
    process.exit(0);
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  // Serve index.html for client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}