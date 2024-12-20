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
import type { DatabaseError } from 'pg';
import { DatabaseConnectionError, DatabaseQueryError, isDatabaseError } from './db/types.js';

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
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  log('Error occurred:', { error: err.message, stack: err.stack });

  if (isDatabaseError(err)) {
    return res.status(503).json({
      error: 'Database error occurred',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  if (err instanceof DatabaseQueryError) {
    return res.status(400).json({
      error: 'Database query error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Invalid operation',
      ...(process.env.NODE_ENV === 'development' && { 
        code: err.code,
        query: err.query,
        stack: err.stack 
      })
    });
  }

  if (err instanceof SyntaxError) {
    return res.status(400).json({
      error: 'Invalid request syntax',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Bad request'
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
    log('Starting server initialization...');

    // Initialize database
    const { db } = await import('../db/index.js');

    try {
      log('Attempting to connect to database...');
      await db.execute(sql`SELECT 1`);
      log('Database connection established successfully');
    } catch (dbError) {
      log('Database connection error:', {
        error: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
      throw dbError;
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

    // Create server instance first
    const server = createServer(app);

    // Setup environment-specific configuration
    if (process.env.NODE_ENV !== 'production') {
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
          message: error.message
        });
        reject(error);
      });
    });

  } catch (error) {
    log('Fatal server startup error:', {
      error: error instanceof Error ? error.message : 'Unknown error'
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