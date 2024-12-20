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
          error: viteError instanceof Error ? viteError.message : 'Unknown Vite error'
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
          error: prodError instanceof Error ? prodError.message : 'Unknown production error'
        });
        throw prodError;
      }
    }

    // Start server
    return new Promise<void>((resolve, reject) => {
      if (!server) {
        reject(new Error('Server instance is null'));
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

// Graceful shutdown handlers
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

// Start server
init().catch((error) => {
  log(`Fatal error during initialization: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exit(1);
});