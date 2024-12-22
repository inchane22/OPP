import express, { type Request, type Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import { createServer } from "http";
import compression from 'compression';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { isDatabaseError } from './db/types';

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
    const server = createServer(app);

    // Register API routes first
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

    // Start listening
    server.listen(PORT, HOST, () => {
      log(`Server listening on port ${PORT}`, {
        host: HOST,
        port: PORT,
        env: process.env.NODE_ENV
      });
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      log('Server error:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      throw error;
    });

  } catch (error) {
    log('Fatal server error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

init().catch((error) => {
  log(`Fatal error during initialization: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exit(1);
});

export default app;