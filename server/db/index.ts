import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';

// Check required environment variables
if (!process.env.DATABASE_URL) {
  console.error('Fatal: DATABASE_URL environment variable is not set');
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create the SQL connection with retries and proper error handling
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
      console.log('Attempting to create database connection...');
      const sql_connection = neon(databaseUrl);
      console.log('Database connection created successfully');

      // Test the connection immediately
      const db = drizzle(sql_connection);
      await db.execute(sql`SELECT 1`);

      return sql_connection;
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

// Create the database instance with enhanced logging
export const db = drizzle(sql_connection, {
  logger: true
});

// Test database connection function with improved error handling and logging
export async function testConnection(): Promise<boolean> {
  try {
    console.log('Testing database connection...');
    const start = Date.now();

    // Test query with proper type handling
    const result = await db.execute(sql`
      SELECT 
        current_timestamp as server_time,
        current_database() as database_name,
        version() as postgres_version
    `);

    const duration = Date.now() - start;

    console.log('Database connection successful', {
      responseTime: `${duration}ms`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      details: result.rows[0]
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