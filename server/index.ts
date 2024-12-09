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

// Server configuration
const PORT = Number(process.env.PORT || 5000);
const HOST = '0.0.0.0';
let server: ReturnType<typeof createServer> | null = null;

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
    // Initialize database
    const { db } = await import('../db/index.js');
    await db.execute(sql`SELECT 1`);
    log('Database connection established');

    // Register API routes
    await registerRoutes(app);

    // Ensure cleanup of any existing server
    await cleanup();

    // Create new server instance
    server = createServer(app);

    // Setup environment-specific configuration
    if (process.env.NODE_ENV !== 'production') {
      log('Setting up development server...');
      await setupVite(app, server);
    } else {
      log('Setting up production server...');
      const { setupProduction } = await import('./production.js');
      await setupProduction(app);
    }

    // Start server
    await new Promise<void>((resolve, reject) => {
      const onError = (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${PORT} is already in use`));
        } else {
          reject(error);
        }
      };

      server!.once('error', onError);
      
      server!.listen(PORT, HOST, () => {
        server!.removeListener('error', onError);
        log(`Server running at http://${HOST}:${PORT}`);
        resolve();
      });
    });

  } catch (error) {
    log('Server startup error:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
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