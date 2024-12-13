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

// ES Module path resolution utilities
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const resolvePath = (relativePath: string) => path.resolve(__dirname, relativePath);
const resolveFromRoot = (relativePath: string) => {
  const rootPath = path.resolve(__dirname, '..');
  const resolvedPath = path.resolve(rootPath, relativePath);
  logger('Resolving path', {
    relativePath,
    rootPath,
    resolvedPath,
    exists: fs.existsSync(resolvedPath)
  } as LogData);
  return resolvedPath;
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
  try {
    logger('Starting database initialization', {
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    } as LogData);
    
    // Import and initialize database
    const { db } = await import('../db/index.js');
    // Database is automatically initialized on import
    
    logger('Database initialized successfully', {
      timestamp: new Date().toISOString()
    } as LogData);
  } catch (error) {
    logger('Failed to initialize database', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined,
      timestamp: new Date().toISOString()
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

  // CORS configuration with specific origins for production
  const corsOptions = {
    origin: function(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      const allowedOrigins = [
        'https://orange-pill-peru.com',
        'https://www.orange-pill-peru.com',
        'http://localhost:5000',
        'http://0.0.0.0:5000',
        'http://localhost:3000',
        'http://0.0.0.0:3000',
        // Add Replit domains
        'https://*.repl.co',
        'https://*.repl.dev',
        'https://*.replit.app',
        'https://*.replit.dev',
        'https://*.picard.replit.dev'
      ];
      
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if the origin matches any of our allowed patterns
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (allowedOrigin.includes('*')) {
          const pattern = new RegExp('^' + allowedOrigin.replace('*', '.*') + '$');
          return pattern.test(origin);
        }
        return allowedOrigin === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked request from origin: ${origin}`);
        callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'X-Content-Type-Options'],
    credentials: true,
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204
  };

  app.use(cors(corsOptions));
  app.use(compression());

  // API-specific middleware with JSON parsing
  app.use('/api', express.json(), (req, res, next) => {
    res.set({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    
    logger('API Request', {
      method: req.method,
      path: req.path,
      query: req.query,
      headers: req.headers
    });
    
    next();
  });

  // JSON parsing error handler
  app.use((err: Error, _req: Request, res: Response, next: NextFunction): void => {
    if (err instanceof SyntaxError && 'body' in err) {
      logger('JSON Parsing Error', {
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
      res.status(400).json({ error: 'Invalid JSON format' });
      return;
    }
    next(err);
  });

  // Request logging with detailed error tracking
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
        responseTime,
        isApiRoute: req.path.startsWith('/api/')
      });
    };

    const logError = (error: Error) => {
      cleanup();
      logger('Request error', {
        method: req.method,
        path: req.path,
        error: error.message,
        stack: isProduction ? undefined : error.stack
      });
    };

    res.on('finish', logRequest);
    res.on('error', logError);
    res.on('close', cleanup);
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  });

  // Register API routes first
  try {
    const { registerRoutes } = await import('./routes.js');
    await registerRoutes(app);
    logger('API routes registered successfully');
  } catch (error) {
    logger('Failed to register API routes', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }

  // Add explicit catch-all for unhandled API routes
  app.all('/api/*', (req, res) => {
    logger('Unhandled API route', {
      method: req.method,
      path: req.path
    });
    return res.status(404).json({ error: 'API endpoint not found' });
  });

  // Static file serving configuration
  const projectRoot = process.cwd();
  const publicPath = path.join(projectRoot, 'dist', 'public');
  const indexPath = path.join(publicPath, 'index.html');

  // Verify build files exist
  if (!fs.existsSync(publicPath)) {
    logger('Build directory missing', { publicPath });
    throw new Error(`Build directory missing at ${publicPath}`);
  }

  // Log static serving configuration
  logger('Static file configuration', {
    projectRoot,
    publicPath,
    exists: fs.existsSync(publicPath),
    contents: fs.existsSync(publicPath) ? fs.readdirSync(publicPath) : []
  } as LogData);

  // Configure and apply static file middleware
  app.use(express.static(publicPath, {
    maxAge: '1d',
    etag: true,
    index: false,
    setHeaders: (res, filePath) => {
      // Set cache control
      res.setHeader('Cache-Control', 'public, max-age=86400');
      
      // Set content type based on extension
      const ext = path.extname(filePath).toLowerCase();
      const contentTypes: Record<string, string> = {
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml'
      };
      
      if (contentTypes[ext]) {
        res.setHeader('Content-Type', `${contentTypes[ext]}; charset=utf-8`);
      }
      
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  }));

  // Single unified catch-all route handler for SPA
  app.get('*', (req, res) => {
    // Handle API routes first
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }

    // Handle all other routes by serving the SPA index
    return res.sendFile(indexPath, (err) => {
      if (err) {
        logger('Error serving index file', { 
          error: err.message,
          path: indexPath
        });
        return res.status(500).send('Server error');
      }
    });
  });

  // Log successful setup completion
  logger('Production server setup completed', {
    port: PORT,
    host: HOST,
    static_path: publicPath,
    environment: process.env.NODE_ENV
  } as LogData);
}