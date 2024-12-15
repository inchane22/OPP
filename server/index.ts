import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite } from "./vite.js";
import { sql } from "drizzle-orm";
import { createServer } from "http";
import compression from 'compression';
import cors from 'cors';
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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
  console.log(`[${formattedTime}] ${message}`);
}

const app = express();

// Configure CORS based on environment
const corsOptions = {
  origin: function(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
    // Log the origin for debugging
    log('Incoming request origin:', { origin });
    
    // Allow requests with no origin (like mobile apps, curl requests, or same-origin)
    if (!origin) {
      log('No origin header, allowing request');
      return callback(null, true);
    }
    
    // Define allowed origins based on environment
    const allowedOrigins = [
      'https://www.orangepillperu.com',
      'https://orangepillperu.com',
      'wss://www.orangepillperu.com',
      'wss://orangepillperu.com'
    ];
    
    // Add development origins when not in production
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push(
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://0.0.0.0:3000',
        'ws://localhost:3000',
        'ws://127.0.0.1:3000',
        'ws://0.0.0.0:3000'
      );
    }
    
    // Check if origin is allowed
    const originWithoutProtocol = origin.replace(/^(https?:|wss?:)\/\//, '');
    const isAllowed = allowedOrigins.some(allowed => {
      const allowedWithoutProtocol = allowed.replace(/^(https?:|wss?:)\/\//, '');
      return allowedWithoutProtocol === originWithoutProtocol;
    }) || (process.env.NODE_ENV !== 'production' && (
      origin.startsWith('http://localhost:') || 
      origin.startsWith('ws://localhost:') ||
      origin.startsWith('http://127.0.0.1:') || 
      origin.startsWith('ws://127.0.0.1:') ||
      origin.startsWith('http://0.0.0.0:') ||
      origin.startsWith('ws://0.0.0.0:')
    ));
    
    if (isAllowed) {
      log('CORS request allowed for origin:', { origin });
      callback(null, true);
    } else {
      log('CORS request blocked:', { 
        origin,
        allowedOrigins,
        environment: process.env.NODE_ENV
      });
      callback(new Error(`CORS not allowed for origin: ${origin}`), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials',
    'Sec-WebSocket-Protocol',
    'Sec-WebSocket-Version',
    'Sec-WebSocket-Key'
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials'
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware first, before any other middleware
app.use(cors(corsOptions));

// Initialize express middleware
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add CORS test endpoint after middleware initialization
app.get('/api/cors-test', (req, res) => {
  const origin = req.headers.origin || 'No origin';
  log('CORS test endpoint accessed', {
    origin,
    method: req.method,
    path: req.path,
    headers: {
      ...req.headers,
      // Exclude potentially sensitive headers
      cookie: undefined,
      authorization: undefined
    }
  });
  
  // Set CORS headers explicitly for this endpoint
  res.header('Access-Control-Allow-Origin', origin === 'No origin' ? '*' : origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  res.json({
    status: 'success',
    message: 'CORS test successful',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    origin: origin,
    cors_enabled: true
  });
});
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

// Server configuration
const PORT = Number(process.env.PORT || 5000);
const HOST = '0.0.0.0';
let server: ReturnType<typeof createServer> | null = null;

// Ensure process.env.NODE_ENV is set
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Cleanup function
async function cleanup(): Promise<void> {
  if (server && server.listening) {
    return new Promise((resolve) => {
      server!.close(() => {
        server = null;
        resolve();
      });
    });
  }
}

// Register error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const status = err instanceof Error ? 500 : 400;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message || "Internal Server Error";

  console.error('Error:', err);

  res.status(status).json({ 
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Initialize database and start server
async function init() {
  try {
    log('Starting server initialization...');
    
    // Initialize database
    const { db } = await import('../db/index.js');
    try {
      log('Attempting to connect to database...');
      console.log('Database URL format:', process.env.DATABASE_URL ? 'Present' : 'Missing');
      const result = await db.execute(sql`SELECT 1`);
      console.log('Database test query result:', result);
      log('Database connection established successfully');
    } catch (dbError) {
      console.error('Detailed database connection error:', dbError);
      log('Database connection error:', {
        error: dbError instanceof Error ? dbError.message : 'Unknown database error',
        stack: dbError instanceof Error ? dbError.stack : undefined
      });
      throw dbError;
    }

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

    // Create new server instance
    server = createServer(app);
    log('Created new server instance');

    // Setup environment-specific configuration
    if (process.env.NODE_ENV !== 'production') {
      log('Setting up development server...');
      try {
        await setupVite(app, server);
        log('Vite development server setup completed');
      } catch (viteError) {
        log('Vite setup failed:', {
          error: viteError instanceof Error ? viteError.message : 'Unknown Vite error',
          stack: viteError instanceof Error ? viteError.stack : undefined
        });
        throw viteError;
      }
    } else {
      log('Setting up production server...');
      try {
        const { setupProduction } = await import('./production.js');
        await setupProduction(app);
        log('Production server setup completed');
      } catch (prodError) {
        log('Production setup failed:', {
          error: prodError instanceof Error ? prodError.message : 'Unknown production error',
          stack: prodError instanceof Error ? prodError.stack : undefined
        });
        throw prodError;
      }
    }

    // Start server with enhanced error handling
    await new Promise<void>((resolve, reject) => {
      if (!server) {
        reject(new Error('Server instance is null'));
        return;
      }

      const onError = (error: NodeJS.ErrnoException) => {
        console.error('Detailed server error:', error);
        log('Server encountered an error:', {
          code: error.code,
          message: error.message,
          stack: error.stack
        });

        if (error.code === 'EADDRINUSE') {
          log('Port already in use:', { port: PORT, host: HOST });
          cleanup().then(() => {
            setTimeout(() => {
              server?.listen(PORT, HOST);
            }, 1000);
          }).catch(reject);
        } else {
          log('Server startup error:', { 
            code: error.code,
            message: error.message,
            stack: error.stack
          });
          reject(error);
        }
      };

      const onListening = () => {
        const addr = server!.address();
        const actualPort = typeof addr === 'string' ? addr : addr?.port;
        console.log(`Server is now listening on ${HOST}:${actualPort}`);
        log(`Server listening on port ${actualPort}`, {
          host: HOST,
          port: actualPort,
          env: process.env.NODE_ENV
        });
        server!.removeListener('error', onError);
        resolve();
      };

      process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        cleanup().then(() => process.exit(1));
      });

      server.once('error', onError);
      server.once('listening', onListening);
      
      log('Attempting to bind server...', { host: HOST, port: PORT });
      console.log(`Starting server on ${HOST}:${PORT}`);
      server.listen(PORT, HOST);
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

// Start server with error handling
init().catch((error) => {
  log(`Fatal error during initialization: ${error instanceof Error ? error.message : 'Unknown error'}`);
  if (error instanceof Error && error.stack) {
    log('Error stack trace:', { stack: error.stack });
  }
  process.exit(1);
});