import express, { type Request, type Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import { createServer } from "http";
import compression from 'compression';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { isDatabaseError } from './db/types';
import { setupAuth } from "./auth"; // Add setupAuth import

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
const PORT = Number(process.env.PORT || (process.env.NODE_ENV === 'development' ? 3001 : 5000));
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

// Initialize and start server
async function init() {
  try {
    log('Starting server initialization...', {
      env: process.env.NODE_ENV,
      port: PORT,
      host: HOST
    });

    // Basic middleware setup
    app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://orange-pill-peru.com'] 
        : ['http://localhost:3000', 'http://0.0.0.0:3000'],
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

    // Initialize database
    const { testConnection } = await import('./db/index.js');
    try {
      log('Testing database connection...');
      const connected = await testConnection();
      if (!connected) {
        throw new Error('Database connection test failed');
      }
      log('Database connection established successfully');
    } catch (dbError) {
      log('Database connection error:', {
        error: dbError instanceof Error ? dbError.message : 'Unknown error'
      });
      throw dbError;
    }

    // Create server instance
    server = createServer(app);

    // Setup authentication first
    log('Setting up authentication...');
    setupAuth(app);
    log('Authentication setup completed');

    // Register API routes
    try {
      log('Registering API routes...');
      await registerRoutes(app);
      log('Routes registered successfully');
    } catch (routesError) {
      log('Failed to register routes:', {
        error: routesError instanceof Error ? routesError.message : 'Unknown error'
      });
      throw routesError;
    }

    // Setup environment-specific configuration
    if (process.env.NODE_ENV === 'development') {
      log('Setting up development server...');
      try {
        // Setup static file serving for development
        const publicPath = join(process.cwd(), 'public');
        app.use(express.static(publicPath, {
          index: false // Let Vite handle index.html
        }));

        // Setup Vite for development
        await setupVite(app, server);
        log('Development server setup completed');
      } catch (error) {
        log('Development server setup failed:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    } else {
      log('Setting up production server...');
      const { setupProduction } = await import('./production.js');
      await setupProduction(app);
      log('Production server setup completed');
    }

    // Handle client-side routing - this must come after all other routes
    app.get('*', (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith('/api')) {
        return next();
      }

      if (process.env.NODE_ENV === 'development') {
        // In development, let Vite handle the rendering
        next();
      } else {
        // In production, serve the built index.html
        res.sendFile(join(process.cwd(), 'dist', 'public', 'index.html'));
      }
    });

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

    // Start listening with port availability check
    return new Promise<void>((resolve, reject) => {
      server?.listen(PORT, HOST, () => {
        log(`Server listening on port ${PORT}`, {
          host: HOST,
          port: PORT,
          env: process.env.NODE_ENV
        });
        resolve();
      });

      server?.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          log(`Port ${PORT} is already in use. Shutting down...`);
          shutdown().then(() => {
            reject(new Error(`Port ${PORT} is already in use. Please try a different port.`));
          });
        } else {
          log('Server error:', {
            code: error.code,
            message: error.message,
            stack: error.stack
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
    process.exit(1);
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

init().catch(async (error) => {
  log(`Fatal error during initialization: ${error instanceof Error ? error.message : 'Unknown error'}`);
  await shutdown();
  process.exit(1);
});

export default app;