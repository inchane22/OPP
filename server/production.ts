import express from "express";
import path from "path";
import compression from "compression";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function setupProduction(app: express.Express) {
  // Enable compression
  app.use(compression());

  // Serve static files from the React app
  const publicPath = path.join(__dirname, '../dist/public');
  app.use(express.static(publicPath));

  // The "catchall" handler: for any request that doesn't
  // match one above, send back React's index.html file.
  app.get("*", (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}
