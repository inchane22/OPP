import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import compression from 'compression';
import { setupAuth } from './auth';
import { registerRoutes } from './routes';
import { log } from './utils/logger';
import { sql } from 'drizzle-orm';
import { env, PORT, HOST, isProduction, serverConfig } from './config';
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Basic middleware setup
const corsOptions = {
  origin: isProduction 
    ? process.env.FRONTEND_URL || 'https://your-production-domain.com'
    : ['http://localhost:5173', 'http://localhost:5174', /\.replit\.dev$/],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic health check endpoint (moved to before other routes)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
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

// Auth setup
setupAuth(app);


// Use let for server so cleanup can reassign
let server = createServer(app);

async function init() {
  try {
    log('Starting server initialization...', {
      env: process.env.NODE_ENV,
      port: PORT,
      host: HOST
    });

    // Connect to database
    const { db } = await import('../db/index');
    await db.execute(sql`SELECT 1`);
    log('Database connected successfully');

    // Register routes once
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

    // In development mode, we only want API routes
    if (process.env.NODE_ENV === 'development') {
      // Ensure 404 is returned for non-API routes in development
      app.use((req, res) => {
        if (!req.path.startsWith('/api/')) {
          return res.status(404).json({ 
            error: 'Not Found',
            message: 'Route not found',
            path: req.path,
            environment: 'development'
          });
        }
      });
      log('Development server setup completed - API only mode');
    }

    await new Promise<void>((resolve, reject) => {
      server.once('error', (error: NodeJS.ErrnoException) => {
        log('Server error:', error);
        reject(error);
      });

      server.once('listening', () => {
        const addr = server!.address();
        if (!addr) {
          reject(new Error('Failed to get server address'));
          return;
        }

        const actualPort = typeof addr === 'string' ? addr : addr.port;
        console.log(`Server is now listening on ${HOST}:${actualPort}`);
        resolve();
      });

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

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

async function cleanup(): Promise<void> {
  if (server && server.listening) {
    return new Promise<void>((resolve) => {
      server!.close(() => {
        server = null!;
        resolve();
      });
    });
  }
  return Promise.resolve();
}

init().catch((error: unknown) => {
  log('Fatal error during initialization:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    timestamp: new Date().toISOString()
  });
  process.exit(1);
});