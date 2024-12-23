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

// Create the SQL connection
const sql_connection = neon(process.env.DATABASE_URL);

// Create the database instance
const db = drizzle(sql_connection);

// Test database connection function
async function testConnection(): Promise<boolean> {
  try {
    console.log('Testing database connection...');
    const start = Date.now();

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