import express, { Response, Request, NextFunction } from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import compression from 'compression';
import cors from 'cors';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import helmet from 'helmet';
import * as fs from 'fs';
import rateLimit from 'express-rate-limit';
import { setupAuth } from "./auth.js";
import { logger, type LogData } from "./utils/logger.js";
import { DatabasePool } from './db/pool';
import { serverConfig, PORT, HOST, isProduction } from './config.js';

// ES Module path resolution utility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const resolvePath = (relativePath: string) => path.resolve(__dirname, relativePath);
const resolveFromRoot = (relativePath: string) => path.resolve(__dirname, '..', relativePath);

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

export async function setupProduction(app: express.Express): Promise<void> {
  // Initialize database connection
  const initializeDatabase = async (): Promise<void> => {
    const retries = 5;
    const retryDelay = 2000;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logger('Attempting database connection', { 
          attempt,
          max_retries: retries,
          delay: retryDelay 
        } as LogData);
        
        const db = DatabasePool.getInstance();
        await db.getPool();
        
        logger('Database connection initialized successfully', { 
          attempt,
          status: 'connected' 
        } as LogData);
        return;
      } catch (error) {
        logger('Database connection attempt failed', {
          attempt,
          remaining_attempts: retries - attempt,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
        } as LogData);

        if (attempt === retries) {
          logger('All database connection attempts exhausted', {
            total_attempts: retries,
            final_error: error instanceof Error ? error.message : 'Unknown error'
          } as LogData);
          throw new Error('Failed to initialize database after all retries');
        }

        logger('Waiting before next connection attempt', {
          delay_ms: retryDelay,
          next_attempt: attempt + 1
        } as LogData);
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

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes should be registered before static file serving
  // This ensures API requests are handled correctly and don't get caught by the static middleware
  app.use('/api/*', (req, res, next) => {
    // Log API request
    logger('API Request', {
      method: req.method,
      path: req.path,
      query: req.query,
      headers: req.headers
    });
    next();
  });

  // API routes should be handled before static files
  app.use('/api/*', (req, res, next) => {
    // Log API request
    logger('API Request', {
      method: req.method,
      path: req.path,
      query: req.query,
      headers: req.headers
    });
    next();
  });

  // Error handling for API routes
  app.use('/api/*', (error: Error, req: Request, res: Response, next: Function) => {
    logger('API Error', {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      path: req.path,
      method: req.method
    });

    res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message
    });
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

  // Serve static files for non-API routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    express.static(publicPath, {
      maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
      etag: true,
      index: false // We'll handle serving index.html manually
    })(req, res, next);
  });

  // Serve index.html for all remaining routes (client-side routing)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    if (!fs.existsSync(indexPath)) {
      logger('Index file not found', {
        path: indexPath,
        publicPath
      } as LogData);
      return res.status(500).json({ error: 'Internal Server Error - Missing index file' });
    }
    return res.sendFile(indexPath);
  });

  // Log successful setup completion
  logger('Production server setup completed', {
    port: PORT,
    host: HOST,
    static_path: publicPath,
    environment: process.env.NODE_ENV
  } as LogData);
}
