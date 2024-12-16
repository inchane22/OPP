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
// Import database configuration
import { db, cleanup as dbCleanup } from '../db/index';
import { sql } from 'drizzle-orm';
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from 'pg';

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
import { logger, type LogData } from "./utils/logger.js";

export async function setupProduction(app: express.Express): Promise<void> {
  // Database is already initialized in db/index.ts
  try {
    // Verify connection is working
    await db.execute(sql`SELECT 1`);
    logger('Database connection verified in production setup');
  } catch (error) {
    logger('Database verification failed in production setup', {
      error: error instanceof Error ? error.message : 'Unknown error'
    } as LogData);
    process.exit(1);
  }

  // Security middleware configuration
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", "https://*.orangepillperu.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://www.youtube.com", "https://s.ytimg.com", "https://*.orangepillperu.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://*.orangepillperu.com"],
        imgSrc: ["'self'", "data:", "https:", "https://i.ytimg.com", "https://img.youtube.com", "https://*.orangepillperu.com"],
        connectSrc: [
          "'self'",
          "https://api.coingecko.com",
          "https://*.orangepillperu.com",
          "wss://*.orangepillperu.com",
          ...(process.env.NODE_ENV === 'development'
            ? ["http://localhost:*", "ws://localhost:*", "http://127.0.0.1:*", "http://0.0.0.0:*"]
            : [])
        ],
        fontSrc: ["'self'", "data:", "https://*.orangepillperu.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "https:", "blob:", "https://*.orangepillperu.com"],
        frameSrc: ["'self'", "https://www.youtube.com", "https://*.orangepillperu.com"],
        frameAncestors: ["'self'", "https://*.orangepillperu.com"],
        workerSrc: ["'self'", "blob:"],
        childSrc: ["'self'", "blob:"],
        baseUri: ["'self'"],
        formAction: ["'self'", "https://*.orangepillperu.com"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
  }));

  // Apply CORS before any routes
  app.use(cors({
    origin: function(origin, callback) {
      const allowedOrigins = [
        'https://orangepillperu.com',
        'https://www.orangepillperu.com'
      ];
      
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: RATE_LIMIT.WINDOW_MS,
    max: RATE_LIMIT.MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(limiter);

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
  const publicPath = resolveFromRoot('dist/public');
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
    index: false
  }));

  // Error handling
  app.use((error: Error, req: Request, res: Response, next: Function) => {
    const errorData: Record<string, any> = {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      path: req.path,
      method: req.method
    };

    logger('Error occurred', errorData as LogData);

    res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message
    });
  });

  // Cleanup on shutdown
  const cleanup = async (): Promise<never> => {
    try {
      logger('Shutting down gracefully', {
        environment: process.env.NODE_ENV
      } as LogData);
      await dbCleanup();
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

  // Serve static files excluding API routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    // For non-API routes, try to serve static files
    const staticFile = path.join(publicPath, req.path);
    if (fs.existsSync(staticFile) && fs.statSync(staticFile).isFile()) {
      return res.sendFile(staticFile);
    }
    // If no static file exists, serve index.html for client-side routing
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}