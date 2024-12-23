import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';

// Check required environment variables
if (!process.env.DATABASE_URL) {
  console.error('Fatal: DATABASE_URL environment variable is not set');
  throw new Error('DATABASE_URL environment variable is not set');
}

// Initialize neon config
neonConfig.fetchConnectionCache = true;

// Create the SQL connection with retries
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function createConnection() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  while (retryCount < MAX_RETRIES) {
    try {
      return neon(databaseUrl);
    } catch (error) {
      retryCount++;
      console.error(`Database connection attempt ${retryCount} failed:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      if (retryCount === MAX_RETRIES) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCount));
    }
  }
  throw new Error('Failed to create database connection after retries');
}

// Create the SQL connection
const sql_connection = await createConnection();

// Create the database instance
const db = drizzle(sql_connection);

// Test database connection function with improved error handling
async function testConnection(): Promise<boolean> {
  try {
    console.log('Testing database connection...');
    const start = Date.now();

    // Execute query with proper type handling using drizzle-orm's sql template literal
    const result = await db.execute(sql`SELECT NOW() as current_time`);
    const duration = Date.now() - start;

    console.log('Database connection successful', {
      responseTime: `${duration}ms`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      current_time: result[0]?.current_time
    });

    return true;
  } catch (error) {
    console.error('Database connection test failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
    throw error;
  }
}

export { db, testConnection };