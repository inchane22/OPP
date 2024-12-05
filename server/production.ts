import express from "express";
import path from "path";
import compression from "compression";
import { fileURLToPath } from "url";
import { dirname } from "path";
// Custom types for request and response
import { Response, Request } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

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

// Initialize connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export function setupProduction(app: express.Express) {
  // Enable compression for all requests
  app.use(compression());

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
      
      return originalEnd(chunk, encoding as BufferEncoding | undefined, cb);
    };

    res.end = endHandler as CustomResponse['end'];
    
    next();
  });

  // Enhanced security with helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'", "https:"],
        frameSrc: ["'self'", "https://www.youtube.com", "https://platform.twitter.com"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

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

  // Serve static files with optimized caching
  app.use(express.static(publicPath, {
    maxAge: '1d', // Cache static assets for 1 day
    etag: true,
    lastModified: true,
    index: false, // Don't serve index.html for directory
    immutable: true // Mark assets as immutable for better caching
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
  // Error handling middleware
  app.use((err: Error | NodeJS.ErrnoException, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    errorLogger(err, req);

    // Handle specific error types
    if ('code' in err && err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Database connection failed'
      });
    }

    if (err instanceof URIError) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request URL'
      });
    }

    // Default error response
    return res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
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
