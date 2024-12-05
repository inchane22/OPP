import express from "express";
import path from "path";
import compression from "compression";
import { fileURLToPath } from "url";
import { dirname } from "path";
import * as path from 'path';
import express, { Response, Request, NextFunction } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import compression from 'compression';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Custom type declarations
declare global {
  namespace Express {
    interface Request {
      id?: string;
      _startTime?: number;
    }
  }
}

// Environment validation
function validateEnvironment() {
  const required = ['DATABASE_URL', 'NODE_ENV'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate DATABASE_URL format
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl?.startsWith('postgres://') && !dbUrl?.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
  }
}

// Validate environment variables immediately
validateEnvironment();

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

// Logger function
function logger(message: string, data: Record<string, any> = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    ...data,
    message,
  }));
}

// Error logger
function errorLogger(error: Error, req: CustomRequest) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    error: {
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
    },
  }));
}
import { setupAuth } from "./auth";
import * as fs from 'fs';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database types
interface DatabaseError extends Error {
  code?: string;
  column?: string;
  constraint?: string;
  detail?: string;
  schema?: string;
  table?: string;
}

// Database connection configuration
const MAX_POOL_SIZE = 20;
const IDLE_TIMEOUT_MS = 30000;
const CONNECTION_TIMEOUT_MS = 5000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Initialize connection pool with enhanced error handling and retries
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: MAX_POOL_SIZE,
  idleTimeoutMillis: IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  // Add SSL if in production
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  }).on('error', (err: DatabaseError) => {
  logger('Unexpected database error', {
    code: err.code,
    detail: err.detail,
    table: err.table,
    message: err.message,
    timestamp: new Date().toISOString()
  });
}).on('connect', () => {
  logger('New database connection established');
}).on('remove', () => {
  logger('Database connection removed from pool');
});

