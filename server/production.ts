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
import { DatabasePool } from './db/pool';
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
  // Initialize database connection
  const initializeDatabase = async (): Promise<void> => {
    const retries = 3;
    const retryDelay = 2000;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const db = DatabasePool.getInstance();
        await db.getPool();
        logger('Database connection initialized successfully', { attempt } as LogData);
        return;
      } catch (error) {
        logger('Database connection attempt failed', {
          attempt,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
        } as LogData);

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

  // Use port 5000 which Replit maps to 80 in production
  const port = 5000;
  logger('Production server configuration', {
    port,
    host: '0.0.0.0',
    environment: process.env.NODE_ENV,
    port_source: 'replit-mapped',
    production: true,
    note: 'Using port 5000 (mapped to 80 by Replit in production)'
  } as LogData);

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