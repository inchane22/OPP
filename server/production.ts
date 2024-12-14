import express, { Express, Response, Request, NextFunction } from 'express';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import * as fs from 'fs';
import { logger } from "./utils/logger.js";
import { setupAuth } from "./auth.js";
import { serverConfig, PORT, HOST, isProduction } from './config.js';

// ES Module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function setupProduction(app: Express): Promise<void> {
    // First error fixed: 'app' is now passed as a parameter and properly typed with 'Express'

    // Initialize database connection and other setup...
    try {
        logger('Starting database initialization', {
            environment: process.env.NODE_ENV,
            timestamp: new Date().toISOString()
        });

        const { db } = await import('../db/index.js');

        logger('Database initialized successfully', {
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger('Failed to initialize database', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined,
            timestamp: new Date().toISOString()
        });
        process.exit(1);
    }

    // Security middleware
    app.use(helmet({
        // Your existing helmet configuration...
    }));

    // CORS and compression middleware
    app.use(cors());
    app.use(compression());

    // Static file serving configuration
    const projectRoot = process.cwd();
    const clientDist = path.join(projectRoot, 'dist');
    const publicPath = path.join(clientDist, 'client');

    logger('Static file configuration:', {
        projectRoot,
        clientDist,
        publicPath,
        exists: fs.existsSync(publicPath),
        contents: fs.existsSync(publicPath) ? fs.readdirSync(publicPath) : []
    });

    app.use(express.static(publicPath, {
        maxAge: '1d',
        index: false,
        setHeaders: (res, filePath) => {
            const ext = path.extname(filePath).toLowerCase();
            const contentTypes: Record<string, string> = {
                '.js': 'application/javascript',
                '.mjs': 'application/javascript',
                '.css': 'text/css',
                '.html': 'text/html',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.svg': 'image/svg+xml'
            };

            if (contentTypes[ext]) {
                res.setHeader('Content-Type', `${contentTypes[ext]}; charset=utf-8`);
            }

            if (filePath.includes('index.html')) {
                res.setHeader('Cache-Control', 'no-cache');
            } else if (filePath.match(/\.(js|css|jpg|png|svg)$/)) {
                res.setHeader('Cache-Control', 'public, max-age=31536000');
            }
        }
    }));

    // Add the catch-all route after your API routes
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
        const indexPath = path.join(publicPath, 'index.html');

        if (!fs.existsSync(indexPath)) {
            logger('Index file missing:', {
                path: indexPath,
                error: 'File not found'
            });
            return next(new Error('Index file not found'));
        }

        res.sendFile(indexPath, (err) => {
            if (err) {
                logger('Error serving index file:', {
                    error: err.message,
                    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
                });
                next(err);
            }
        });
    });
}