import express, { type Request, type Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
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

// Basic CORS setup
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  log('Error:', { error: err.message });

  if (res.headersSent) {
    return next(err);
  }

  if (isDatabaseError(err)) {
    return res.status(500).json({
      error: 'Database error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Database operation failed'
    });
  }

  return res.status(500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    path: req.path
  });
});

const PORT = Number(process.env.PORT || 5000);
const HOST = '0.0.0.0';

// Simplified initialization
async function init() {
  try {
    log('Starting server...');

    // Test database connection
    const { testConnection } = await import('./db/index.js');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }
    log('Database connected');

    // Register routes
    await registerRoutes(app);
    log('Routes registered');

    // Start listening
    app.listen(PORT, HOST, () => {
      log(`Server running on http://${HOST}:${PORT}`);
    });

  } catch (error) {
    log('Fatal error:', { error: error instanceof Error ? error.message : 'Unknown error' });
    process.exit(1);
  }
}

init();

export default app;