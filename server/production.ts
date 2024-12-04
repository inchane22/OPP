import express from "express";
import path from "path";
import compression from "compression";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { setupAuth } from "./auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function setupProduction(app: express.Express) {
  // Enable compression for all requests
  app.use(compression());

  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // Set up authentication
  setupAuth(app);

  // Serve static files from the React app with proper caching
  const publicPath = path.join(__dirname, '../dist/public');
  
  // Verify the public directory exists
  try {
    const fs = require('fs');
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
  app.use('/api', (req, res, next) => {
    if (!req.path.startsWith('/api')) {
      return next();
    }
    // Let the API routes handle their own responses
    next();
  });

  // The "catchall" handler: for any request that doesn't
  // match one above, send back React's index.html file.
  app.get("*", (_req, res) => {
    // Don't cache the index.html file
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Use an absolute path to ensure correct file serving
    const indexPath = path.join(publicPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error sending index.html:', err);
        res.status(500).send('Error loading application');
      }
    });
  });
}
