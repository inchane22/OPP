import express, { type Request, type Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import { createServer } from "http";
import compression from 'compression';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { isDatabaseError } from './db/types';

// ES Module path resolution utility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function log(message: string, data: Record<string, any> = {}) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  console.log(`[${formattedTime}] ${message}`, data);
}

const app = express();

// Configure CORS with more permissive settings for development
const corsOptions = {
  origin: function(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    callback(null, true); // Allow all origins in development
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware with more details
app.use((req, res, next) => {
  const start = Date.now();
  log(`Incoming ${req.method} request to ${req.path}`, {
    query: req.query,
    headers: req.headers
  });

  res.on("finish", () => {
    const duration = Date.now() - start;
    log(`${req.method} ${req.path} completed`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });
  next();
});

// Error handling middleware with enhanced logging
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  log('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof SyntaxError) {
    return res.status(400).json({
      error: 'Invalid request syntax',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Bad request'
    });
  }

  if (isDatabaseError(err)) {
    return res.status(500).json({
      error: 'Database error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Database operation failed'
    });
  }

  return res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Server configuration
const PORT = Number(process.env.PORT || 5000);
const HOST = '0.0.0.0';

// Initialize and start server with enhanced error handling
async function init() {
  try {
    log('Starting server initialization...', {
      env: process.env.NODE_ENV,
      port: PORT,
      host: HOST
    });

    // Initialize database with retry mechanism
    const { testConnection } = await import('./db/index.js');
    let connected = false;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        log(`Attempting database connection (attempt ${attempt}/${maxRetries})...`);
        connected = await testConnection();
        if (connected) {
          log('Database connection established successfully');
          break;
        }
      } catch (dbError) {
        log('Database connection attempt failed:', {
          attempt,
          error: dbError instanceof Error ? dbError.message : 'Unknown error'
        });
        if (attempt === maxRetries) {
          throw new Error(`Database connection failed after ${maxRetries} attempts`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      }
    }

    if (!connected) {
      throw new Error('Could not establish database connection');
    }

    // Register API routes
    try {
      await registerRoutes(app);
      log('API routes registered successfully');
    } catch (routesError) {
      log('Failed to register routes:', {
        error: routesError instanceof Error ? routesError.message : 'Unknown routes error'
      });
      throw routesError;
    }

    // Create server instance
    const server = createServer(app);

    // Setup environment-specific configuration
    if (process.env.NODE_ENV === 'production') {
      log('Setting up production server...');
      const { setupProduction } = await import('./production.js');
      await setupProduction(app);
      log('Production server setup completed');
    } else {
      log('Setting up development server...');
      await setupVite(app, server);
      log('Vite development server setup completed');
    }

    return new Promise<void>((resolve, reject) => {
      server.listen(PORT, HOST, () => {
        log(`Server listening on port ${PORT}`, {
          host: HOST,
          port: PORT,
          env: process.env.NODE_ENV
        });
        resolve();
      });

      server.on('error', (error: NodeJS.ErrnoException) => {
        log('Server error:', {
          code: error.code,
          message: error.message,
          stack: error.stack
        });
        reject(error);
      });
    });

  } catch (error) {
    log('Fatal server startup error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Start server with proper error handling
init().catch((error) => {
  log(`Fatal error during initialization: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exit(1);
});

export default app;