import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import { sql } from "drizzle-orm";
import { createServer } from "http";
import compression from 'compression';
import cors from 'cors';
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { serverConfig, PORT, HOST, env, isProduction } from './config';
import { setupAuth } from './auth';

// ES Module path resolution utility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper for consistent path resolution
const resolvePath = (relativePath: string) => path.resolve(__dirname, relativePath);

function log(message: string, data: Record<string, any> = {}) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  console.log(`[${formattedTime}] ${message}`, JSON.stringify(data, null, 2));
}

const app = express();

// Basic middleware setup
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize authentication
setupAuth(app);

// Configure CORS
const corsOptions = {
  origin: function(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = [
    'https://orange-pill-peru.com',
    'https://www.orange-pill-peru.com',
    'http://localhost:5000',
    'http://localhost:3000',
    'http://0.0.0.0:5000',
    'http://0.0.0.0:3000',
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
    callback(new Error('Not allowed by CORS'));
  }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

// Initialize server
const port = parseInt(process.env.PORT || '5000', 10);
const host = process.env.HOST || '0.0.0.0';
app.set('port', port);
app.set('host', host);

// Create HTTP server
const server = createServer(app);

// Log environment configuration
log('Environment configuration:', {
  port,
  host,
  node_env: process.env.NODE_ENV,
  database_url: process.env.DATABASE_URL ? '[REDACTED]' : undefined,
  pg_database: process.env.PGDATABASE ? '[REDACTED]' : undefined,
  pg_host: process.env.PGHOST ? '[REDACTED]' : undefined,
});

// Log server configuration
log('Server initialization', {
  port,
  host,
  environment: env,
  production: isProduction,
  config: serverConfig.toString(),
  env_port: process.env.PORT,
  env_host: process.env.HOST
});

// Validate port configuration
if (!PORT || isNaN(PORT) || PORT <= 0) {
  log('Invalid port configuration', {
    port: PORT,
    type: typeof PORT,
    is_nan: isNaN(PORT),
    port_env: process.env.PORT
  });
  process.exit(1);
}

// Log port validation success
log('Port configuration validated', {
  port: PORT,
  host: HOST,
  environment: process.env.NODE_ENV
});

if (process.env.NODE_ENV === 'production') {
  log('Running in production mode', {
    port_mapping: 'Using port 5000 internally, mapped to 80 by Replit',
    deployment_target: 'cloudrun'
  });
}

console.log(`Attempting to start server on ${HOST}:${PORT}`);

// Function to handle port binding errors
const handlePortError = async (error: NodeJS.ErrnoException): Promise<void> => {
  if (error.code === 'EACCES') {
    log('Port requires elevated privileges', { port: PORT });
    process.exit(1);
  } else if (error.code === 'EADDRINUSE') {
    log('Port is already in use', { port: PORT });
    await cleanup();
    process.exit(1);
  } else {
    throw error;
  }
};

// Cleanup function
async function cleanup(): Promise<void> {
  if (server && server.listening) {
    return new Promise<void>((resolve) => {
      server!.close(() => {
        server = null;
        resolve();
      });
    });
  }
  return Promise.resolve();
}

// Register error handling middleware
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  const status = err instanceof Error ? 500 : 400;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err instanceof Error ? err.message : "Internal Server Error";

  console.error('Error:', err);

  res.status(status).json({ 
    message,
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: err instanceof Error ? err.stack : undefined 
    })
  });
});

// Initialize database and start server
async function init() {
  try {
    log('Starting server initialization...', {
      env: process.env.NODE_ENV,
      port: PORT,
      host: HOST
    });
    
    // Initialize database
    const { db } = await import('../db/index');
    await db.execute(sql`SELECT 1`);
    log('Database connected successfully');
    
    // Register routes
    await registerRoutes(app);
    log('Routes registered successfully');

    // Register API routes
    try {
      await registerRoutes(app);
      log('API routes registered successfully');
    } catch (routesError) {
      log('Failed to register routes:', {
        error: routesError instanceof Error ? routesError.message : 'Unknown routes error',
        stack: routesError instanceof Error ? routesError.stack : undefined
      });
      throw routesError;
    }

    // Ensure cleanup of any existing server
    await cleanup();
    log('Previous server instance cleaned up');

    // Setup environment-specific configuration
    if (process.env.NODE_ENV !== 'production') {
      await setupVite(app, server);
      log('Development server setup completed');
    } else {
      const { setupProduction } = await import('./production.js');
      await setupProduction(app);
      log('Production server setup completed');
    }

    // Start server
    await new Promise<void>((resolve, reject) => {

      const onError = async (error: NodeJS.ErrnoException): Promise<void> => {
        console.error('Server error occurred:', error);
        log('Server error details:', {
          error: error.message,
          code: error.code,
          syscall: error.syscall,
          details: error.toString()
        });

        try {
          await handlePortError(error);
        } catch (err) {
          console.error('Fatal server error:', err);
          log('Fatal server error details:', {
            error: err instanceof Error ? err.message : 'Unknown error',
            code: error.code,
            stack: process.env.NODE_ENV === 'development' ? 
              error instanceof Error ? error.stack : undefined : 
              undefined
          });
          reject(err);
        }
      };

      const onListening = (): void => {
        const addr = server!.address();
        if (!addr) {
          const error = new Error('Failed to get server address');
          console.error(error.message);
          reject(error);
          return;
        }

        const actualPort = typeof addr === 'string' ? addr : addr.port;
        console.log(`Server is now listening on ${HOST}:${actualPort}`);
        log('Server started successfully', {
          host: HOST,
          port: actualPort,
          env,
          production: isProduction,
          address: addr
        });
        
        server!.removeListener('error', onError);
        resolve();
      };

      // Bind error and listening handlers
      server.once('error', onError);
      server.once('listening', onListening);
      
      // Attempt to start the server
      console.log(`Starting server on ${HOST}:${PORT}`);
      log('Binding server...', { 
        host: HOST,
        port: PORT,
        env,
        production: isProduction,
        port_env: process.env.PORT
      });
      
      try {
        server.listen(PORT, HOST);
        log('Server binding successful', { 
          port: PORT,
          host: HOST,
          environment: env,
          production: isProduction
        });
      } catch (error) {
        log('Server binding failed', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          port: PORT,
          host: HOST,
          environment: env
        });
        reject(error);
      }
    });

    log('Server started successfully');

  } catch (error) {
    log('Fatal server startup error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Graceful shutdown handlers
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

// Start server with enhanced error handling
init().catch((error: unknown) => {
  log('Fatal error during initialization:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    port: PORT,
    host: HOST,
    node_env: process.env.NODE_ENV,
    database_url: process.env.DATABASE_URL ? '[REDACTED]' : 'undefined'
  });

  // Give time for logs to be written before exit
  setTimeout(() => {
    console.error('Server initialization failed, exiting...');
    process.exit(1);
  }, 1000);
});

// Log unhandled rejections
process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Rejection:', reason);
  log('Unhandled Promise Rejection:', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  });
});

// Log uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  log('Uncaught Exception:', {
    error: error.message,
    stack: error.stack
  });
  
  // Exit on uncaught exception after logging
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});
