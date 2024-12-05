import express, { Response, Request } from 'express';
import * as path from 'path';
import compression from 'compression';
import cors from 'cors';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import helmet from 'helmet';
import { Pool } from 'pg';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import * as fs from 'fs';
import { setupAuth } from "./auth";

// Custom type declarations
declare global {
  namespace Express {
    interface Request {
      id?: string;
      _startTime?: number;
    }
  }
}

// Database types
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

// Constants
const MAX_POOL_SIZE = 20;
const IDLE_TIMEOUT_MS = 30000;
const CONNECTION_TIMEOUT_MS = 5000;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 100;

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
function errorLogger(error: Error | DatabaseError, req: Request) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    error: {
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
      ...(('code' in error) && { code: error.code }),
      ...(('detail' in error) && { detail: error.detail }),
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
    },
  }));
}

// Initialize connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: MAX_POOL_SIZE,
  idleTimeoutMillis: IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
}).on('error', (err: DatabaseError) => {
  logger('Unexpected database error', {
    code: err.code,
    detail: err.detail,
    table: err.table,
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Monitor pool health
setInterval(() => {
  logger('Database pool status', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
}, 60000);

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
      await pool.end();
      logger('Database pool closed');
      
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
      if (req.path.match(/\.(jpg|jpeg|png|gif|zip|gz|br|webp|mp4|webm)$/i)) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6,
    threshold: 1024
  }));

  // Request logging middleware
  app.use((req: CustomRequest, res: CustomResponse, next) => {
    req._startTime = Date.now();
    
    logger('Incoming request', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    
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
      
      return originalEnd(chunk, encoding, cb);
    };

    res.end = endHandler as CustomResponse['end'];
    next();
  });

  // Security headers
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

  // Request ID middleware
  app.use((req: Request, res: Response, next) => {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-ID', requestId);
    next();
  });

  // CORS configuration
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  }));

  // Unified rate limiting for all routes
  const limiter = rateLimit({
    windowMs: WINDOW_MS,
    max: MAX_REQUESTS_PER_WINDOW,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => req.ip || req.socket.remoteAddress || 'unknown',
    handler: (_req: Request, res: Response) => {
      const retryAfter = Math.ceil(WINDOW_MS / 1000);
      res.status(429).json({
        error: 'Too many requests, please try again later.',
        retryAfter
      });
    }
  });

  app.use(limiter);

  // Set up authentication
  setupAuth(app);

  // Serve static files
  const publicPath = path.join(__dirname, '../dist/public');
  
  try {
    if (!fs.existsSync(publicPath)) {
      console.error(`Public directory not found at ${publicPath}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error checking public directory:', error);
    process.exit(1);
  }

  // Static files middleware
  app.use(express.static(publicPath, {
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        if (filePath.match(/\.(js|css)$/)) {
          res.setHeader('Link', `<${filePath}>; rel=preload; as=${filePath.endsWith('.js') ? 'script' : 'style'}`);
        }
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }

      if (filePath.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm');
      }
    },
    etag: true,
    lastModified: true,
    index: false,
    maxAge: '1y',
    immutable: true,
    fallthrough: false
  }));

  // Enhanced error handling middleware with authentication support
  app.use((error: Error | DatabaseError, request: Request, response: Response, _next: (err?: any) => void) => {
    const requestId = request.headers['x-request-id'] || crypto.randomUUID();
    
    errorLogger(error, request);

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Authentication')) {
      return response.status(401).json({
        error: 'Authentication Required',
        message: 'Please log in to access this resource',
        requestId,
        code: 'AUTH_REQUIRED'
      });
    }

    // Handle authorization errors
    if (error instanceof Error && error.message.includes('Authorization')) {
      return response.status(403).json({
        error: 'Access Denied',
        message: 'You do not have permission to access this resource',
        requestId,
        code: 'ACCESS_DENIED'
      });
    }

    if ('code' in error) {
      const dbErrors: Record<string, { status: number; message: string }> = {
        'ECONNREFUSED': { status: 503, message: 'Database service unavailable' },
        'ETIMEDOUT': { status: 504, message: 'Database connection timeout' },
        '23505': { status: 409, message: 'Resource already exists' },
        '23503': { status: 400, message: 'Invalid reference' },
        '23502': { status: 400, message: 'Required field missing' },
        '42P01': { status: 500, message: 'Database schema error' },
        '28P01': { status: 500, message: 'Database authentication failed' }
      };

      const errorInfo = dbErrors[error.code as string] || { status: 500, message: 'Database error' };
      
      return response.status(errorInfo.status).json({
        error: errorInfo.message,
        requestId,
        ...(process.env.NODE_ENV !== 'production' && { detail: error.detail })
      });
    }

    if (error instanceof URIError) {
      return response.status(400).json({
        error: 'Bad Request',
        message: 'Invalid URL',
        requestId
      });
    }

    return response.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 
        'An unexpected error occurred' : 
        error.message,
      requestId,
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
    });
  });

  // Catch-all route
  app.get("*", (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const indexPath = path.join(publicPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        logger('Error sending index.html', {
          error: err.message,
          path: req.path,
          ip: req.ip
        });
        res.status(500).json({
          error: 'Error loading application',
          message: process.env.NODE_ENV === 'production' ? 
            'Failed to load application' : 
            err.message
        });
      }
    });
  });

  // Request timeout middleware with enhanced logging
  app.use((req: Request, res: Response, next: () => void) => {
    // Log incoming request for timeout tracking
    const startTime = Date.now();
    const requestPath = req.path;
    const requestMethod = req.method;
    const requestIP = req.ip;

    // Set request timeout
    res.setTimeout(30000, () => {
      const duration = Date.now() - startTime;
      logger('Request timeout', {
        method: requestMethod,
        path: requestPath,
        duration: duration,
        ip: requestIP,
        headers: req.headers
      });
      res.status(408).json({ 
        error: 'Request timeout',
        message: `The request to ${requestPath} exceeded 30 seconds`,
        duration: `${duration}ms`
      });
    });
    next();
  });

  // Database health check with detailed diagnostics
  app.get('/api/health', async (req, res) => {
    const startTime = Date.now();
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        const responseTime = Date.now() - startTime;
        
        logger('Database health check passed', {
          responseTime,
          poolStats: {
            totalConnections: pool.totalCount,
            idleConnections: pool.idleCount,
            waitingRequests: pool.waitingCount
          }
        });
        
        res.json({
          status: 'healthy',
          database: 'connected',
          diagnostics: {
            responseTime: `${responseTime}ms`,
            timestamp: new Date().toISOString(),
            connections: {
              total: pool.totalCount,
              idle: pool.idleCount,
              waiting: pool.waitingCount
            }
          }
        });
      } finally {
        client.release();
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      errorLogger(error as Error, req);
      res.status(503).json({ 
        status: 'unhealthy', 
        database: 'disconnected',
        error: process.env.NODE_ENV === 'production' ? 'Database connection failed' : (error as Error).message,
        diagnostics: {
          responseTime: `${responseTime}ms`,
          timestamp: new Date().toISOString()
        }
      });
    }
  });
};
