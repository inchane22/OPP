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
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// Error handling middleware with proper typing
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  log('Error occurred:', { error: err.message, stack: err.stack });

  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof SyntaxError) {
    return res.status(400).json({
      error: 'Invalid request syntax',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Bad request'
    });
  }

  // Handle database errors by checking properties instead of using type guard
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

// Initialize and start server
async function init() {
  try {
    log('Starting server initialization...', {
      env: process.env.NODE_ENV,
      port: PORT,
      host: HOST
    });

    // Initialize database
    const { testConnection } = await import('./db/index.js');

    try {
      log('Attempting to connect to database...');
      const connected = await testConnection();
      if (!connected) {
        throw new Error('Database connection test failed');
      }
      log('Database connection established successfully');
    } catch (dbError) {
      log('Database connection error:', {
        error: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
      throw new Error(`Database connection failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }

    // Register API routes
    try {
      await registerRoutes(app);
      log('API routes registered successfully');
    } catch (routesError) {
      log('Failed to register routes:', {
        error: routesError instanceof Error ? routesError.message : 'Unknown routes error'
      });
      throw new Error(`Failed to register routes: ${routesError instanceof Error ? routesError.message : 'Unknown error'}`);
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
          env: process.env.NODE_ENV,
          mode: process.env.NODE_ENV === 'production' ? 'production' : 'development'
        });
        resolve();
      });

      server.on('error', (error: NodeJS.ErrnoException) => {
        log('Server error:', {
          code: error.code,
          message: error.message
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

// Start server
init().catch((error) => {
  log(`Fatal error during initialization: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exit(1);
});

export default app;