import { drizzle } from 'drizzle-orm/neon-http';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';

// Configure neon
const connectionString = process.env.DATABASE_URL!;

// Create SQL connection with proper configuration
const sql_connection: NeonQueryFunction = neon(connectionString);

// Initialize drizzle with proper configuration and type safety
export const db = drizzle(sql_connection, {
  logger: process.env.NODE_ENV === 'development'
});

// Test connection with proper error handling
export async function testConnection() {
  try {
    console.log('Testing database connection...');
    const result = await db.execute<{ current_time: Date }>(sql`SELECT NOW() as current_time`);
    console.log('Database connection verified', { 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      message: 'Database connection verified',
      current_time: result[0]?.current_time
    });
    return true;
  } catch (error) {
    console.error('Database connection test failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
    return false;
  }
}