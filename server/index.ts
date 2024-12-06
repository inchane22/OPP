import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite } from "./vite";
import { createServer } from "http";
import compression from 'compression';
import cors from 'cors';

function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [express] ${message}`);
}

const app = express();

// Configure CORS
const corsOptions = {
  origin: function(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? ['https://orange-pill-peru.com', 'http://localhost:3000', 'http://0.0.0.0:3000']
      : ['http://localhost:5000', 'http://localhost:3000', 'http://0.0.0.0:5000', 'http://0.0.0.0:3000'];
    
    // Allow requests with no origin (like mobile apps or curl requests)
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
app.use(express.urlencoded({ extended: false }));

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

(async () => {
  registerRoutes(app);
  const server = createServer(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error'  // Don't expose error details in production
      : err.message || "Internal Server Error";

    // Log error details in production
    if (process.env.NODE_ENV === 'production') {
      console.error('Error:', err);
    }

    res.status(status).json({ 
      message,
      status,
      timestamp: new Date().toISOString()
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Import and setup production configuration
    const { setupProduction } = await import('./production.js');
    setupProduction(app);
  }

  // Use consistent port configuration
  const PORT = Number(process.env.PORT || 5000);
  const HOST = '0.0.0.0';

  // Enhanced error handling for server startup
  const handleServerError = (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      log(`Error: Port ${PORT} is already in use`);
      if (process.env.NODE_ENV !== 'production') {
        try {
          const newPort = PORT + 1;
          log(`Attempting to use port ${newPort}`);
          server.listen(newPort, HOST);
          return;
        } catch (retryError) {
          const typedError = retryError as Error;
          log(`Failed to bind to alternate port: ${typedError.message}`);
        }
      }
      process.exit(1);
    }
    
    // Log detailed errors in development, sanitized in production
    if (process.env.NODE_ENV === 'production') {
      log(`Critical server error occurred. Check logs for details.`);
      console.error(error);
      process.exit(1);
    } else {
      log(`Server error: ${error.message}`);
      console.error(error);
    }
  };

  // Graceful shutdown handler
  const handleShutdown = () => {
    log('Received shutdown signal. Closing server...');
    server.close(() => {
      log('Server closed successfully');
      process.exit(0);
    });

    // Force close if graceful shutdown takes too long
    setTimeout(() => {
      log('Force closing server after timeout');
      process.exit(1);
    }, 10000);
  };

  // Register error handlers
  server.on('error', handleServerError);
  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
  
  // Start the server with enhanced error handling
  try {
    const startServer = () => {
      return new Promise<void>((resolve, reject) => {
        const tryPort = (port: number) => {
          const serverInstance = server.listen(port, "0.0.0.0", () => {
            const address = serverInstance.address();
            const actualPort = typeof address === 'object' && address ? address.port : port;
            log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${actualPort}`);
            log(`Server address: http://0.0.0.0:${actualPort}`);
            resolve();
          });

          serverInstance.on('error', (err: NodeJS.ErrnoException) => {
            serverInstance.close();
            if (err.code === 'EADDRINUSE') {
              log(`Port ${port} is in use, attempting to use port ${port + 1}`);
              tryPort(port + 1);
            } else {
              reject(err);
            }
          });

          // Handle server shutdown
          const cleanup = () => {
            serverInstance.close(() => {
              log('Server closed');
              process.exit(0);
            });
          };

          process.on('SIGTERM', cleanup);
          process.on('SIGINT', cleanup);
        };

        tryPort(PORT);
      });
    };

    await startServer();
  } catch (error) {
    log(`Failed to start server: ${error}`);
    process.exit(1);
  }
})();
