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
import { serverConfig, PORT, HOST, env, isProduction } from './config.js';

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

// Configure CORS
const corsOptions = {
  origin: function(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? ['https://orange-pill-peru.com', 'http://localhost:3000', 'http://0.0.0.0:3000']
      : ['http://localhost:5000', 'http://localhost:3000', 'http://0.0.0.0:5000', 'http://0.0.0.0:3000'];
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in development
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
let server: ReturnType<typeof createServer> | null = null;

// Set port and host in Express app
app.set('port', PORT);
app.set('host', HOST);

// Log server configuration
log('Server initialization', {
  port: PORT,
  host: HOST,
  environment: env,
  production: isProduction,
  config: serverConfig.toString()
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

// Enhanced error handling for port binding
process.on('uncaughtException', (error: Error) => {
  if (error.message.includes('EADDRINUSE')) {
    log(`Port ${PORT} is already in use. Please ensure no other services are using this port.`);
    process.exit(1);
  }
  throw error;
});

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
    log('Starting server initialization...');
    
    // Initialize database
    const { db } = await import('../db/index.js');
    try {
      log('Attempting to connect to database...');
      const result = await db.execute(sql`SELECT 1`);
      log('Database connection established successfully');
    } catch (error) {
      console.error('Detailed database connection error:', error);
      log('Database connection error', {
        error: error instanceof Error ? error.message : 'Unknown database error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
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
        console.error('Server instance is null');
        reject(new Error('Server instance is null'));
        return;
      }

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

// Start server with error handling
init().catch((error: unknown) => {
  log('Fatal error during initialization:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString()
  });
  process.exit(1);
});
