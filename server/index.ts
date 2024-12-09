import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite } from "./vite.js";
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


// Async IIFE for better error handling
(async () => {
  try {
    const server = createServer(app);

    // Register API routes
    await registerRoutes(app);

    // Error handling middleware
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

    const PORT = Number(process.env.PORT || 5000);
    const HOST = '0.0.0.0';

    // Setup environment-specific configuration
    if (process.env.NODE_ENV !== 'production') {
      log('Setting up development server with Vite...', {
        nodeEnv: process.env.NODE_ENV,
        port: PORT,
        host: HOST
      });
      
      // Only close server if it's already listening
      if (server.listening) {
        await new Promise((resolve) => {
          server.close(() => {
            log('Cleaned up existing server instance');
            resolve(undefined);
          });
        });
      }

      try {
        await setupVite(app, server);
        log('Vite middleware setup completed');
      } catch (error) {
        log('Failed to setup Vite middleware', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        process.exit(1);
      }
    } else {
      log('Setting up production server...', {});
      const { setupProduction } = await import('./production.js');
      await setupProduction(app);
    }
    
    log('Attempting to start server...', { 
      port: PORT,
      host: HOST,
      environment: process.env.NODE_ENV,
      nodeVersion: process.version
    });

    // Clean up function for server shutdown with proper error handling
    const cleanup = async (server: any): Promise<void> => {
      return new Promise((resolve) => {
        let hasResolved = false;
        
        // Attempt graceful shutdown
        server.close(() => {
          if (!hasResolved) {
            hasResolved = true;
            log('Server closed successfully');
            resolve();
          }
        });

        // Force close after timeout
        setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            log('Force closing server after timeout');
            resolve();
          }
        }, 5000);

        // Handle any remaining connections
        server.unref();
      });
    };

    // Enhanced server startup with better port retry logic
    const startServer = async (port: number, retryCount = 0): Promise<void> => {
      const maxRetries = process.env.NODE_ENV === 'development' ? 3 : 0;
      log('Starting server with configuration:', {
        port,
        retryCount,
        maxRetries,
        environment: process.env.NODE_ENV
      });
      
      return new Promise((resolve, reject) => {
        const handleError = async (error: NodeJS.ErrnoException) => {
          log(`Server startup error: ${error.message}`, {
            code: error.code,
            port: port,
            retryCount: retryCount,
            maxRetries: maxRetries
          });

          if (error.code === 'EADDRINUSE') {
            if (retryCount >= maxRetries) {
              log('Maximum retry attempts reached. Exiting.');
              process.exit(1);
            }
            
            const nextPort = port + 1;
            log(`Port ${port} is in use, attempting port ${nextPort} (attempt ${retryCount + 1}/${maxRetries})`);
            
            try {
              await cleanup(server);
              resolve(startServer(nextPort, retryCount + 1));
            } catch (cleanupError) {
              reject(cleanupError);
            }
          } else {
            log(`Failed to start server: ${error.message}`);
            reject(error);
          }
        };

        // Ensure server is clean before starting
        server.removeAllListeners('error');
        server.removeAllListeners('listening');
        
        // Set up error handling
        server.once('error', handleError);
        
        try {
          server.listen(port, HOST, () => {
            log(`Server starting in ${process.env.NODE_ENV || 'development'} mode...`);
            log(`Server running on port ${port}`);
            log(`Server address: http://${HOST}:${port}`);
            resolve();
          });
        } catch (error) {
          handleError(error as NodeJS.ErrnoException);
        }
      });
    };

    // Graceful shutdown handler
    const handleShutdown = async () => {
      log('Received shutdown signal');
      await cleanup(server);
      process.exit(0);
    };

    // Register shutdown handlers once
    process.once('SIGTERM', handleShutdown);
    process.once('SIGINT', handleShutdown);

    log('Starting server...', {});
    startServer(PORT).catch(error => {
      log(`Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Detailed error:', error);
      process.exit(1);
    });

  } catch (error) {
    log(`Failed to start server: ${error}`);
    console.error(error);
    process.exit(1);
  }
})();