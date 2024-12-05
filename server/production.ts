import express from "express";
import path from "path";
import compression from "compression";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { setupAuth } from "./auth";
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function setupProduction(app: express.Express) {
  // Enable compression for all requests
  app.use(compression());

  // Security headers and rate limiting
  app.use((_req, res, next) => {
    // Enhanced security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:");
    next();
  });

  // Basic rate limiting
  const requestCounts = new Map();
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const MAX_REQUESTS_PER_WINDOW = 100;

  app.use((req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const windowStart = now - WINDOW_MS;

    if (!requestCounts.has(ip)) {
      requestCounts.set(ip, []);
    }

    const requests = requestCounts.get(ip);
    const recentRequests = requests.filter((time: number) => time > windowStart);
    
    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        error: 'Too many requests, please try again later.',
        retryAfter: Math.ceil((windowStart + WINDOW_MS - now) / 1000)
      });
    }

    recentRequests.push(now);
    requestCounts.set(ip, recentRequests);

    return next();
  });

  // Set up authentication
  setupAuth(app);

  // Serve static files from the React app with proper caching
  const publicPath = path.join(__dirname, '../dist/public');
  
  // Verify the public directory exists
  try {
    if (!fs.existsSync(publicPath)) {
      console.error(`Public directory not found at ${publicPath}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error checking public directory:', error);
    process.exit(1);
  }

  // Serve static files with optimized caching
  app.use(express.static(publicPath, {
    maxAge: '1d', // Cache static assets for 1 day
    etag: true,
    lastModified: true,
    index: false, // Don't serve index.html for directory
    immutable: true // Mark assets as immutable for better caching
  }));

  // API routes should be handled before the catch-all
  app.use('/api', (req, _res, next) => {
    if (!req.path.startsWith('/api')) {
      return next();
    }
    // Let the API routes handle their own responses
    next();
  });

  // The "catchall" handler: for any request that doesn't
  // match one above, send back React's index.html file.
  // Error handling middleware
  app.use((err: Error | NodeJS.ErrnoException, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(new Date().toISOString(), 'Error:', {
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
      path: req.path,
      method: req.method,
    });

    return res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
    });
  });

  // Catch-all route handler
  app.get("*", (req, res) => {
    // Don't cache the index.html file
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Use an absolute path to ensure correct file serving
    const indexPath = path.join(publicPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error(new Date().toISOString(), 'Error sending index.html:', {
          error: err.message,
          path: req.path,
          ip: req.ip
        });
        res.status(500).json({
          error: 'Error loading application',
          message: process.env.NODE_ENV === 'production' ? 'Failed to load application' : err.message
        });
      }
    });
  });
}