// Monitor pool health
setInterval(() => {
  logger('Database pool status', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
}, 60000); // Log every minute

export async function setupProduction(app: express.Express) {
  // Validate environment before setup
  validateEnvironment();

  // Initialize error handlers for uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger('Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger('Unhandled Rejection', { reason, promise });
    process.exit(1);
  });

  // Graceful shutdown handler
  const gracefulShutdown = async () => {
    logger('Received shutdown signal');
    
    try {
      // Close database pool
      await pool.end();
      logger('Database pool closed');
      
      // Allow ongoing requests to complete (wait max 10s)
      const shutdownDelay = setTimeout(() => {
        logger('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
      
      shutdownDelay.unref();
      process.exit(0);
    } catch (error) {
      logger('Error during shutdown', { error });
      process.exit(1);
    }
  };

  // Register shutdown handlers
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
  // Enhanced compression with proper filtering
  app.use(compression({
    filter: (req, res) => {
      // Don't compress already compressed formats
      if (req.path.match(/\.(jpg|jpeg|png|gif|zip|gz|br|webp|mp4|webm)$/i)) {
        return false;
      }
      // Use compression for all other responses
      return compression.filter(req, res);
    },
    level: 6, // Balanced compression level
    threshold: 1024 // Only compress responses above 1KB
  }));

  // Error boundary for compression errors
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err.message.includes('compression')) {
      logger('Compression error', { 
        path: req.path,
        error: err.message
      });
      // Continue without compression
      next();
    } else {
      next(err);
    }
  });

  // Request logging middleware
  app.use((req: CustomRequest, res: CustomResponse, next) => {
    // Set start time
    req._startTime = Date.now();
    
    logger('Incoming request', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    
    // Capture response data
    const originalEnd = res.end.bind(res);
    
    const endHandler = function(
      this: CustomResponse,
      chunk?: any,
      encoding?: BufferEncoding | (() => void),
      cb?: () => void
    ): Response {
      logger('Response sent', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime: Date.now() - (req._startTime || Date.now())
      });

      if (typeof encoding === 'function') {
        return originalEnd(chunk, encoding);
      }
      
      if (encoding === undefined) {
        return originalEnd(chunk, cb);
      }
      
      return originalEnd(chunk, encoding as BufferEncoding, cb);
    };

    res.end = endHandler as CustomResponse['end'];
    
    next();
  });

  // Enhanced security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https:", "wss:"],
        frameSrc: ["'self'", "https://www.youtube.com", "https://platform.twitter.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" },
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
  }));

  // Add request ID middleware
  app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-ID', req.id);
    next();
  });

  // CORS configuration
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400, // 24 hours
  }));

  // API rate limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiting to API routes
  app.use('/api/', apiLimiter);

  // Database health check
  app.get('/api/health', async (req, res) => {
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        logger('Database health check passed');
        res.json({ status: 'healthy', database: 'connected' });
      } finally {
        client.release();
      }
    } catch (error) {
      errorLogger(error as Error, req);
      res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
    }
  });

  // Monitor database pool
  pool.on('error', (err: Error) => {
    logger('Unexpected database error', { error: err.message });
  });

  // Basic rate limiting
  const requestCounts = new Map();
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const MAX_REQUESTS_PER_WINDOW = 100;

  app.use((req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const windowStart = now - WINDOW_MS;

    if (!requestCounts.has(ip)) {
      requestCounts.set(ip, []);
    }

    const requests = requestCounts.get(ip);
    const recentRequests = requests.filter((time: number) => time > windowStart);
    
    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        error: 'Too many requests, please try again later.',
        retryAfter: Math.ceil((windowStart + WINDOW_MS - now) / 1000)
      });
    }

    recentRequests.push(now);
    requestCounts.set(ip, recentRequests);

    return next();
  });

  // Set up authentication
  setupAuth(app);

  // Serve static files from the React app with proper caching
  const publicPath = path.join(__dirname, '../dist/public');
  
  // Verify the public directory exists
  try {
    if (!fs.existsSync(publicPath)) {
      console.error(`Public directory not found at ${publicPath}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error checking public directory:', error);
    process.exit(1);
  }

  // Memory leak prevention - clear expired sessions periodically
  const clearExpiredSessions = () => {
    const now = Date.now();
    requestCounts.forEach((times, ip) => {
      const validTimes = times.filter((time: number) => time > now - WINDOW_MS);
      if (validTimes.length === 0) {
        requestCounts.delete(ip);
      } else {
        requestCounts.set(ip, validTimes);
      }
    });
  };
  setInterval(clearExpiredSessions, 60000); // Run every minute

  // Enhanced static file serving with proper cache control
  app.use((req, res, next) => {
    // Add security headers for all responses
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Request timeout middleware
  app.use((req, res, next) => {
    // Set timeout to 30 seconds
    req.setTimeout(30000, () => {
      res.status(408).json({ error: 'Request timeout' });
    });
    next();
  });

  // Static files middleware with enhanced security and optimization
  app.use(express.static(publicPath, {
    setHeaders: (res, path) => {
      // Set security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // Set cache control based on file type
      if (path.endsWith('.html')) {
        // HTML files - no cache
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
        // Static assets - cache for 1 year with immutable
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        // Add preload hints for critical assets
        if (path.match(/\.(js|css)$/)) {
          res.setHeader('Link', `<${path}>; rel=preload; as=${path.endsWith('.js') ? 'script' : 'style'}`);
        }
      } else {
        // Other static files - cache for 1 day
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }

      // Set content type for WebAssembly files
      if (path.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm');
      }
    },
    etag: true,
    lastModified: true,
    index: false,
    maxAge: '1y',
    immutable: true,
    fallthrough: false // Return 404 for missing files
  }));

  // API routes should be handled before the catch-all
  app.use('/api', (req, _res, next) => {
    if (!req.path.startsWith('/api')) {
      return next();
    }
    // Let the API routes handle their own responses
    next();
  });

  // The "catchall" handler: for any request that doesn't
  // match one above, send back React's index.html file.
  // Enhanced error handling middleware with structured logging
  app.use((err: Error | DatabaseError | NodeJS.ErrnoException, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const errorContext = {
      path: req.path,
      method: req.method,
      query: req.query,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || crypto.randomUUID()
    };

    errorLogger(err, req);

    // Database connection errors with detailed handling
    if ('code' in err) {
      const dbErrorMapping: Record<string, { status: number; message: string }> = {
        'ECONNREFUSED': { status: 503, message: 'Database service temporarily unavailable' },
        'ETIMEDOUT': { status: 504, message: 'Database connection timeout' },
        '23505': { status: 409, message: 'Resource already exists' },
        '23503': { status: 400, message: 'Invalid reference to related resource' },
        '23502': { status: 400, message: 'Required field is missing' },
        '42P01': { status: 500, message: 'Database schema error' },
        '28P01': { status: 500, message: 'Database authentication failed' }
      };

      const errorInfo = dbErrorMapping[err.code] || { status: 500, message: 'Database error occurred' };
      
      logger('Database error details', {
        ...errorContext,
        errorCode: err.code,
        errorDetail: err.detail,
        errorTable: err.table,
        errorSchema: err.schema
      });

      return res.status(errorInfo.status).json({
        error: errorInfo.message,
        requestId: errorContext.requestId,
        ...(process.env.NODE_ENV !== 'production' && { detail: err.detail })
      });
    }

    // URI parsing errors
    if (err instanceof URIError) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request URL'
      });
    }

    // Authentication errors
    if (err instanceof Error && err.message.toLowerCase().includes('unauthorized')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Default error response
    return res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 
        'An unexpected error occurred' : 
        err.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
  });

  // Catch-all route handler
  app.get("*", (req, res) => {
    // Don't cache the index.html file
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Use an absolute path to ensure correct file serving
    const indexPath = path.join(publicPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error(new Date().toISOString(), 'Error sending index.html:', {
          error: err.message,
          path: req.path,
          ip: req.ip
        });
        res.status(500).json({
          error: 'Error loading application',
          message: process.env.NODE_ENV === 'production' ? 'Failed to load application' : err.message
        });
      }
    });
  });
}
