import express, { type Request, type Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import { createServer } from "http";
import compression from 'compression';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { isDatabaseError } from './db/types';
import { setupAuth } from "./auth";
import { testConnection } from "./db";

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

// Server configuration with correct port for development
const PORT = Number(process.env.PORT || 3001);
const HOST = '0.0.0.0';

// Create Express app instance at module scope
const app = express();
let server: ReturnType<typeof createServer> | null = null;

// Graceful shutdown handler
async function shutdown() {
  if (server) {
    return new Promise<void>((resolve, reject) => {
      server?.close((err) => {
        if (err) {
          log('Error during server shutdown:', { error: err.message });
          reject(err);
        } else {
          log('Server shut down gracefully');
          resolve();
        }
      });
    });
  }
}

// Initialize and start server with better error handling
async function init() {
  try {
    log('Starting server initialization...', {
      env: process.env.NODE_ENV,
      port: PORT,
      host: HOST
    });

    // Test database connection first
    try {
      log('Testing database connection...');
      await testConnection();
      log('Database connection verified');
    } catch (error) {
      log('Database connection failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }

    // Basic middleware setup before auth
    app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://orange-pill-peru.com'] 
        : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    app.use(compression());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Request logging middleware
    app.use((req, res, next) => {
      const start = Date.now();
      res.on("finish", () => {
        const duration = Date.now() - start;
        log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
      });
      next();
    });

    // Create server instance
    server = createServer(app);

    // Setup authentication with error handling
    try {
      log('Setting up authentication...');
      await setupAuth(app);
      log('Authentication setup completed');
    } catch (error) {
      log('Authentication setup failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }

    // Register API routes
    try {
      log('Registering API routes...');
      await registerRoutes(app);
      log('Routes registered successfully');
    } catch (error) {
      log('Route registration failed:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }

    // Setup environment-specific configuration
    if (process.env.NODE_ENV === 'development') {
      log('Setting up development server...');
      try {
        // Setup Vite for development
        await setupVite(app, server);
        log('Development server setup completed');
      } catch (error) {
        log('Development server setup failed:', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    }

    // Error handling middleware
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      log('Error occurred:', {
        error: err.message,
        path: req.path,
        method: req.method
      });

      res.status(500).json({
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
        status: 500
      });
    });

    // Start listening
    return new Promise<void>((resolve, reject) => {
      if (!server) {
        reject(new Error('Server was not properly initialized'));
        return;
      }

      server.listen(PORT, HOST, () => {
        log(`Server listening on port ${PORT}`, {
          host: HOST,
          port: PORT,
          env: process.env.NODE_ENV
        });
        resolve();
      });

      server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          log(`Port ${PORT} is already in use. Shutting down...`);
          shutdown().then(() => {
            reject(new Error(`Port ${PORT} is already in use. Please try a different port.`));
          });
        } else {
          log('Server error:', {
            code: error.code,
            message: error.message
          });
          reject(error);
        }
      });
    });

  } catch (error) {
    log('Fatal server error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    await shutdown();
    throw error;
  }
}

// Handle process termination
process.on('SIGTERM', async () => {
  log('SIGTERM received. Starting graceful shutdown...');
  await shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  log('SIGINT received. Starting graceful shutdown...');
  await shutdown();
  process.exit(0);
});

// Start the server with proper error handling
init().catch(async (error) => {
  log(`Fatal error during initialization: ${error instanceof Error ? error.message : 'Unknown error'}`);
  await shutdown();
  process.exit(1);
});

export default app;